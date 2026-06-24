'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { err, ok, type Result } from '../types/result';
import { ErrorCodes } from '../lib/errors';
import { parseInput } from '../lib/validation';
import { logger } from '../lib/logger';
import { createSupabaseServerClient } from '../db/supabase-server';
import { requireSuperAdmin } from '../lib/admin-guard';

/**
 * Configuración global (solo super_admin). Settings persistidos en
 * platform_settings (el margen default y el umbral los lee sync-catalog) y
 * gestión de cuentas admin vía RPCs SECURITY DEFINER con candados.
 */

export interface PlatformSettings {
  defaultMarginPct: number;
  wholesaleMarginPct: number;
  priceAlertThresholdPct: number;
  commissionL1Pct: number;
  commissionL2Pct: number;
  minWithdrawalUsd: number;
}

export interface AdminAccount {
  userId: string;
  email: string;
  fullName: string | null;
  subRole: 'super_admin' | 'support_agent';
  isSelf: boolean;
}

function mapSettings(d: Record<string, unknown>): PlatformSettings {
  return {
    defaultMarginPct: Number(d.default_margin_pct ?? 0),
    wholesaleMarginPct: Number(d.wholesale_margin_pct ?? 0),
    priceAlertThresholdPct: Number(d.price_alert_threshold_pct ?? 0),
    commissionL1Pct: Number(d.commission_l1_pct ?? 0),
    commissionL2Pct: Number(d.commission_l2_pct ?? 0),
    minWithdrawalUsd: Number(d.min_withdrawal_usd ?? 0),
  };
}

export async function getSettings(): Promise<Result<PlatformSettings>> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('platform_settings').select('*').eq('id', 1).maybeSingle();
  if (error || !data) {
    logger.error('getSettings falló', { error: error?.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos cargar la configuración.');
  }
  return ok(mapSettings(data));
}

const settingsSchema = z.object({
  defaultMarginPct: z.number().min(0).max(1000),
  wholesaleMarginPct: z.number().min(0).max(1000),
  priceAlertThresholdPct: z.number().min(0).max(100),
  commissionL1Pct: z.number().min(0).max(100),
  commissionL2Pct: z.number().min(0).max(100),
  minWithdrawalUsd: z.number().min(0).max(100000),
});

export async function updateSettings(input: PlatformSettings): Promise<Result<PlatformSettings>> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard;
  const parsed = parseInput(settingsSchema, input);
  if (!parsed.ok) return parsed;
  const s = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('platform_settings')
    .update({
      default_margin_pct: s.defaultMarginPct,
      wholesale_margin_pct: s.wholesaleMarginPct,
      price_alert_threshold_pct: s.priceAlertThresholdPct,
      commission_l1_pct: s.commissionL1Pct,
      commission_l2_pct: s.commissionL2Pct,
      min_withdrawal_usd: s.minWithdrawalUsd,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1);
  if (error) {
    logger.error('updateSettings falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos guardar la configuración.');
  }
  await supabase.rpc('log_admin_action', { p_action: 'settings_update', p_payload: {} });
  return ok(s);
}

// ── Política de precios (markup por tramos + FX + redondeo) ──────────────────

export interface PricingTier {
  maxCostEur: number | null;
  multiplier: number;
}
export interface PricingPolicy {
  eurUsdRate: number;
  roundPsychological: boolean;
  tiers: PricingTier[];
}

export async function getPricingPolicy(): Promise<Result<PricingPolicy>> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard;
  const supabase = await createSupabaseServerClient();
  const [{ data: s }, { data: tiers }] = await Promise.all([
    supabase.from('platform_settings').select('eur_usd_rate, round_psychological').eq('id', 1).maybeSingle(),
    supabase.from('pricing_tier').select('max_cost_eur, multiplier, sort_order').order('sort_order'),
  ]);
  return ok({
    eurUsdRate: Number(s?.eur_usd_rate ?? 1.135),
    roundPsychological: s?.round_psychological ?? true,
    tiers: (tiers ?? []).map((t) => ({
      maxCostEur: t.max_cost_eur === null ? null : Number(t.max_cost_eur),
      multiplier: Number(t.multiplier),
    })),
  });
}

const policySchema = z.object({
  eurUsdRate: z.number().min(0.1).max(10),
  roundPsychological: z.boolean(),
  tiers: z
    .array(z.object({ maxCostEur: z.number().min(0).max(100000).nullable(), multiplier: z.number().min(1).max(20) }))
    .min(1)
    .max(20),
});

