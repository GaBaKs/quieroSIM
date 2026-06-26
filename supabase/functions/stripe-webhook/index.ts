import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { createStripeGateway } from '../_shared/stripe/gateway.ts';
import { runProvision } from '../_shared/services/provisioning.ts';
import { createSupabaseProvisionStore } from '../_shared/services/provision-store-supabase.ts';
import {
  makeYesim,
  deliverQrForOrder,
  deliverQrWhatsappForOrder,
  startProvisionAndDeliver,
} from '../_shared/services/fulfillment.ts';

/**
 * Webhook de Stripe + reintento manual de provisión.
 *  POST /stripe-webhook        → eventos de Stripe (verify_jwt OFF: Stripe no
 *                                manda JWT; la seguridad es la FIRMA, §2.4).
 *  POST /stripe-webhook/retry  → reintento manual (auth propia: token de un
 *                                usuario con admin_profile).
 *
 * Candados (§5.3): 1) idempotencia por event.id (stripe_event unique),
 * 2) guard pending→paid atómico, 3/4) en la máquina de provisión.
 */

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void } | undefined;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  const route = new URL(req.url).pathname.split('/').filter(Boolean).pop();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // ── /retry: reintento manual del admin (orden en failed_needs_review) ──────
  if (route === 'retry') {
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Falta token.' } }, 401);
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData.user) return json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Token inválido.' } }, 401);
    const { data: adminRow } = await supabase
      .from('admin_profile')
      .select('sub_role')
      .eq('user_id', userData.user.id)
      .maybeSingle();
    if (!adminRow) return json({ ok: false, error: { code: 'FORBIDDEN', message: 'Solo administradores.' } }, 403);

    const { orderId } = (await req.json().catch(() => ({}))) as { orderId?: string };
    if (!orderId) return json({ ok: false, error: { code: 'VALIDATION', message: 'Falta orderId.' } }, 400);

    await supabase.from('audit_log').insert({
      action: 'provision_manual_retry',
      actor_id: userData.user.id,
      actor_type: 'admin',
      payload: { order_id: orderId },
    });

    const result = await runProvision(orderId, {
      store: createSupabaseProvisionStore(supabase),
      yesim: makeYesim(),
    });
    if (result.ok && result.data.state === 'fulfilled') {
      await deliverQrForOrder(supabase, orderId);
      await deliverQrWhatsappForOrder(supabase, orderId);
    }
    return json(result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error }, result.ok ? 200 : 409);
  }

  // ── /refund: reembolso manual (SOLO super_admin — es financiero) ────────────
  if (route === 'refund') {
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Falta token.' } }, 401);
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData.user) return json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Token inválido.' } }, 401);
    const { data: adminRow } = await supabase
      .from('admin_profile')
      .select('sub_role')
      .eq('user_id', userData.user.id)
      .maybeSingle();
    if (adminRow?.sub_role !== 'super_admin') {
      return json({ ok: false, error: { code: 'FORBIDDEN', message: 'Solo super administradores pueden reembolsar.' } }, 403);
    }

    const { orderId } = (await req.json().catch(() => ({}))) as { orderId?: string };
    if (!orderId) return json({ ok: false, error: { code: 'VALIDATION', message: 'Falta orderId.' } }, 400);

    const { data: order } = await supabase
      .from('order')
      .select('id, status, stripe_payment_intent_id')
      .eq('id', orderId)
      .maybeSingle();
    if (!order) return json({ ok: false, error: { code: 'NOT_FOUND', message: 'Orden no encontrada.' } }, 404);
    if (order.status === 'refunded') return json({ ok: true, data: { status: 'refunded', alreadyRefunded: true } });
    if (!order.stripe_payment_intent_id) {
      return json({ ok: false, error: { code: 'CONFLICT', message: 'La orden no tiene un pago para reembolsar.' } }, 409);
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { httpClient: Stripe.createFetchHttpClient() });
    const gateway = createStripeGateway(stripe);
    const refund = await gateway.createRefund({ paymentIntentId: order.stripe_payment_intent_id });
    if (!refund.ok) {
      return json({ ok: false, error: { code: refund.error.code, message: 'No pudimos procesar el reembolso.' } }, 502);
    }

    // El webhook charge.refunded también marca refunded; lo hacemos acá ya para
    // que el panel lo refleje al instante (idempotente).
    await supabase.from('order').update({ status: 'refunded' }).eq('id', orderId);
    await supabase.from('audit_log').insert({
      action: 'order_refund',
      actor_id: userData.user.id,
      actor_type: 'admin',
      payload: { order_id: orderId, refund_id: refund.data.id },
    });
    return json({ ok: true, data: { status: 'refunded', refundId: refund.data.id } });
  }

  // ── Webhook de Stripe ───────────────────────────────────────────────────────
  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('missing signature', { status: 400 });

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET no configurado en secrets');
    return new Response('webhook not configured', { status: 500 });
  }

  const rawBody = await req.text();
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    httpClient: Stripe.createFetchHttpClient(),
  });
  const gateway = createStripeGateway(stripe);

  // Regla §2.4: NADA se procesa sin firma válida.
  const verified = await gateway.verifyWebhookEvent(rawBody, signature, webhookSecret);
  if (!verified.ok) return new Response('invalid signature', { status: 400 });
  const event = verified.data;

  // Candado 1: idempotencia por event.id — el insert con unique es el árbitro.
  const { error: dedupeErr } = await supabase
    .from('stripe_event')
    .insert({ stripe_event_id: event.id, event_type: event.type, processing_result: 'received' });
  if (dedupeErr) {
    if (dedupeErr.code === '23505') return json({ received: true, duplicate: true }); // reintento de Stripe
    console.error('stripe_event insert error', dedupeErr.message);
    return new Response('storage error', { status: 500 });
  }

  let processingResult = 'ignored';

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent;
    const orderId = intent.metadata?.order_id;
    if (orderId) {
      // Candado 2: transición pending→paid atómica — solo UNA ejecución la logra.
      const { data: updated } = await supabase
        .from('order')
        .update({ status: 'paid' })
        .eq('id', orderId)
        .eq('status', 'pending')
        .select('id, plan_id, coupon_id');

      if (updated && updated.length > 0) {
        // Candado de catálogo: si el plan se DESACTIVÓ entre la creación del PI
        // y el cobro, NO se emite. El pago ya ocurrió (el cliente confirmó
        // directo con Stripe); la orden queda en revisión para que el admin
        // reembolse o la emita a mano. Nunca se emite un plan dado de baja.
        const { data: planRow } = await supabase
          .from('plan')
          .select('status')
          .eq('id', updated[0].plan_id)
          .maybeSingle();
        if (planRow?.status !== 'active') {
          await supabase.from('order').update({ status: 'failed_needs_review' }).eq('id', orderId);
          await supabase.from('audit_log').insert({
            action: 'order_plan_inactive_at_capture',
            actor_type: 'system_provision',
            payload: { order_id: orderId, plan_id: updated[0].plan_id },
          });
          await supabase
            .from('stripe_event')
            .update({ processing_result: 'plan_inactive_needs_review' })
            .eq('stripe_event_id', event.id);
          return json({ received: true });
        }

        // Etapa 8A: redimir el cupón de forma ATÓMICA (no bloquea la emisión;
        // el descuento ya se aplicó al cobro). Idempotente ante reintentos.
        if (updated[0].coupon_id) {
          const { error: redeemErr } = await supabase.rpc('redeem_coupon', {
            p_coupon_id: updated[0].coupon_id,
            p_order_id: orderId,
          });
          if (redeemErr) console.error('redeem_coupon error', redeemErr.message);
        }

        await supabase
          .from('provision_job')
          .upsert({ order_id: orderId }, { onConflict: 'order_id', ignoreDuplicates: true });

        // Responder rápido a Stripe; la emisión sigue en background.
        const provision = startProvisionAndDeliver(supabase, orderId);
        if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) {
          EdgeRuntime.waitUntil(provision);
        } else {
          await provision;
        }
        processingResult = 'provision_started';
      } else {
        processingResult = 'order_not_pending';
      }
    } else {
      processingResult = 'no_order_id';
    }
  } else if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
    if (paymentIntentId) {
      await supabase.from('order').update({ status: 'refunded' }).eq('stripe_payment_intent_id', paymentIntentId);
      processingResult = 'refund_applied';
    }
  }

  await supabase
    .from('stripe_event')
    .update({ processing_result: processingResult })
    .eq('stripe_event_id', event.id);

  return json({ received: true });
});
