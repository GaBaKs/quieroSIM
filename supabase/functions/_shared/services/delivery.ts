import { err, ok, type Result } from '../lib/result.ts';
import { renderQrEmail, QR_CONTENT_ID, type EmailLang } from '../email/templates.ts';
import { qrPngBase64 } from '../email/qr-png.ts';
import type { SendEmailParams } from '../email/resend.ts';

/**
 * Entrega del QR por canal (Plan Backend Etapa 6). Hoy: email vía Resend.
 * Cada eSIM tiene a lo sumo UNA fila qr_delivery por canal (unique en BD):
 * la fila es el registro de la entrega y el árbitro de idempotencia/limites.
 *
 * Reglas de reintento:
 *  - `resend_count` cuenta los intentos que LLEGARON al proveedor (éxito o
 *    error del proveedor). La falta de RESEND_API_KEY NO consume presupuesto:
 *    es un error de configuración y el cron lo reintenta cuando esté la key.
 *  - Cron (`processPendingDeliveries`): pending/failed con resend_count < 5 y
 *    último intento hace > 5 min.
 *  - Reenvío manual (`/resend`): resend_count < 3 y cooldown de 60s (anti-abuso).
 *
 * ⚠️ El HTML renderizado contiene el LPA (secreto): jamás loguearlo.
 */

export const DeliveryErrorCodes = {
  NOT_FOUND: 'DELIVERY_NOT_FOUND',
  NOT_READY: 'DELIVERY_NOT_READY',
  NOT_CONFIGURED: 'RESEND_NOT_CONFIGURED',
  RESEND_LIMIT: 'DELIVERY_RESEND_LIMIT',
  SEND_FAILED: 'DELIVERY_SEND_FAILED',
} as const;

const CRON_MAX_ATTEMPTS = 5;
const CRON_BACKOFF_MS = 5 * 60 * 1000;
const MANUAL_MAX_RESENDS = 3;
const MANUAL_COOLDOWN_MS = 60 * 1000;

export interface DeliveryEsimRecord {
  esimId: string;
  orderId: string;
  /** Email de entrega (guest_email de la orden — siempre presente). */
  email: string | null;
  lang: EmailLang;
  planName: string;
  lpa: string | null;
  iosTapLink: string | null;
  orderStatus: string;
}

export interface QrDeliveryRecord {
  id: string;
  esimId: string;
  status: 'pending' | 'sent' | 'failed';
  resendCount: number;
  lastAttemptAt: string | null;
}

export interface DeliveryStore {
  getEsimForDelivery(esimId: string): Promise<DeliveryEsimRecord | null>;
  /** Devuelve la fila email de la eSIM, creándola pending si no existe. */
  getOrCreateDelivery(esimId: string): Promise<QrDeliveryRecord>;
  /** Marca el momento del intento; countAttempt suma al presupuesto resend_count. */
  recordAttempt(deliveryId: string, countAttempt: boolean): Promise<void>;
  markSent(deliveryId: string, providerMessageId: string, langUsed: EmailLang): Promise<void>;
  markFailed(deliveryId: string, error: string): Promise<void>;
  /** Entregas elegibles para el cron (pending/failed, < 5 intentos, backoff 5min). */
  listRetryable(limit: number): Promise<string[]>; // esimIds
}

export interface EmailTransport {
  sendEmail(params: SendEmailParams): Promise<Result<{ id: string }>>;
}

export interface DeliveryDeps {
  store: DeliveryStore;
  /** null = RESEND_API_KEY sin configurar (dev): la entrega queda failed y reintenta el cron. */
  email: EmailTransport | null;
  now?: () => Date;
}

export interface SendOptions {
  /** Reenvío pedido por el usuario: aplica límite resend_count<3 + cooldown 60s. */
  manual?: boolean;
  /** Override del destinatario (mayorista: enviar el QR al cliente final asignado). */
  toEmail?: string;
}

export { CRON_MAX_ATTEMPTS, CRON_BACKOFF_MS, MANUAL_MAX_RESENDS, MANUAL_COOLDOWN_MS };

export async function sendQrDelivery(
  esimId: string,
  deps: DeliveryDeps,
  options: SendOptions = {},
): Promise<Result<{ status: 'sent' | 'already_sent' }>> {
  const { store } = deps;
  const now = deps.now ?? (() => new Date());

  const esim = await store.getEsimForDelivery(esimId);
  if (!esim) return err(DeliveryErrorCodes.NOT_FOUND, 'eSIM inexistente.');
  if (!esim.lpa || !esim.email || esim.orderStatus !== 'fulfilled') {
    return err(DeliveryErrorCodes.NOT_READY, 'La eSIM no está lista para entregarse (sin QR/email o la orden no está fulfilled).');
  }

  const delivery = await store.getOrCreateDelivery(esimId);

  if (options.manual) {
    if (delivery.resendCount >= MANUAL_MAX_RESENDS) {
      return err(DeliveryErrorCodes.RESEND_LIMIT, 'Alcanzaste el límite de reenvíos. Escribinos y te ayudamos.');
    }
    const last = delivery.lastAttemptAt ? new Date(delivery.lastAttemptAt).getTime() : 0;
    if (now().getTime() - last < MANUAL_COOLDOWN_MS) {
      return err(DeliveryErrorCodes.RESEND_LIMIT, 'Acabamos de enviarte un email. Esperá un minuto y probá de nuevo.');
    }
  } else if (delivery.status === 'sent') {
    // Reenvío automático sobre algo ya entregado: no-op idempotente.
    return ok({ status: 'already_sent' });
  }

  if (!deps.email) {
    await store.recordAttempt(delivery.id, false); // config faltante: no consume presupuesto
    await store.markFailed(delivery.id, DeliveryErrorCodes.NOT_CONFIGURED);
    return err(DeliveryErrorCodes.NOT_CONFIGURED, 'RESEND_API_KEY sin configurar; la entrega queda pendiente de reintento.');
  }

  const { subject, html } = renderQrEmail({
    lang: esim.lang,
    planName: esim.planName,
    lpa: esim.lpa,
    iosTapLink: esim.iosTapLink,
    orderShortId: esim.orderId.slice(0, 8).toUpperCase(),
  });
  const qrPng = await qrPngBase64(esim.lpa);

  await store.recordAttempt(delivery.id, true);
  const sent = await deps.email.sendEmail({
    to: options.toEmail ?? esim.email,
    subject,
    html,
    attachments: [{ filename: 'quierosim-esim-qr.png', content: qrPng, contentId: QR_CONTENT_ID }],
    // resendCount en la clave: cada reintento real es un envío nuevo a propósito.
    idempotencyKey: `qr_delivery:${delivery.id}:${delivery.resendCount}`,
  });

  if (!sent.ok) {
    await store.markFailed(delivery.id, `${sent.error.code}: ${sent.error.message}`);
    return err(DeliveryErrorCodes.SEND_FAILED, 'No pudimos enviar el email; se reintentará automáticamente.');
  }

  await store.markSent(delivery.id, sent.data.id, esim.lang);
  return ok({ status: 'sent' });
}

/** Cron: barre entregas pending/failed elegibles y las reintenta. */
export async function processPendingDeliveries(
  deps: DeliveryDeps,
  limit = 20,
): Promise<Result<{ processed: number; sent: number; failed: number }>> {
  const esimIds = await deps.store.listRetryable(limit);
  let sent = 0;
  let failed = 0;
  for (const esimId of esimIds) {
    const result = await sendQrDelivery(esimId, deps);
    if (result.ok) sent += 1;
    else failed += 1;
  }
  return ok({ processed: esimIds.length, sent, failed });
}
