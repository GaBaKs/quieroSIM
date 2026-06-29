// ⚠️ COPIA de ../wholesale-checkout SOLO para testing local (Stripe modo test).
// Única diferencia: lee STRIPE_SECRET_KEY_TEST. NO se usa en producción.
// Si cambia ../wholesale-checkout/index.ts, re-sincronizar este archivo.
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

/**
 * Checkout mayorista (verify_jwt ON — exige sesión de la agencia):
 *  POST /wholesale-checkout/create  body { items: [{planId, qty}] }
 * Resuelve la agencia aprobada del usuario, crea el lote + N órdenes con el
 * PRECIO MAYORISTA recalculado server-side (RPC create_wholesale_batch), y un
 * único PaymentIntent por el total (metadata.wholesale_batch_id → lo provisiona
 * el stripe-webhook por ítem). El precio mayorista nunca se confía al cliente.
 */

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
function fail(code: string, message: string, status = 400): Response {
  return json({ ok: false, error: { code, message } }, status);
}

const MIN_CHARGE_USD = 0.5;

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  const route = new URL(req.url).pathname.split('/').filter(Boolean).pop();
  if (route !== 'create') return fail('NOT_FOUND', 'Ruta no encontrada.', 404);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Auth: token de la agencia.
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return fail('UNAUTHORIZED', 'Falta token.', 401);
  const { data: userData } = await supabase.auth.getUser(token);
  if (!userData.user) return fail('UNAUTHORIZED', 'Token inválido.', 401);

  // Agencia aprobada del usuario.
  const { data: agency } = await supabase
    .from('agency_profile')
    .select('id, status')
    .eq('user_id', userData.user.id)
    .maybeSingle();
  if (!agency || agency.status !== 'approved') return fail('FORBIDDEN', 'No sos una agencia aprobada.', 403);

  let body: { items?: Array<{ planId?: string; qty?: number }> };
  try {
    body = await req.json();
  } catch {
    return fail('VALIDATION', 'Body inválido.');
  }
  const rpcItems = (body.items ?? [])
    .map((it) => ({ plan_id: String(it.planId ?? ''), qty: Math.max(0, Math.floor(Number(it.qty) || 0)) }))
    .filter((it) => /^[0-9a-f-]{36}$/i.test(it.plan_id) && it.qty > 0);
  if (rpcItems.length === 0) return fail('VALIDATION', 'El carrito está vacío.');

  // Crear lote + órdenes con precio mayorista calculado por el RPC (autoridad server-side).
  const { data: batchRes, error: batchErr } = await supabase.rpc('create_wholesale_batch', {
    p_agency_id: agency.id,
    p_items: rpcItems,
    p_email: userData.user.email,
  });
  if (batchErr) {
    console.error('create_wholesale_batch error', batchErr.message);
    return fail('INTERNAL', 'No pudimos crear el lote.', 500);
  }
  const r = batchRes as { ok?: boolean; reason?: string; batchId?: string; total?: number; count?: number } | null;
  if (!r?.ok) return fail('VALIDATION', r?.reason ?? 'No se pudo crear el lote.');

  const totalUsd = Number(r.total ?? 0);
  if (totalUsd < MIN_CHARGE_USD) return fail('VALIDATION', 'El total del lote es menor al mínimo de cobro.');

  // Un único PaymentIntent por el total (metadata: el lote, no una orden).
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY_TEST')!, { httpClient: Stripe.createFetchHttpClient() });
  let clientSecret: string | null = null;
  try {
    const intent = await stripe.paymentIntents.create(
      {
        amount: Math.round(totalUsd * 100),
        currency: 'usd',
        receipt_email: userData.user.email ?? undefined,
        metadata: { wholesale_batch_id: r.batchId! },
        automatic_payment_methods: { enabled: true },
      },
      { idempotencyKey: `wholesale_${r.batchId}_pi` },
    );
    clientSecret = intent.client_secret;
    await supabase.from('wholesale_batch').update({ stripe_payment_intent_id: intent.id }).eq('id', r.batchId);
  } catch (e) {
    await supabase.from('wholesale_batch').update({ status: 'cancelled' }).eq('id', r.batchId);
    console.error('wholesale PaymentIntent error', e instanceof Error ? e.message : 'err');
    return fail('STRIPE_ERROR', 'No pudimos iniciar el pago. Intentá de nuevo.', 502);
  }

  return json({ ok: true, data: { batchId: r.batchId, clientSecret, totalUsd, count: r.count } });
});
