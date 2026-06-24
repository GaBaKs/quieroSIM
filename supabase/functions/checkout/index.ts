import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { createStripeGateway } from '../_shared/stripe/gateway.ts';

/**
 * API de checkout (verify_jwt ON — exige anon JWT o sesión):
 *  POST /checkout/create  → orden 'pending' + PaymentIntent (precio desde BD).
 *  POST /checkout/status  → estado de la orden para el polling (orderId+email,
 *                           apto guests que no pueden leer por RLS).
 */

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
function fail(code: string, message: string, status = 400): Response {
  return json({ ok: false, error: { code, message } }, status);
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  const route = new URL(req.url).pathname.split('/').filter(Boolean).pop();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail('VALIDATION', 'Body JSON inválido.');
  }

  // ── /create ───────────────────────────────────────────────────────────────
  if (route === 'create') {
    // Rate limit por IP (anti-abuso/spam de pagos): 15 órdenes por minuto.
    const ip = (req.headers.get('x-forwarded-for')?.split(',')[0] ?? req.headers.get('x-real-ip') ?? 'unknown').trim();
    const { data: allowed } = await supabase.rpc('rate_limit_hit', {
      p_bucket: `checkout:${ip}`,
      p_max: 15,
      p_window_seconds: 60,
    });
    if (allowed === false) {
      return fail('RATE_LIMITED', 'Demasiados intentos. Esperá un momento y probá de nuevo.', 429);
    }

    const { planId, email, fullName, phone, acceptTerms, lang, couponCode, expectedPriceUsd } = body as {
      planId?: string; email?: string; fullName?: string; phone?: string; acceptTerms?: boolean; lang?: string; couponCode?: string; expectedPriceUsd?: number;
    };
    // Idioma del comprador: define el idioma del email con el QR (Etapa 6).
    const orderLang = lang && ['ES', 'EN', 'PT'].includes(lang) ? lang : 'ES';
    if (!planId || !email || !/\S+@\S+\.\S+/.test(email) || !fullName || !phone) {
      return fail('VALIDATION', 'Faltan datos del comprador.');
    }
    // RF-LEG-01: sin aceptación de T&C no hay cobro.
    if (acceptTerms !== true) {
      return fail('VALIDATION', 'Tenés que aceptar los Términos y Condiciones.');
    }

    // Usuario logueado (opcional): el JWT viene en Authorization.
    let userId: string | null = null;
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (token) {
      const { data } = await supabase.auth.getUser(token);
      userId = data.user?.id ?? null;
    }

    // Precio SIEMPRE desde la BD — jamás del cliente.
    const { data: plan, error: planErr } = await supabase
      .from('plan')
      .select('id, yesim_id, status, plan_pricing(price_final)')
      .eq('id', planId)
      .maybeSingle();
    const pricing = Array.isArray(plan?.plan_pricing) ? plan?.plan_pricing[0] : plan?.plan_pricing;
    if (planErr || !plan || plan.status !== 'active' || !pricing?.price_final) {
      return fail('PLAN_NOT_AVAILABLE', 'El plan no está disponible.', 404);
    }
    const priceUsd = Number(pricing.price_final);

    // Candado de precio: si el admin cambió el precio mientras el cliente
    // completaba sus datos, el precio actual de la BD ya no coincide con el que
    // vio. NO cobramos: avisamos el precio nuevo para que confirme (sin crear
    // orden ni PaymentIntent). Tolerancia de 1 centavo por redondeos. El monto a
    // cobrar SIEMPRE sale de la BD; expectedPriceUsd es solo el valor de control
    // que vio el cliente, nunca el que se cobra.
    if (typeof expectedPriceUsd === 'number' && Math.abs(expectedPriceUsd - priceUsd) > 0.01) {
      return json({ ok: true, data: { priceChanged: true, newPriceUsd: priceUsd } });
    }

    // Cupón (Etapa 8A): se valida SIEMPRE en server (la fuente de verdad; el
    // preview del front es solo UX). El descuento se aplica al monto del PI.
    let couponId: string | null = null;
    let discountApplied = 0;
    let finalUsd = priceUsd;
    if (couponCode && couponCode.trim()) {
      const { data: cv } = await supabase.rpc('validate_coupon', {
        p_code: couponCode,
        p_plan_id: plan.id,
        p_subtotal: priceUsd,
        p_user_id: userId,
        p_email: email.toLowerCase(),
      });
      const v = cv as { valid?: boolean; coupon_id?: string; discount?: number; reason?: string } | null;
      if (!v?.valid) {
        return fail('COUPON_INVALID', v?.reason ?? 'El cupón no es válido.', 400);
      }
      couponId = v.coupon_id ?? null;
      discountApplied = Number(v.discount ?? 0);
      finalUsd = Math.max(0, priceUsd - discountApplied);
    }
    // Stripe exige un cobro mínimo (~US$0,50). Si el descuento baja de ese piso,
    // se cobra el mínimo (no se puede cobrar menos) y se ajusta el descuento real
    // para que price_paid + discount_applied = precio del plan.
    const MIN_CHARGE_USD = 0.5;
    if (finalUsd < MIN_CHARGE_USD) {
      finalUsd = MIN_CHARGE_USD;
      discountApplied = Math.round((priceUsd - finalUsd) * 100) / 100;
    }
    const amountMinor = Math.round(finalUsd * 100);

    // Orden pending (guest_email SIEMPRE: es el canal de entrega y de status).
    const { data: order, error: orderErr } = await supabase
      .from('order')
      .insert({
        user_id: userId,
        guest_email: email.toLowerCase(),
        guest_phone: phone,
        plan_id: plan.id,
        price_paid: finalUsd,
        currency_sale: 'USD',
        coupon_id: couponId,
        discount_applied: discountApplied,
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
        channel: 'web',
        status: 'pending',
        lang: orderLang,
      })
      .select('id')
      .single();
    if (orderErr || !order) return fail('INTERNAL', 'No pudimos crear la orden.', 500);

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      httpClient: Stripe.createFetchHttpClient(),
    });
    const gateway = createStripeGateway(stripe);
    const intent = await gateway.createPaymentIntent({
      amountMinor,
      currency: 'usd',
      orderId: order.id,
      receiptEmail: email.toLowerCase(),
    });
    if (!intent.ok) {
      await supabase.from('order').update({ status: 'failed' }).eq('id', order.id);
      return fail(intent.error.code, 'No pudimos iniciar el pago. Intentá de nuevo.', 502);
    }

    await supabase.from('order').update({ stripe_payment_intent_id: intent.data.id }).eq('id', order.id);

    return json({
      ok: true,
      data: {
        orderId: order.id,
        clientSecret: intent.data.clientSecret,
        amountUsd: finalUsd,
        discountUsd: discountApplied,
      },
    });
  }

  // ── /status ───────────────────────────────────────────────────────────────
  if (route === 'status') {
    const { orderId, email } = body as { orderId?: string; email?: string };
    if (!orderId || !email) return fail('VALIDATION', 'Faltan orderId/email.');

    const { data: order } = await supabase
      .from('order')
      .select('id, status, guest_email, provision_job(state), esim(qr_lpa, ios_tap_link)')
      .eq('id', orderId)
      .maybeSingle();

    // No revelar existencia de órdenes ajenas: mismo error para ambos casos.
    if (!order || (order.guest_email ?? '').toLowerCase() !== email.toLowerCase()) {
      return fail('NOT_FOUND', 'Orden no encontrada.', 404);
    }

    const job = Array.isArray(order.provision_job) ? order.provision_job[0] : order.provision_job;
    const esim = Array.isArray(order.esim) ? order.esim[0] : order.esim;
    const fulfilled = order.status === 'fulfilled' && esim?.qr_lpa;

    return json({
      ok: true,
      data: {
        orderStatus: order.status,
        provisionState: job?.state ?? null,
        esim: fulfilled ? { qrLpa: esim.qr_lpa, iosTapLink: esim.ios_tap_link ?? null } : null,
      },
    });
  }

  return new Response('not found', { status: 404 });
});