/** Actualiza la política (FX + redondeo + tramos). Reemplaza los tramos. Solo super_admin. */
export async function updatePricingPolicy(input: PricingPolicy): Promise<Result<null>> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard;
  const parsed = parseInput(policySchema, input);
  if (!parsed.ok) return parsed;
  const supabase = await createSupabaseServerClient();

  const { error: e1 } = await supabase
    .from('platform_settings')
    .update({ eur_usd_rate: parsed.data.eurUsdRate, round_psychological: parsed.data.roundPsychological, updated_at: new Date().toISOString() })
    .eq('id', 1);
  if (e1) {
    logger.error('updatePricingPolicy (settings) falló', { error: e1.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos guardar la política.');
  }

  // Reemplazar los tramos (el orden lo da el índice).
  const { error: eDel } = await supabase.from('pricing_tier').delete().gte('multiplier', 0);
  if (eDel) {
    logger.error('updatePricingPolicy (delete tiers) falló', { error: eDel.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos actualizar los tramos.');
  }
  const rows = parsed.data.tiers.map((t, i) => ({ max_cost_eur: t.maxCostEur, multiplier: t.multiplier, sort_order: i + 1 }));
  const { error: eIns } = await supabase.from('pricing_tier').insert(rows);
  if (eIns) {
    logger.error('updatePricingPolicy (insert tiers) falló', { error: eIns.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos guardar los tramos.');
  }

  await supabase.rpc('log_admin_action', { p_action: 'pricing_policy_update', p_payload: {} });
  return ok(null);
}

/** Re-dispara el cálculo de precios en TODOS los planes (tras cambiar la política). */
export async function recalcPrices(): Promise<Result<{ updated: number }>> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('plan_pricing')
    .update({ updated_at: new Date().toISOString() })
    .gte('id', '00000000-0000-0000-0000-000000000000')
    .select('plan_id');
  if (error) {
    logger.error('recalcPrices falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos recalcular los precios.');
  }
  await supabase.rpc('log_admin_action', { p_action: 'prices_recalc', p_payload: { count: data?.length ?? 0 } });
  revalidatePath('/');
  return ok({ updated: data?.length ?? 0 });
}

export async function getAdmins(): Promise<Result<AdminAccount[]>> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard;
  const selfId = guard.data.userId;

  const supabase = await createSupabaseServerClient();
  const { data: admins, error } = await supabase.from('admin_profile').select('user_id, sub_role');
  if (error) {
    logger.error('getAdmins falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos cargar los administradores.');
  }
  const ids = (admins ?? []).map((a) => a.user_id as string);
  const { data: profiles } = ids.length
    ? await supabase.from('user_profile').select('id, email, full_name').in('id', ids)
    : { data: [] as Array<{ id: string; email: string; full_name: string | null }> };
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

  const rows: AdminAccount[] = (admins ?? []).map((a) => {
    const p = byId.get(a.user_id as string);
    return {
      userId: a.user_id as string,
      email: p?.email ?? '—',
      fullName: p?.full_name ?? null,
      subRole: a.sub_role as 'super_admin' | 'support_agent',
      isSelf: a.user_id === selfId,
    };
  });
  rows.sort((x, y) =>
    x.subRole === y.subRole ? x.email.localeCompare(y.email) : x.subRole === 'super_admin' ? -1 : 1,
  );
  return ok(rows);
}

const subRoleEnum = z.enum(['super_admin', 'support_agent']);

async function callAdminRpc(
  fn: 'admin_set_admin_sub_role' | 'admin_revoke_admin',
  args: Record<string, unknown>,
  action: string,
): Promise<Result<null>> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard;
  const supabase = await createSupabaseServerClient();
  // deno-lint-ignore no-explicit-any
  const { data, error } = await supabase.rpc(fn as never, args as never);
  if (error) {
    logger.error(`${fn} falló`, { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos completar la acción.');
  }
  const r = data as { ok: boolean; reason?: string };
  if (!r?.ok) return err(ErrorCodes.VALIDATION, r?.reason ?? 'No se pudo completar la acción.');
  await supabase.rpc('log_admin_action', { p_action: action, p_payload: args as Record<string, never> });
  return ok(null);
}

const grantSchema = z.object({ email: z.string().trim().email().max(120), subRole: subRoleEnum });

export async function grantAdmin(input: { email: string; subRole: 'super_admin' | 'support_agent' }): Promise<Result<null>> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard;
  const parsed = parseInput(grantSchema, input);
  if (!parsed.ok) return parsed;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_grant_admin', {
    p_email: parsed.data.email,
    p_sub_role: parsed.data.subRole,
  });
  if (error) {
    logger.error('grantAdmin falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos agregar el administrador.');
  }
  const r = data as { ok: boolean; reason?: string };
  if (!r?.ok) return err(ErrorCodes.VALIDATION, r?.reason ?? 'No se pudo agregar.');
  await supabase.rpc('log_admin_action', { p_action: 'admin_grant', p_payload: { email: parsed.data.email, sub_role: parsed.data.subRole } });
  return ok(null);
}

const setRoleSchema = z.object({ userId: z.string().uuid(), subRole: subRoleEnum });

export async function setAdminSubRole(input: { userId: string; subRole: 'super_admin' | 'support_agent' }): Promise<Result<null>> {
  const parsed = parseInput(setRoleSchema, input);
  if (!parsed.ok) return parsed;
  return callAdminRpc('admin_set_admin_sub_role', { p_user_id: parsed.data.userId, p_sub_role: parsed.data.subRole }, 'admin_sub_role_update');
}

const revokeSchema = z.object({ userId: z.string().uuid() });

export async function revokeAdmin(input: { userId: string }): Promise<Result<null>> {
  const parsed = parseInput(revokeSchema, input);
  if (!parsed.ok) return parsed;
  return callAdminRpc('admin_revoke_admin', { p_user_id: parsed.data.userId }, 'admin_revoke');
}
