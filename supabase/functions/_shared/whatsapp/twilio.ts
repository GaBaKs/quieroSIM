import { err, ok, type Result } from '../lib/result.ts';
import { scrubText } from '../lib/scrub.ts';

/**
 * Cliente de Twilio para WhatsApp Business (BSP). Sin SDK: la API REST es un
 * POST form-encoded con Basic auth. Hoy SOLO salida (mandar la notificación con
 * el QR); el cliente queda genérico para que sumar un receptor de entrantes
 * (firma de webhook + bot) más adelante sea drop-in, no refactor.
 *
 * ⚠️ Nunca loguear `body` ni `mediaUrl` (la URL firmada da acceso al QR).
 * Los errores pasan por scrubText, igual que el cliente de Resend.
 */

export const WhatsappErrorCodes = {
  SEND_FAILED: 'WHATSAPP_SEND_FAILED',
} as const;

export interface TwilioClientConfig {
  accountSid: string;
  authToken: string;
  /** Remitente en E.164, ej. "+14155238886" (número del sandbox). Se le antepone "whatsapp:". */
  from: string;
  fetchFn?: typeof fetch;
  baseUrl?: string; // override para tests
}

export interface SendWhatsappParams {
  /** Destino en E.164, ej. "+5491150000000". Se le antepone "whatsapp:". */
  to: string;
  body: string;
  /** URL pública (firmada, TTL corto) de la media a adjuntar (PNG del QR). */
  mediaUrl?: string;
}

/**
 * Normaliza un teléfono a E.164 (`+` seguido de 8–15 dígitos). Devuelve null si
 * no es un número plausible — la entrega entonces queda failed con motivo claro.
 */
export function normalizeE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.trim().replace(/[^\d]/g, '');
  if (digits.length < 8 || digits.length > 15) return null; // rango E.164
  return `+${digits}`;
}

export function createTwilioClient(config: TwilioClientConfig) {
  const baseUrl = (config.baseUrl ?? 'https://api.twilio.com').replace(/\/$/, '');
  const fetchFn = config.fetchFn ?? fetch;
  const auth = btoa(`${config.accountSid}:${config.authToken}`);
  const endpoint = `${baseUrl}/2010-04-01/Accounts/${config.accountSid}/Messages.json`;

  return {
    async sendWhatsapp(params: SendWhatsappParams): Promise<Result<{ sid: string }>> {
      try {
        const form = new URLSearchParams();
        form.set('From', `whatsapp:${config.from}`);
        form.set('To', `whatsapp:${params.to}`);
        form.set('Body', params.body);
        if (params.mediaUrl) form.set('MediaUrl', params.mediaUrl);

        const response = await fetchFn(endpoint, {
          method: 'POST',
          headers: {
            authorization: `Basic ${auth}`,
            'content-type': 'application/x-www-form-urlencoded',
          },
          body: form.toString(),
        });

        const data = (await response.json().catch(() => null)) as
          | { sid?: string; message?: string; code?: number }
          | null;
        if (!response.ok) {
          return err(
            WhatsappErrorCodes.SEND_FAILED,
            scrubText(`Twilio HTTP ${response.status}: ${data?.message ?? 'error desconocido'}`),
          );
        }
        return ok({ sid: data?.sid ?? '' });
      } catch (e) {
        return err(WhatsappErrorCodes.SEND_FAILED, scrubText(e instanceof Error ? e.message : String(e)));
      }
    },
  };
}

export type TwilioClient = ReturnType<typeof createTwilioClient>;
