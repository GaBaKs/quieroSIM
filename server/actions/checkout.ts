'use server';

import { z } from 'zod';
import { cookies } from 'next/headers';
import { err, ok, type Result } from '../types/result';
import { ErrorCodes } from '../lib/errors';
import { parseInput } from '../lib/validation';
import { requireEnv } from '../lib/env';
import { logger } from '../lib/logger';
import { createSupabaseServerClient } from '../db/supabase-server';

/**
 * Fachada de checkout: proxies delgados hacia las Edge Functions (que tienen
 * los secretos). El front solo conoce estas actions y sus tipos.
 */

const createCheckoutSchema = z.object({
  planId: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string().min(2).max(120),
  phone: z.string().min(5).max(30),
  acceptTerms: z.literal(true),
  /** Idioma del comprador: define el idioma del email con el QR. */
  lang: z.enum(['ES', 'EN', 'PT']).default('ES'),
  /** Código de cupón opcional (se valida de nuevo server-side). */
  couponCode: z.string().trim().max(40).optional(),
  /** El comprador (afiliado) quiere pagar con su crédito de plataforma. */
  useCredit: z.boolean().optional(),
  /**
   * Precio (base, en USD) que el cliente vio al abrir el checkout. El server lo
   * compara con el precio actual de la BD; si difiere (el admin lo cambió en el
   * medio), no cobra y pide confirmar el precio nuevo. Es solo control, nunca el
   * monto a cobrar. Se omite al reconfirmar el precio nuevo.
   */
  expectedPriceUsd: z.number().positive().optional(),
});
export type CreateCheckoutInput = z.input<typeof createCheckoutSchema>;

export interface CheckoutSession {
  orderId: string;
  clientSecret: string;
  amountUsd: number;
  discountUsd?: number;
}

/** El precio cambió entre que el cliente abrió el checkout y apretó "Continuar". */
export interface PriceChanged {
  priceChanged: true;
  newPriceUsd: number;
}

/** Orden gratis (cupón 'free' o total cubierto): no pasa por Stripe, ya se emite la eSIM. */
export interface FreeOrder {
  free: true;
  orderId: string;
}

export type CheckoutResult = CheckoutSession | PriceChanged | FreeOrder;

const previewCouponSchema = z.object({
  code: z.string().trim().min(1).max(40),
  planId: z.string().uuid(),
});

export interface CouponPreview {
  discount: number;
  finalPrice: number;
  /** true si el descuento bajó del mínimo de Stripe (US$0,50) y se cobra el mínimo. */
  minChargeApplied: boolean;
  /** true si el cupón es gratis / cubre el 100% → no pasa por Stripe. */
  isFree: boolean;
}

/** Cobro mínimo de Stripe (USD). No se puede cobrar menos que esto. */
const MIN_CHARGE_USD = 0.5;

const orderStatusSchema = z.object({
  orderId: z.string().uuid(),
  email: z.string().email(),
});

export interface OrderStatusInfo {
  orderStatus: string;
  provisionState: string | null;
  esim: { qrLpa: string; iosTapLink: string | null } | null;
}

async function callEdgeFunction<T>(path: string, body: unknown): Promise<Result<T>> {
  const url = `${requireEnv('NEXT_PUBLIC_SUPABASE_URL')}/functions/v1/${path}`;
  // Token de sesión si el usuario está logueado; si no, el anon JWT (público).
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token ?? requireEnv('SUPABASE_FUNCTIONS_ANON_JWT');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => null)) as
      | { ok?: boolean; data?: T; error?: { code: string; message: string } }
      | null;

    if (!response.ok || !payload?.ok) {
      const code = payload?.error?.code ?? ErrorCodes.INTERNAL;
      const message = payload?.error?.message ?? 'No pudimos procesar la operación. Intentá de nuevo.';
      logger.warn('callEdgeFunction: respuesta no ok', { path, status: response.status, code });
      return err(code, message);
    }
    return ok(payload.data as T);
  } catch (e) {
    logger.error('callEdgeFunction: excepción', { path, error: e instanceof Error ? e.message : String(e) });
    return err(ErrorCodes.PROVIDER_UNAVAILABLE, 'No pudimos conectar con el servidor de pagos. Intentá de nuevo.');
  }
}

/**
 * Crea la orden + PaymentIntent. El precio se recalcula SIEMPRE en el server.
 * Si el precio cambió respecto al que vio el cliente (expectedPriceUsd), no cobra
 * y devuelve { priceChanged, newPriceUsd } para que el front pida confirmación.
 */
export async function createCheckout(input: CreateCheckoutInput): Promise<Result<CheckoutResult>> {
  const parsed = parseInput(createCheckoutSchema, input);
  if (!parsed.ok) return parsed;
  // Referido de afiliado: viene de la cookie qs_aff (server-side, no del cliente).
  // El Edge resuelve y valida el afiliado; acá solo lo reenviamos.
  const aff = (await cookies()).get('qs_aff')?.value;
  const affiliateRef = aff && /^[A-Za-z0-9_-]{1,64}$/.test(aff) ? aff : undefined;
  return callEdgeFunction<CheckoutResult>('checkout/create', { ...parsed.data, affiliateRef });
}

/** Estado de la orden para el polling post-pago (valida orderId+email — apto guests). */
export async function getOrderStatus(input: { orderId: string; email: string }): Promise<Result<OrderStatusInfo>> {
  const parsed = parseInput(orderStatusSchema, input);
  if (!parsed.ok) return parsed;
  return callEdgeFunction<OrderStatusInfo>('checkout/status', parsed.data);
}

/**
 * Preview del descuento de un cupón (solo UX — la validación que cuenta es la
 * de checkout/create). Valida con el precio real del plan desde la BD, nunca
 * del cliente. RPC validate_coupon (no expone el catálogo de cupones).
 */
export async function previewCoupon(input: { code: string; planId: string }): Promise<Result<CouponPreview>> {
  const parsed = parseInput(previewCouponSchema, input);
  if (!parsed.ok) return parsed;

  const supabase = await createSupabaseServerClient();
  // Precio real del plan (vista pública catalog_pricing) — nunca del cliente.
  const { data: priceRow } = await supabase
    .from('catalog_pricing')
    .select('price_final')
    .eq('plan_id', parsed.data.planId)
    .maybeSingle();
  if (!priceRow?.price_final) return err(ErrorCodes.NOT_FOUND, 'El plan no está disponible.');
  const subtotal = Number(priceRow.price_final);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase.rpc('validate_coupon', {
    p_code: parsed.data.code,
    p_plan_id: parsed.data.planId,
    p_subtotal: subtotal,
    p_user_id: user?.id ?? undefined,
    p_email: user?.email ?? undefined,
  });
  if (error) {
    logger.error('previewCoupon falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos validar el cupón. Intentá de nuevo.');
  }
  const v = data as { valid?: boolean; discount?: number; is_free?: boolean; reason?: string } | null;
  if (!v?.valid) return err('COUPON_INVALID', v?.reason ?? 'El cupón no es válido.');

  const discount = Number(v.discount ?? 0);
  const raw = Math.max(0, subtotal - discount);
  const isFree = v.is_free === true || raw === 0;
  // Gratis → finalPrice 0 (no pasa por Stripe). Si no, aplica el piso de Stripe.
  const finalPrice = isFree ? 0 : raw < MIN_CHARGE_USD ? MIN_CHARGE_USD : raw;
  return ok({ discount, finalPrice, minChargeApplied: !isFree && raw < MIN_CHARGE_USD, isFree });
}
