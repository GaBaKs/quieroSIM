import { err, ok, type Result } from '../lib/result.ts';
import { renderQrWhatsapp } from '../whatsapp/wa-templates.ts';
import { normalizeE164, type SendWhatsappParams } from '../whatsapp/twilio.ts';
import { qrPngBase64 } from '../email/qr-png.ts';
import type { EmailLang } from '../email/templates.ts';

/**
 * Entrega del QR por WhatsApp (segundo canal, mirror del de email de la Etapa 6).
 * Cada eSIM tiene a lo sumo UNA fila qr_delivery por canal (unique en BD): la
 * fila channel='whatsapp' es el registro de la entrega y el árbitro de
 * idempotencia/límites, independiente de la fila de email.
 *
 * A diferencia del email (QR como adjunto inline), WhatsApp exige la media por
 * URL: el QR se sube a un bucket privado y se manda una URL FIRMADA de TTL corto
 * (lo resuelve `QrHosting`, inyectado). Tradeoff de seguridad asumido.
 *
 * Reglas de reintento idénticas al canal email:
 *  - resend_count cuenta intentos que LLEGARON al proveedor. Falta de credencial
 *    NO consume presupuesto (config faltante; el cron reintenta cuando esté).
 *  - Cron: pending/failed con resend_count < 5 y último intento > 5 min.
 *  - Reenvío manual: resend_count < 3 y cooldown 60s.
 *
 * ⚠️ Nunca loguear el body, el LPA ni la URL firmada de la media.
 */

export const WhatsappDeliveryErrorCodes = {
  NOT_FOUND: 'WA_DELIVERY_NOT_FOUND',
  NOT_READY: 'WA_DELIVERY_NOT_READY',
  NOT_CONFIGURED: 'WHATSAPP_NOT_CONFIGURED',
  RESEND_LIMIT: 'WA_DELIVERY_RESEND_LIMIT',
  SEND_FAILED: 'WA_DELIVERY_SEND_FAILED',
} as const;

// Mismas constantes que el canal email (no se importan para no acoplar módulos).
const CRON_MAX_ATTEMPTS = 5;
const CRON_BACKOFF_MS = 5 * 60 * 1000;
const MANUAL_MAX_RESENDS = 3;
const MANUAL_COOLDOWN_MS = 60 * 1000;

export { CRON_MAX_ATTEMPTS, CRON_BACKOFF_MS, MANUAL_MAX_RESENDS, MANUAL_COOLDOWN_MS };

export interface WhatsappEsimRecord {
  esimId: string;
  orderId: string;
  /** Teléfono de entrega (guest_phone de la orden, sin normalizar). */
  phone: string | null;
  lang: EmailLang;
  planName: string;
  lpa: string | null;
  orderStatus: string;
}

export interface WhatsappDeliveryRecord {
  id: string;
  esimId: string;
  status: 'pending' | 'sent' | 'failed';
  resendCount: number;
  lastAttemptAt: string | null;
}

export interface WhatsappDeliveryStore {
  getEsimForDelivery(esimId: string): Promise<WhatsappEsimRecord | null>;
  /** Devuelve la fila whatsapp de la eSIM, creándola pending si no existe. */
  getOrCreateDelivery(esimId: string): Promise<WhatsappDeliveryRecord>;
  recordAttempt(deliveryId: string, countAttempt: boolean): Promise<void>;
  markSent(deliveryId: string, providerMessageId: string, langUsed: EmailLang): Promise<void>;
  markFailed(deliveryId: string, error: string): Promise<void>;
  listRetryable(limit: number): Promise<string[]>; // esimIds
}

/** Hospedaje transitorio del PNG del QR para que el proveedor lo levante por URL. */
export interface QrHosting {
  /** Sube el PNG (base64) y devuelve una URL firmada de TTL corto. */
  hostQr(deliveryId: string, pngBase64: string): Promise<string>;
  /** Limpia objetos vencidos del bucket (higiene). Devuelve cuántos borró. */
  purgeOld(): Promise<number>;
}

export interface WhatsappTransport {
  sendWhatsapp(params: SendWhatsappParams): Promise<Result<{ sid: string }>>;
}

