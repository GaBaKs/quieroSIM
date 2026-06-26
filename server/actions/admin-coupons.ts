'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { err, ok, type Result } from '../types/result';
import { ErrorCodes } from '../lib/errors';
import { parseInput } from '../lib/validation';
import { logger } from '../lib/logger';
import { createSupabaseServerClient } from '../db/supabase-server';
import { requireAdmin } from '../lib/admin-guard';

/**
 * Gestión de cupones (Etapa 8A). Lectura/escritura por RLS admin (coupon_all =
 * is_admin). El conteo de usos sale de coupon_redemption. La validación y la
 * redención viven en las RPC validate_coupon/redeem_coupon (server-side).
 */

export interface AdminCouponRow {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed' | 'free';
  discountValue: number;
  minPurchase: number | null;
  applicablePlanIds: string[];
  startsAt: string | null;
  expiresAt: string | null;
  singleUsePerAccount: boolean;
  singleUseGlobal: boolean;
  nonStackable: boolean;
  maxUsesGlobal: number | null;
  isActive: boolean;
  uses: number;
  totalDiscount: number;
}

export async function getCoupons(): Promise<Result<AdminCouponRow[]>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('coupon')
    .select(
      'id, code, discount_type, discount_value, min_purchase_amount, applicable_plan_ids, starts_at, expires_at, single_use_per_account, single_use_global, non_stackable, max_uses_global, is_active, coupon_redemption(order:order_id(discount_applied))',
    )
    .order('code');

  if (error) {
    logger.error('getCoupons falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos cargar los cupones.');
  }

  const rows: AdminCouponRow[] = (data ?? []).map((c) => {
    const redemptions = Array.isArray(c.coupon_redemption) ? c.coupon_redemption : [];
    const totalDiscount = redemptions.reduce((sum, r) => {
      const order = Array.isArray(r.order) ? r.order[0] : r.order;
      return sum + Number(order?.discount_applied ?? 0);
    }, 0);
    const planIds = Array.isArray(c.applicable_plan_ids) ? (c.applicable_plan_ids as string[]) : [];
    return {
      id: c.id,
      code: c.code,
      discountType: (c.discount_type ?? 'percentage') as 'percentage' | 'fixed' | 'free',
      discountValue: Number(c.discount_value),
      minPurchase: c.min_purchase_amount === null ? null : Number(c.min_purchase_amount),
      applicablePlanIds: planIds,
      startsAt: c.starts_at,
      expiresAt: c.expires_at,
      singleUsePerAccount: !!c.single_use_per_account,
      singleUseGlobal: !!c.single_use_global,
      nonStackable: !!c.non_stackable,
      maxUsesGlobal: c.max_uses_global === null ? null : Number(c.max_uses_global),
      isActive: !!c.is_active,
      uses: redemptions.length,
      totalDiscount,
    };
  });
  return ok(rows);
}

const couponBase = z.object({
  code: z.string().trim().min(3).max(40).regex(/^[A-Za-z0-9_-]+$/, 'Solo letras, números, guiones.'),
  // 'free' = cubre el 100% y NO pasa por Stripe (el checkout emite la eSIM directo).
  discountType: z.enum(['percentage', 'fixed', 'free']),
  discountValue: z.number().min(0).max(100000).default(0),
  minPurchase: z.number().min(0).max(100000).nullable().optional(),
  applicablePlanIds: z.array(z.string().uuid()).max(200).optional(),
  startsAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  singleUsePerAccount: z.boolean().default(false),
  singleUseGlobal: z.boolean().default(false),
  nonStackable: z.boolean().default(false),
  maxUsesGlobal: z.number().int().positive().max(1000000).nullable().optional(),
});

/** % nunca > 100; el valor solo es obligatorio para % y fijo (free lo ignora). */
const valueOk = (d: { discountType: string; discountValue: number }) =>
  d.discountType === 'free' || d.discountValue > 0;
const valueMsg = { message: 'El descuento debe ser mayor a 0.', path: ['discountValue'] };
const percentageOk = (d: { discountType: string; discountValue: number }) =>
  d.discountType !== 'percentage' || d.discountValue <= 100;
const percentageMsg = { message: 'El descuento por porcentaje no puede superar 100%.', path: ['discountValue'] };

const couponSchema = couponBase.refine(valueOk, valueMsg).refine(percentageOk, percentageMsg);
const couponUpdateSchema = couponBase.extend({ id: z.string().uuid() }).refine(valueOk, valueMsg).refine(percentageOk, percentageMsg);

export type CouponInput = z.input<typeof couponSchema>;

function toRow(d: z.infer<typeof couponSchema>) {
  return {
    code: d.code.toUpperCase(),
    discount_type: d.discountType,
    discount_value: d.discountType === 'free' ? 0 : d.discountValue,
    min_purchase_amount: d.minPurchase ?? null,
    applicable_plan_ids: d.applicablePlanIds && d.applicablePlanIds.length > 0 ? d.applicablePlanIds : null,
    starts_at: d.startsAt ?? null,
    expires_at: d.expiresAt ?? null,
    single_use_per_account: d.singleUsePerAccount,
    single_use_global: d.singleUseGlobal,
    non_stackable: d.nonStackable,
    max_uses_global: d.maxUsesGlobal ?? null,
  };
}

export async function createCoupon(input: CouponInput): Promise<Result<{ id: string }>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const parsed = parseInput(couponSchema, input);
  if (!parsed.ok) return parsed;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('coupon').insert(toRow(parsed.data)).select('id').single();
  if (error || !data) {
    if (error?.code === '23505') return err(ErrorCodes.CONFLICT, 'Ya existe un cupón con ese código.');
    logger.error('createCoupon falló', { error: error?.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos crear el cupón.');
  }
  await supabase.rpc('log_admin_action', { p_action: 'coupon_create', p_payload: { coupon_id: data.id, code: parsed.data.code } });
  return ok({ id: data.id });
}

export async function updateCoupon(input: CouponInput & { id: string }): Promise<Result<{ id: string }>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const parsed = parseInput(couponUpdateSchema, input);
  if (!parsed.ok) return parsed;

  const supabase = await createSupabaseServerClient();
  const { id, ...rest } = parsed.data;
  const { error } = await supabase.from('coupon').update(toRow(rest)).eq('id', id);
  if (error) {
    if (error.code === '23505') return err(ErrorCodes.CONFLICT, 'Ya existe un cupón con ese código.');
    logger.error('updateCoupon falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos actualizar el cupón.');
  }
  await supabase.rpc('log_admin_action', { p_action: 'coupon_update', p_payload: { coupon_id: id } });
  return ok({ id });
}

const toggleSchema = z.object({ id: z.string().uuid(), isActive: z.boolean() });

export async function setCouponActive(input: { id: string; isActive: boolean }): Promise<Result<{ isActive: boolean }>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const parsed = parseInput(toggleSchema, input);
  if (!parsed.ok) return parsed;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('coupon').update({ is_active: parsed.data.isActive }).eq('id', parsed.data.id);
  if (error) {
    logger.error('setCouponActive falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos cambiar el estado del cupón.');
  }
  await supabase.rpc('log_admin_action', {
    p_action: 'coupon_set_active',
    p_payload: { coupon_id: parsed.data.id, is_active: parsed.data.isActive },
  });
  revalidatePath('/admin/coupons');
  return ok({ isActive: parsed.data.isActive });
}
