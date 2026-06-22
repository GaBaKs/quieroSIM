import { createClient } from '@supabase/supabase-js';
import { createTwilioClient } from '../_shared/whatsapp/twilio.ts';
import {
  processPendingWhatsapp,
  sendWhatsappDelivery,
  type WhatsappDeliveryDeps,
} from '../_shared/services/whatsapp-delivery.ts';
import {
  createSupabaseQrHosting,
  createSupabaseWhatsappStore,
} from '../_shared/services/whatsapp-delivery-store-supabase.ts';

/**
 * Entrega del QR por WhatsApp (verify_jwt ON — exige anon JWT o sesión). Mirror
 * de la function `deliveries` (canal email):
 *  POST /whatsapp-send/process → cron cada 10 min (exige x-cron-secret): barre
 *                                entregas whatsapp pending/failed, reintenta y
 *                                purga la media vencida del bucket.
 *  POST /whatsapp-send/resend  → reenvío manual: usuario logueado dueño de la
 *                                eSIM (esimId) o guest con orderId+email. Límite
 *                                anti-abuso en el servicio (3 reenvíos + 60s).
 *
 * Solo salida (v1). El receptor de entrantes (bot) sería una function hermana
 * `whatsapp-webhook` — el cliente Twilio ya queda genérico para eso.
 */

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
function fail(code: string, message: string, status = 400): Response {
  return json({ ok: false, error: { code, message } }, status);
}

// deno-lint-ignore no-explicit-any
function makeDeps(supabase: any): WhatsappDeliveryDeps {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_WHATSAPP_FROM');
  return {
    store: createSupabaseWhatsappStore(supabase),
    media: createSupabaseQrHosting(supabase),
    whatsapp:
      accountSid && authToken && from
        ? createTwilioClient({ accountSid, authToken, from })
        : null,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  const route = new URL(req.url).pathname.split('/').filter(Boolean).pop();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // ── /process: cron de reintentos + purga ───────────────────────────────────
  if (route === 'process') {
    const cronSecret = Deno.env.get('CRON_SECRET');
    if (cronSecret && req.headers.get('x-cron-secret') !== cronSecret) {
      return new Response('forbidden', { status: 403 });
    }
    const result = await processPendingWhatsapp(makeDeps(supabase));
    return json(result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error });
  }

  // ── /resend: reenvío manual ────────────────────────────────────────────────
  if (route === 'resend') {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return fail('VALIDATION', 'Body JSON inválido.');
    }
    const { esimId, orderId, email } = body as { esimId?: string; orderId?: string; email?: string };

    let targetEsimId: string | null = null;

    if (orderId && email) {
      // Guest: mismo contrato que checkout/status — orderId + email de la orden.
      const { data: order } = await supabase
        .from('order')
        .select('id, guest_email, esim(id)')
        .eq('id', orderId)
        .maybeSingle();
      if (!order || (order.guest_email ?? '').toLowerCase() !== email.toLowerCase()) {
        return fail('NOT_FOUND', 'Orden no encontrada.', 404);
      }
      const esim = Array.isArray(order.esim) ? order.esim[0] : order.esim;
      if (!esim) return fail('NOT_FOUND', 'La orden no tiene una eSIM emitida todavía.', 404);
      targetEsimId = esim.id;
    } else if (esimId) {
      // Usuario logueado: debe ser el dueño de la eSIM.
      const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
      if (!token) return fail('UNAUTHORIZED', 'Falta sesión.', 401);
      const { data: userData } = await supabase.auth.getUser(token);
      if (!userData.user) return fail('UNAUTHORIZED', 'Sesión inválida.', 401);
      const { data: esim } = await supabase
        .from('esim')
        .select('id, user_id')
        .eq('id', esimId)
        .maybeSingle();
      if (!esim || esim.user_id !== userData.user.id) {
        return fail('NOT_FOUND', 'eSIM no encontrada.', 404);
      }
      targetEsimId = esim.id;
    } else {
      return fail('VALIDATION', 'Falta esimId (con sesión) u orderId+email.');
    }

    const result = await sendWhatsappDelivery(targetEsimId!, makeDeps(supabase), { manual: true });
    if (!result.ok) {
      const status = result.error.code === 'WA_DELIVERY_RESEND_LIMIT' ? 429 : 502;
      return fail(result.error.code, result.error.message, status);
    }
    return json({ ok: true, data: result.data });
  }

  return new Response('not found', { status: 404 });
});