export interface WhatsappDeliveryDeps {
  store: WhatsappDeliveryStore;
  /** null = secrets de Twilio sin configurar (dev): queda failed y reintenta el cron. */
  whatsapp: WhatsappTransport | null;
  media: QrHosting;
  now?: () => Date;
}

export interface SendOptions {
  /** Reenvío pedido por el usuario: aplica límite resend_count<3 + cooldown 60s. */
  manual?: boolean;
}

export async function sendWhatsappDelivery(
  esimId: string,
  deps: WhatsappDeliveryDeps,
  options: SendOptions = {},
): Promise<Result<{ status: 'sent' | 'already_sent' }>> {
  const { store } = deps;
  const now = deps.now ?? (() => new Date());

  const esim = await store.getEsimForDelivery(esimId);
  if (!esim) return err(WhatsappDeliveryErrorCodes.NOT_FOUND, 'eSIM inexistente.');

  const phone = normalizeE164(esim.phone);
  if (!esim.lpa || !phone || esim.orderStatus !== 'fulfilled') {
    return err(
      WhatsappDeliveryErrorCodes.NOT_READY,
      'La eSIM no está lista para WhatsApp (sin QR/teléfono válido o la orden no está fulfilled).',
    );
  }

  const delivery = await store.getOrCreateDelivery(esimId);

  if (options.manual) {
    if (delivery.resendCount >= MANUAL_MAX_RESENDS) {
      return err(WhatsappDeliveryErrorCodes.RESEND_LIMIT, 'Alcanzaste el límite de reenvíos. Escribinos y te ayudamos.');
    }
    const last = delivery.lastAttemptAt ? new Date(delivery.lastAttemptAt).getTime() : 0;
    if (now().getTime() - last < MANUAL_COOLDOWN_MS) {
      return err(WhatsappDeliveryErrorCodes.RESEND_LIMIT, 'Acabamos de enviarte el WhatsApp. Esperá un minuto y probá de nuevo.');
    }
  } else if (delivery.status === 'sent') {
    // Reenvío automático sobre algo ya entregado: no-op idempotente.
    return ok({ status: 'already_sent' });
  }

  if (!deps.whatsapp) {
    await store.recordAttempt(delivery.id, false); // config faltante: no consume presupuesto
    await store.markFailed(delivery.id, WhatsappDeliveryErrorCodes.NOT_CONFIGURED);
    return err(WhatsappDeliveryErrorCodes.NOT_CONFIGURED, 'Secrets de Twilio sin configurar; la entrega queda pendiente de reintento.');
  }

  const { body } = renderQrWhatsapp({
    lang: esim.lang,
    planName: esim.planName,
    orderShortId: esim.orderId.slice(0, 8).toUpperCase(),
  });
  const qrPng = await qrPngBase64(esim.lpa);
  const mediaUrl = await deps.media.hostQr(delivery.id, qrPng);

  await store.recordAttempt(delivery.id, true);
  const sent = await deps.whatsapp.sendWhatsapp({ to: phone, body, mediaUrl });

  if (!sent.ok) {
    await store.markFailed(delivery.id, `${sent.error.code}: ${sent.error.message}`);
    return err(WhatsappDeliveryErrorCodes.SEND_FAILED, 'No pudimos enviar el WhatsApp; se reintentará automáticamente.');
  }

  await store.markSent(delivery.id, sent.data.sid, esim.lang);
  return ok({ status: 'sent' });
}

/** Cron: barre entregas whatsapp pending/failed elegibles y las reintenta. */
export async function processPendingWhatsapp(
  deps: WhatsappDeliveryDeps,
  limit = 20,
): Promise<Result<{ processed: number; sent: number; failed: number; purged: number }>> {
  const esimIds = await deps.store.listRetryable(limit);
  let sent = 0;
  let failed = 0;
  for (const esimId of esimIds) {
    const result = await sendWhatsappDelivery(esimId, deps);
    if (result.ok) sent += 1;
    else failed += 1;
  }
  // Higiene: borrar PNGs vencidos del bucket privado (la URL firmada ya expiró).
  const purged = await deps.media.purgeOld().catch(() => 0);
  return ok({ processed: esimIds.length, sent, failed, purged });
}
