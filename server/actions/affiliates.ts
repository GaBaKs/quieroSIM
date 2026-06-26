'use server';

import { z } from 'zod';
import { cookies } from 'next/headers';
import { err, ok, type Result } from '../types/result';
import { ErrorCodes } from '../lib/errors';
import { parseInput } from '../lib/validation';
import { logger } from '../lib/logger';
import { createSupabaseServerClient } from '../db/supabase-server';

/**
 * Fachada del afiliado (lado usuario logueado). El alta y los movimientos
 * financieros van por RPC SECURITY DEFINER (register_affiliate, affiliate_my_balance);
 * el front solo conoce estas actions. Las comisiones se calculan server-side.
 */

export interface AffiliateBalance {
  available: number;
  pending: number;
  withdrawn: number;
  converted: number;
  credit: number;
}

export interface MyAffiliate {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  channel: string | null;
  estimatedAudience: number | null;
  referralLink: string | null;
  couponCode: string | null;
  balance: AffiliateBalance;
}

/** Perfil de afiliado del usuario actual (o null si no es afiliado). */
export async function getMyAffiliate(): Promise<Result<MyAffiliate | null>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err(ErrorCodes.UNAUTHORIZED, 'Iniciá sesión para ver tu panel de afiliado.');

  const { data: prof, error } = await supabase
    .from('affiliate_profile')
    .select('id, status, channel, estimated_audience, referral_link, coupon_code')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) {
    logger.error('getMyAffiliate falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos cargar tu panel.');
  }
  if (!prof) return ok(null);

  // Balance derivado (RPC SECURITY DEFINER, restringido al afiliado del usuario).
  const { data: bal } = await supabase.rpc('affiliate_my_balance' as never);
  const b = (bal ?? {}) as { available?: number; pending?: number; withdrawn?: number; converted?: number; credit?: number };

  return ok({
    id: prof.id,
    status: prof.status as MyAffiliate['status'],
    channel: prof.channel,
    estimatedAudience: prof.estimated_audience,
    referralLink: prof.referral_link,
    couponCode: prof.coupon_code,
    balance: {
      available: Number(b.available ?? 0),
      pending: Number(b.pending ?? 0),
      withdrawn: Number(b.withdrawn ?? 0),
      converted: Number(b.converted ?? 0),
      credit: Number(b.credit ?? 0),
    },
  });
}

const amountSchema = z.object({ amount: z.number().positive().max(1_000_000) });

/** Convierte comisión disponible en crédito de plataforma (usable en checkout). */
export async function convertToCredit(input: { amount: number }): Promise<Result<null>> {
  const parsed = parseInput(amountSchema, input);
  if (!parsed.ok) return parsed;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('affiliate_convert_to_credit' as never, { p_amount: parsed.data.amount } as never);
  if (error) {
    logger.error('convertToCredit falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos convertir a crédito.');
  }
  const r = data as { ok?: boolean; reason?: string } | null;
  if (!r?.ok) return err(ErrorCodes.VALIDATION, r?.reason ?? 'No se pudo convertir.');
  return ok(null);
}

/** Solicita un retiro (≥ mínimo). El admin lo paga por fuera y lo marca pagado. */
export async function requestWithdrawal(input: { amount: number }): Promise<Result<null>> {
  const parsed = parseInput(amountSchema, input);
  if (!parsed.ok) return parsed;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('affiliate_request_withdrawal' as never, { p_amount: parsed.data.amount } as never);
  if (error) {
    logger.error('requestWithdrawal falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos registrar el retiro.');
  }
  const r = data as { ok?: boolean; reason?: string } | null;
  if (!r?.ok) return err(ErrorCodes.VALIDATION, r?.reason ?? 'No se pudo solicitar el retiro.');
  return ok(null);
}

/** Crédito de plataforma gastable del comprador logueado (0 si no tiene/no es afiliado). */
export async function getMyCreditBalance(): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;
  const { data } = await supabase.rpc('affiliate_my_balance' as never);
  const b = (data ?? {}) as { credit?: number };
  return Math.max(0, Number(b.credit ?? 0));
}

const registerSchema = z.object({
  channel: z.string().trim().max(120).optional(),
  estimatedAudience: z.number().int().min(0).max(1_000_000_000).optional(),
  acceptTerms: z.literal(true),
});

/** Alta como afiliado (queda pendiente de aprobación). Requiere aceptar términos. */
export async function registerAffiliate(input: {
  channel?: string;
  estimatedAudience?: number;
  acceptTerms: true;
}): Promise<Result<{ affiliateId: string }>> {
  const parsed = parseInput(registerSchema, input);
  if (!parsed.ok) return parsed;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err(ErrorCodes.UNAUTHORIZED, 'Iniciá sesión para registrarte como afiliado.');

  // Multinivel: si el usuario llegó por el link de otro afiliado (cookie qs_aff),
  // queda como su referido (L2). El RPC valida que el referidor esté aprobado.
  const aff = (await cookies()).get('qs_aff')?.value;
  const referrerRef = aff && /^[A-Za-z0-9_-]{1,64}$/.test(aff) ? aff : null;

  const { data, error } = await supabase.rpc('register_affiliate' as never, {
    p_channel: parsed.data.channel ?? null,
    p_audience: parsed.data.estimatedAudience ?? null,
    p_referrer_ref: referrerRef,
  } as never);
  if (error) {
    logger.error('registerAffiliate falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos registrar tu solicitud.');
  }
  const r = data as { ok?: boolean; reason?: string; affiliateId?: string } | null;
  if (!r?.ok) return err(ErrorCodes.VALIDATION, r?.reason ?? 'No pudimos registrar tu solicitud.');
  return ok({ affiliateId: r.affiliateId! });
}
