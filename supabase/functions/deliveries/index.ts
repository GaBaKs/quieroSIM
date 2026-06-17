import { createClient } from '@supabase/supabase-js';
import { createResendClient } from '../_shared/email/resend.ts';
import {
  processPendingDeliveries,
  sendQrDelivery,
  type DeliveryDeps,
} from '../_shared/services/delivery.ts';
import { createSupabaseDeliveryStore } from '../_shared/services/delivery-store-supabase.ts';

/**
 * Entrega del QR por email (verify_jwt ON — exige anon JWT o sesión):
 *  POST /deliveries/process → cron cada 10 min (exige x-cron-secret): barre
 *                             entregas pending/failed y las reintenta.
 *  POST /deliveries/resend  → reenvío manual: usuario logueado dueño de la
 *                             eSIM (esimId) o guest con orderId+email (mismo
 *                             contrato que checkout/status). Límite anti-abuso
 *                             en el servicio (3 reenvíos + cooldown 60s).
 */

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
function fail(code: string, message: string, status = 400): Response {
  return json({ ok: false, error: { code, message } }, status);
}

function makeDeps(supabase: ReturnType<typeof createClient>): DeliveryDeps {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  return {
    store: createSupabaseDeliveryStore(supabase),
    email: apiKey
      ? createResendClient({ apiKey, from: Deno.env.get('EMAIL_FROM') ?? 'QuieroSIM <onboarding@resend.dev>' })
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

  // ── /process: cron de reintentos ───────────────────────────────────────────
  if (route === 'process') {
    const cronSecret = Deno.env.get('CRON_SECRET');
    if (cronSecret && req.headers.get('x-cron-secret') !== cronSecret) {
      return new Response('forbidden', { status: 403 });
    }
    const result = await processPendingDeliveries(makeDeps(supabase));
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

    const result = await sendQrDelivery(targetEsimId!, makeDeps(supabase), { manual: true });
    if (!result.ok) {
      const status = result.error.code === 'DELIVERY_RESEND_LIMIT' ? 429 : 502;
      return fail(result.error.code, result.error.message, status);
    }
    return json({ ok: true, data: result.data });
  }

  return new Response('not found', { status: 404 });
});
