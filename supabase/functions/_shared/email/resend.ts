import { err, ok, type Result } from '../lib/result.ts';
import { scrubText } from '../lib/scrub.ts';

/**
 * Cliente de Resend para email transaccional (decisión 2026-06-12).
 * Sin SDK: la API es un POST simple. Las plantillas HTML (QR, confirmaciones,
 * idiomas ES/EN/PT) llegan en la Etapa 6 — esto es solo el transporte.
 */

export const EmailErrorCodes = {
  SEND_FAILED: 'EMAIL_SEND_FAILED',
} as const;

export interface ResendClientConfig {
  apiKey: string;
  /** Remitente por defecto, ej. "QuieroSIM <hola@quierosim.com>". */
  from: string;
  fetchFn?: typeof fetch;
  baseUrl?: string; // override para tests
}

export interface EmailAttachment {
  filename: string;
  /** Contenido en base64. */
  content: string;
  /** Para incrustar inline en el HTML vía `<img src="cid:...">`. */
  contentId?: string;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
  /** Clave de idempotencia (ej. `qr_delivery:<id>`): reintentar no duplica el envío. */
  idempotencyKey?: string;
}

export function createResendClient(config: ResendClientConfig) {
  const baseUrl = (config.baseUrl ?? 'https://api.resend.com').replace(/\/$/, '');
  const fetchFn = config.fetchFn ?? fetch;

  return {
    async sendEmail(params: SendEmailParams): Promise<Result<{ id: string }>> {
      try {
        const headers: Record<string, string> = {
          authorization: `Bearer ${config.apiKey}`,
          'content-type': 'application/json',
        };
        if (params.idempotencyKey) headers['idempotency-key'] = params.idempotencyKey;

        const response = await fetchFn(`${baseUrl}/emails`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            from: config.from,
            to: [params.to],
            subject: params.subject,
            html: params.html,
            reply_to: params.replyTo,
            attachments: params.attachments?.map((a) => ({
              filename: a.filename,
              content: a.content,
              content_id: a.contentId,
            })),
          }),
        });

        const body = (await response.json().catch(() => null)) as { id?: string; message?: string } | null;
        if (!response.ok) {
          return err(
            EmailErrorCodes.SEND_FAILED,
            scrubText(`Resend HTTP ${response.status}: ${body?.message ?? 'error desconocido'}`),
          );
        }
        return ok({ id: body?.id ?? '' });
      } catch (e) {
        return err(EmailErrorCodes.SEND_FAILED, scrubText(e instanceof Error ? e.message : String(e)));
      }
    },
  };
}

export type ResendClient = ReturnType<typeof createResendClient>;
