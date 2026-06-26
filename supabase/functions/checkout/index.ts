import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { createStripeGateway } from '../_shared/stripe/gateway.ts';
import { startProvisionAndDeliver } from '../_shared/services/fulfillment.ts';

/**
 * API de checkout (verify_jwt ON — exige anon JWT o sesión):
 *  POST /checkout/create  → orden 'pending' + PaymentIntent (precio desde BD), o
 *                           camino pago-cero (cupón gratis / total cubierto) que
 *                           NO pasa por Stripe y emite la eSIM directo.
 *  POST /checkout/status  → estado de la orden para el polling (orderId+email,
 *                           apto guests que no pueden leer por RLS).
 */

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void } | undefined;

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

    const { planId, email, fullName, phone, acceptTerms, lang, couponCode, expectedPriceUsd, affiliateRef, useCredit } = body as {
      planId?: string; email?: string; fullName?: string; phone?: string; acceptTerms?: boolean; lang?: string; couponCode?: string; expectedPriceUsd?: number; affiliateRef?: string; useCredit?: boolean;
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
    let isFreeCoupon = false;
    if (couponCode && couponCode.trim()) {
      const { data: cv } = await supabase.rpc('validate_coupon', {
        p_code: couponCode,
        p_plan_id: plan.id,
        p_subtotal: priceUsd,
        p_user_id: userId,
        p_email: email.toLowerCase(),
      });
      const v = cv as { valid?: boolean; coupon_id?: string; discount?: number; is_free?: boolean; reason?: string } | null;
      if (!v?.valid) {
        return fail('COUPON_INVALID', v?.reason ?? 'El cupón no es válido.', 400);
      }
      couponId = v.coupon_id ?? null;
      discountApplied = Number(v.discount ?? 0);
      isFreeCoupon = v.is_free === true;
      finalUsd = Math.max(0, priceUsd - discountApplied);
    }

    // Atribución de afiliado (A3): por cupón de afiliado (prioridad) o por link de
    // referido (cookie qs_aff → affiliateRef). Solo afiliados 'approved' y nunca la
    // propia compra del afiliado. Se guarda en order.affiliate_profile_id (L1); el
    // L2 lo deriva el motor de comisiones desde referred_by_affiliate_id.
    let affiliateProfileId: string | null = null;
    if (couponId) {
      const { data: cp } = await supabase.from('coupon').select('affiliate_profile_id').eq('id', couponId).maybeSingle();
      if (cp?.affiliate_profile_id) {
        const { data: ap } = await supabase.from('affiliate_profile').select('id, status, user_id').eq('id', cp.affiliate_profile_id).maybeSingle();
        if (ap?.status === 'approved' && ap.user_id !== userId) affiliateProfileId = ap.id;
      }
    }
    if (!affiliateProfileId && affiliateRef && /^[A-Za-z0-9_-]{1,64}$/.test(affiliateRef)) {
      const { data: ap } = await supabase.from('affiliate_profile').select('id, status, user_id').eq('referral_link', affiliateRef).maybeSingle();
      if (ap?.status === 'approved' && ap.user_id !== userId) affiliateProfileId = ap.id;
    }

    // Mínimo de cobro de Stripe (US$0,50). Lo usa la regla de crédito y el clamp final.
    const MIN_CHARGE_USD = 0.5;

    // ── Crédito de afiliado del comprador (A6.1) ──────────────────────────────
    // El comprador logueado puede pagar parte/todo con su crédito de plataforma.
    // Regla del mínimo de Stripe: el remanente a cobrar nunca cae en (0, 0.50) —
    // o $0 (sin Stripe) o ≥$0.50. El server recalcula SIEMPRE (no confía en el front).
    let creditApplied = 0;
    if (useCredit === true && userId && finalUsd > 0) {
      const { data: buyerAff } = await supabase.from('affiliate_profile').select('id').eq('user_id', userId).maybeSingle();
      if (buyerAff) {
        const { data: creditRows } = await supabase.from('affiliate_credit').select('movement_type, amount').eq('affiliate_profile_id', buyerAff.id);
        const creditBalance = (creditRows ?? []).reduce(
          (sum: number, r: { movement_type: string | null; amount: number | string }) =>
            sum + (r.movement_type === 'spent' ? -Math.abs(Number(r.amount)) : Number(r.amount)),
          0,
        );
        if (creditBalance > 0) {
          let toApply = Math.min(creditBalance, finalUsd);
          const remainder = Math.round((finalUsd - toApply) * 100) / 100;
          if (remainder > 0 && remainder < MIN_CHARGE_USD) {
            // Zona muerta: o el crédito cubre todo, o se deja exactamente $0.50 a Stripe.
            toApply = creditBalance >= finalUsd ? finalUsd : Math.round((finalUsd - MIN_CHARGE_USD) * 100) / 100;
          }
          creditApplied = Math.round(toApply * 100) / 100;
          finalUsd = Math.round((finalUsd - creditApplied) * 100) / 100;
        }
      }
    }

    // ── Camino pago-cero ──────────────────────────────────────────────────────
    // Cupón 'free' o descuento que cubre el 100%: NO se cobra ni se crea
    // PaymentIntent. Se crea la orden, se marca pagada y se emite la eSIM directo
    // (mismo flujo que el webhook). Idempotencia: guard atómico + provision_job.
    if (isFreeCoupon || finalUsd === 0) {
      const { data: freeOrder, error: freeErr } = await supabase
        .from('order')
        .insert({
          user_id: userId,
          guest_email: email.toLowerCase(),
          guest_phone: phone,
          plan_id: plan.id,
          price_paid: 0,
          currency_sale: 'USD',
          coupon_id: couponId,
          affiliate_profile_id: affiliateProfileId,
          affiliate_credit_applied: creditApplied,
          discount_applied: discountApplied,
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
          channel: 'web',
          status: 'pending',
          lang: orderLang,
        })
        .select('id')
        .single();
      if (freeErr || !freeOrder) return fail('INTERNAL', 'No pudimos crear la orden.', 500);

      // Guard atómico pending→paid (sin cobro): solo UNA ejecución la logra.
      const { data: paid } = await supabase
        .from('order')
        .update({ status: 'paid' })
        .eq('id', freeOrder.id)
        .eq('status', 'pending')
        .select('id');
      if (!paid || paid.length === 0) return fail('CONFLICT', 'La orden no se pudo confirmar.', 409);

      if (couponId) {
        const { error: redeemErr } = await supabase.rpc('redeem_coupon', { p_coupon_id: couponId, p_order_id: freeOrder.id });
        if (redeemErr) console.error('redeem_coupon error', redeemErr.message);
      }

      // Asiento del crédito gastado (la orden ya quedó paid). Idempotente: 1 por orden.
      if (creditApplied > 0 && userId) {
        const { data: ba } = await supabase.from('affiliate_profile').select('id').eq('user_id', userId).maybeSingle();
        if (ba) {
          const { data: exists } = await supabase.from('affiliate_credit').select('id').eq('order_id', freeOrder.id).eq('movement_type', 'spent').maybeSingle();
          if (!exists) {
            await supabase.from('affiliate_credit').insert({ affiliate_profile_id: ba.id, movement_type: 'spent', amount: creditApplied, order_id: freeOrder.id });
          }
        }
      }

      await supabase.from('provision_job').upsert({ order_id: freeOrder.id }, { onConflict: 'order_id', ignoreDuplicates: true });

      const provision = startProvisionAndDeliver(supabase, freeOrder.id);
      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) {
        EdgeRuntime.waitUntil(provision);
      } else {
        await provision;
      }

      return json({ ok: true, data: { free: true, orderId: freeOrder.id } });
    }
    // Stripe exige un cobro mínimo (~US$0,50). Si tras cupón el monto baja de ese
    // piso (sin crédito aplicado), se cobra el mínimo y se reajusta el descuento
    // para que price_paid + discount_applied + crédito = precio del plan.
    if (finalUsd < MIN_CHARGE_USD) {
      finalUsd = MIN_CHARGE_USD;
      discountApplied = Math.round((priceUsd - finalUsd - creditApplied) * 100) / 100;
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
        affiliate_profile_id: affiliateProfileId,
        affiliate_credit_applied: creditApplied,
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
