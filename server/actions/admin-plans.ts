'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { err, ok, type Result } from '../types/result';
import type { TablesUpdate } from '../types/database';
import { ErrorCodes } from '../lib/errors';
import { parseInput } from '../lib/validation';
import { logger } from '../lib/logger';
import { createSupabaseServerClient } from '../db/supabase-server';
import { requireAdmin, requireSuperAdmin } from '../lib/admin-guard';

/**
 * Gestión de planes y precios. Lectura: cualquier admin (plan_prc_sel). Escritura
 * de precios/estado: SOLO super_admin (plan_prc_write_super + check en la action).
 * El trigger calculate_plan_pricing recalcula price_final; log_price_history
 * audita el cambio de precio automáticamente.
 */

export interface AdminPlanRow {
  id: string;
  name: string;
  countryRegion: string | null;
  dataAmount: string | null;
  durationDays: number | null;
  status: string;
  costEur: number | null;
  marginPct: number | null;
  priceFixed: number | null;
  useFixedPrice: boolean;
  priceFinal: number | null;
  isRecommended: boolean;
}

export async function getPlansAdmin(): Promise<Result<AdminPlanRow[]>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('plan')
    .select(
      'id, name, country_region, data_amount, duration_days, status, is_recommended, plan_pricing(cost_provider_eur, margin_pct, price_fixed, use_fixed_price, price_final)',
    )
    .order('name', { ascending: true });

  if (error) {
    logger.error('getPlansAdmin falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos cargar los planes.');
  }

  const rows: AdminPlanRow[] = (data ?? []).map((p) => {
    const pr = Array.isArray(p.plan_pricing) ? p.plan_pricing[0] : p.plan_pricing;
    return {
      id: p.id,
      name: p.name,
      countryRegion: p.country_region,
      dataAmount: p.data_amount,
      durationDays: p.duration_days,
      status: p.status ?? 'active',
      costEur: pr?.cost_provider_eur === undefined ? null : Number(pr.cost_provider_eur),
      marginPct: pr?.margin_pct === undefined ? null : Number(pr.margin_pct),
      priceFixed: pr?.price_fixed === undefined || pr?.price_fixed === null ? null : Number(pr.price_fixed),
      useFixedPrice: !!pr?.use_fixed_price,
      priceFinal: pr?.price_final === undefined || pr?.price_final === null ? null : Number(pr.price_final),
      isRecommended: !!p.is_recommended,
    };
  });
  return ok(rows);
}

const pricingSchema = z
  .object({
    planId: z.string().uuid(),
    marginPct: z.number().min(0).max(1000).optional(),
    priceFixed: z.number().min(0).max(100000).nullable().optional(),
    useFixedPrice: z.boolean(),
  })
  .refine((d) => !d.useFixedPrice || (d.priceFixed !== undefined && d.priceFixed !== null), {
    message: 'Con precio fijo activado tenés que indicar el precio.',
  });

export async function updatePlanPricing(input: {
  planId: string;
  marginPct?: number;
  priceFixed?: number | null;
  useFixedPrice: boolean;
}): Promise<Result<{ priceFinal: number }>> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard;
  const parsed = parseInput(pricingSchema, input);
  if (!parsed.ok) return parsed;
  const { planId, marginPct, priceFixed, useFixedPrice } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const patch: TablesUpdate<'plan_pricing'> = { use_fixed_price: useFixedPrice };
  if (marginPct !== undefined) patch.margin_pct = marginPct;
  if (priceFixed !== undefined) patch.price_fixed = priceFixed;

  // El trigger recalcula price_final; lo leemos de vuelta.
  const { data, error } = await supabase
    .from('plan_pricing')
    .update(patch)
    .eq('plan_id', planId)
    .select('price_final')
    .single();

  if (error || !data) {
    logger.error('updatePlanPricing falló', { error: error?.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos actualizar el precio.');
  }

  await supabase.rpc('log_admin_action', {
    p_action: 'plan_pricing_update',
    p_payload: { plan_id: planId, margin_pct: marginPct ?? null, price_fixed: priceFixed ?? null, use_fixed_price: useFixedPrice },
  });

  // Regenerar la landing al instante (el catálogo ISR muestra el precio nuevo).
  revalidatePath('/');
  return ok({ priceFinal: Number(data.price_final) });
}

const statusSchema = z.object({
  planId: z.string().uuid(),
  status: z.enum(['active', 'inactive']),
});

export async function setPlanStatus(input: { planId: string; status: 'active' | 'inactive' }): Promise<Result<{ status: string }>> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard;
  const parsed = parseInput(statusSchema, input);
  if (!parsed.ok) return parsed;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('plan').update({ status: parsed.data.status }).eq('id', parsed.data.planId);
  if (error) {
    logger.error('setPlanStatus falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos cambiar el estado del plan.');
  }

  await supabase.rpc('log_admin_action', {
    p_action: 'plan_status_update',
    p_payload: { plan_id: parsed.data.planId, status: parsed.data.status },
  });

  // Regenerar la landing al instante: un plan inactivo desaparece del catálogo
  // sin esperar la revalidación de 30 min (la seguridad ya la da el checkout).
  revalidatePath('/');
  return ok({ status: parsed.data.status });
}

const recommendedSchema = z.object({ planId: z.string().uuid(), value: z.boolean() });

/** Marca/desmarca un plan como "recomendado" (badge en la landing). Solo super_admin. */
export async function setPlanRecommended(input: { planId: string; value: boolean }): Promise<Result<{ value: boolean }>> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard;
  const parsed = parseInput(recommendedSchema, input);
  if (!parsed.ok) return parsed;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('plan').update({ is_recommended: parsed.data.value }).eq('id', parsed.data.planId);
  if (error) {
    logger.error('setPlanRecommended falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos actualizar el plan recomendado.');
  }

  await supabase.rpc('log_admin_action', {
    p_action: 'plan_recommended_update',
    p_payload: { plan_id: parsed.data.planId, value: parsed.data.value },
  });

  revalidatePath('/');
  return ok({ value: parsed.data.value });
}
