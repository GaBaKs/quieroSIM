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
  /** Descuento default de los cupones de afiliado nuevos (%). */
  affiliateCouponDiscountPct: number;
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
    affiliateCouponDiscountPct: Number(d.affiliate_coupon_discount_pct ?? 10),
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
  affiliateCouponDiscountPct: z.number().min(0).max(100),
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
      affiliate_coupon_discount_pct: s.affiliateCouponDiscountPct,
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

// ── Política de precios: grupos de país (competencia + piso + rangos) ─────────
// Precio auto = MAX(competencia×(1−desc%), costo×(1+piso%)); si uno está vacío,
// el otro; si faltan ambos, rango de margen por costo; si no, fallback. La
// resolución vive en el trigger calculate_plan_pricing; acá solo se edita la config.

export interface GroupCompetitorRow {
  id: string;
  isUnlimited: boolean;
  dataAmount: string;
  durationDays: number;
  competitorUsd: number | null;
  label: string;
}
export interface GroupMarginRange {
  id: string;
  minCostEur: number;
  maxCostEur: number | null;
  marginPct: number;
}
export interface PricingGroup {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean;
  floorMarkupPct: number | null;
  competitorDiscountPct: number | null;
  useCompetitorTable: boolean;
  featureUnlimited: boolean;
  members: string[];
  competitorRows: GroupCompetitorRow[];
  marginRanges: GroupMarginRange[];
}
export interface PricingPolicy {
  eurUsdRate: number;
  roundPsychological: boolean;
  groups: PricingGroup[];
}

/** Los 11 arquetipos (8 por-GB + 3 ilimitados) que llevan precio de competencia. */
const ARCHETYPES: Array<{ is_unlimited: boolean; data_amount: string; duration_days: number; label: string; sort_order: number }> = [
  { is_unlimited: false, data_amount: '0.49', duration_days: 1, label: '0,49 GB / 1 día', sort_order: 1 },
  { is_unlimited: false, data_amount: '1', duration_days: 7, label: '1 GB / 7 días', sort_order: 2 },
  { is_unlimited: false, data_amount: '3', duration_days: 7, label: '3 GB / 7 días', sort_order: 3 },
  { is_unlimited: false, data_amount: '5', duration_days: 15, label: '5 GB / 15 días', sort_order: 4 },
  { is_unlimited: false, data_amount: '10', duration_days: 30, label: '10 GB / 30 días', sort_order: 5 },
  { is_unlimited: false, data_amount: '15', duration_days: 30, label: '15 GB / 30 días', sort_order: 6 },
  { is_unlimited: false, data_amount: '20', duration_days: 30, label: '20 GB / 30 días', sort_order: 7 },
  { is_unlimited: false, data_amount: '30', duration_days: 30, label: '30 GB / 30 días', sort_order: 8 },
  { is_unlimited: true, data_amount: 'NaN', duration_days: 7, label: 'Ilimitado 7 días', sort_order: 9 },
  { is_unlimited: true, data_amount: 'NaN', duration_days: 15, label: 'Ilimitado 15 días', sort_order: 10 },
  { is_unlimited: true, data_amount: 'NaN', duration_days: 30, label: 'Ilimitado 30 días', sort_order: 11 },
];

export async function getPricingPolicy(): Promise<Result<PricingPolicy>> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard;
  const supabase = await createSupabaseServerClient();
  const [{ data: s }, { data: groups }, { data: members }, { data: comp }, { data: ranges }] = await Promise.all([
    supabase.from('platform_settings').select('eur_usd_rate, round_psychological').eq('id', 1).maybeSingle(),
    supabase.from('country_group').select('*').order('sort_order'),
    supabase.from('country_group_member').select('iso_country, group_id'),
    supabase.from('group_competitor_price').select('*').order('sort_order'),
    supabase.from('group_margin_range').select('*').order('sort_order'),
  ]);

  const membersBy = new Map<string, string[]>();
  (members ?? []).forEach((m) => {
    const arr = membersBy.get(m.group_id) ?? [];
    arr.push(m.iso_country);
    membersBy.set(m.group_id, arr);
  });
  const compBy = new Map<string, GroupCompetitorRow[]>();
  (comp ?? []).forEach((c) => {
    const arr = compBy.get(c.group_id) ?? [];
    arr.push({
      id: c.id, isUnlimited: c.is_unlimited, dataAmount: c.data_amount, durationDays: c.duration_days,
      competitorUsd: c.competitor_usd === null ? null : Number(c.competitor_usd), label: c.label ?? '',
    });
    compBy.set(c.group_id, arr);
  });
  const rangesBy = new Map<string, GroupMarginRange[]>();
  (ranges ?? []).forEach((r) => {
    const arr = rangesBy.get(r.group_id) ?? [];
    arr.push({ id: r.id, minCostEur: Number(r.min_cost_eur), maxCostEur: r.max_cost_eur === null ? null : Number(r.max_cost_eur), marginPct: Number(r.margin_pct) });
    rangesBy.set(r.group_id, arr);
  });

  return ok({
    eurUsdRate: Number(s?.eur_usd_rate ?? 1.135),
    roundPsychological: s?.round_psychological ?? true,
    groups: (groups ?? []).map((g) => ({
      id: g.id, name: g.name, slug: g.slug, isDefault: g.is_default,
      floorMarkupPct: g.floor_markup_pct === null ? null : Number(g.floor_markup_pct),
      competitorDiscountPct: g.competitor_discount_pct === null ? null : Number(g.competitor_discount_pct),
      useCompetitorTable: g.use_competitor_table, featureUnlimited: g.feature_unlimited,
      members: (membersBy.get(g.id) ?? []).sort(),
      competitorRows: compBy.get(g.id) ?? [],
      marginRanges: rangesBy.get(g.id) ?? [],
    })),
  });
}

const globalsSchema = z.object({ eurUsdRate: z.number().min(0.1).max(10), roundPsychological: z.boolean() });

/** Tipo de cambio EUR→USD + redondeo psicológico. Solo super_admin. */
export async function updatePricingGlobals(input: { eurUsdRate: number; roundPsychological: boolean }): Promise<Result<null>> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard;
  const parsed = parseInput(globalsSchema, input);
  if (!parsed.ok) return parsed;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('platform_settings')
    .update({ eur_usd_rate: parsed.data.eurUsdRate, round_psychological: parsed.data.roundPsychological, updated_at: new Date().toISOString() })
    .eq('id', 1);
  if (error) {
    logger.error('updatePricingGlobals falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos guardar el tipo de cambio.');
  }
  await supabase.rpc('log_admin_action', { p_action: 'pricing_globals_update', p_payload: {} });
  return ok(null);
}

const groupSchema = z.object({
  id: z.string().uuid(),
  floorMarkupPct: z.number().min(0).max(1000).nullable(),
  competitorDiscountPct: z.number().min(0).max(100).nullable(),
  useCompetitorTable: z.boolean(),
  featureUnlimited: z.boolean(),
});

/** Guarda piso/descuento/flags de un grupo. Solo super_admin. */
export async function saveGroup(input: {
  id: string; floorMarkupPct: number | null; competitorDiscountPct: number | null; useCompetitorTable: boolean; featureUnlimited: boolean;
}): Promise<Result<null>> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard;
  const parsed = parseInput(groupSchema, input);
  if (!parsed.ok) return parsed;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('country_group')
    .update({
      floor_markup_pct: parsed.data.floorMarkupPct,
      competitor_discount_pct: parsed.data.competitorDiscountPct,
      use_competitor_table: parsed.data.useCompetitorTable,
      feature_unlimited: parsed.data.featureUnlimited,
    })
    .eq('id', parsed.data.id);
  if (error) {
    logger.error('saveGroup falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos guardar el grupo.');
  }
  await supabase.rpc('log_admin_action', { p_action: 'pricing_group_update', p_payload: { group_id: parsed.data.id } });
  return ok(null);
}

const createGroupSchema = z.object({ name: z.string().trim().min(2).max(60) });

/** Crea un grupo nuevo (con los 11 arquetipos vacíos para cargar). Solo super_admin. */
export async function createGroup(input: { name: string }): Promise<Result<{ id: string }>> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard;
  const parsed = parseInput(createGroupSchema, input);
  if (!parsed.ok) return parsed;
  const supabase = await createSupabaseServerClient();
  const slug =
    parsed.data.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'grupo';
  const { data: grp, error } = await supabase
    .from('country_group')
    .insert({ name: parsed.data.name, slug, is_default: false, floor_markup_pct: 40, competitor_discount_pct: 10, use_competitor_table: true, feature_unlimited: true, sort_order: 99 })
    .select('id')
    .single();
  if (error || !grp) {
    logger.error('createGroup falló', { error: error?.message });
    return err(ErrorCodes.VALIDATION, 'No pudimos crear el grupo (¿nombre repetido?).');
  }
  await supabase.from('group_competitor_price').insert(ARCHETYPES.map((a) => ({ ...a, group_id: grp.id, competitor_usd: null })));
  await supabase.rpc('log_admin_action', { p_action: 'pricing_group_create', p_payload: { group_id: grp.id } });
  return ok({ id: grp.id });
}

const idSchema = z.object({ id: z.string().uuid() });

/** Borra un grupo (no el default). Sus miembros vuelven al default. Solo super_admin. */
export async function deleteGroup(input: { id: string }): Promise<Result<null>> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard;
  const parsed = parseInput(idSchema, input);
  if (!parsed.ok) return parsed;
  const supabase = await createSupabaseServerClient();
  const { data: g } = await supabase.from('country_group').select('is_default').eq('id', parsed.data.id).maybeSingle();
  if (g?.is_default) return err(ErrorCodes.VALIDATION, 'No se puede borrar el grupo default.');
  const { error } = await supabase.from('country_group').delete().eq('id', parsed.data.id);
  if (error) {
    logger.error('deleteGroup falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos borrar el grupo.');
  }
  await supabase.rpc('log_admin_action', { p_action: 'pricing_group_delete', p_payload: { group_id: parsed.data.id } });
  return ok(null);
}

const compRowsSchema = z.object({
  groupId: z.string().uuid(),
  rows: z.array(z.object({ id: z.string().uuid(), competitorUsd: z.number().min(0).max(100000).nullable() })).max(50),
});

/** Guarda los precios de competencia de un grupo. Solo super_admin. */
export async function saveGroupCompetitorRows(input: { groupId: string; rows: Array<{ id: string; competitorUsd: number | null }> }): Promise<Result<null>> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard;
  const parsed = parseInput(compRowsSchema, input);
  if (!parsed.ok) return parsed;
  const supabase = await createSupabaseServerClient();
  for (const r of parsed.data.rows) {
    const { error } = await supabase.from('group_competitor_price').update({ competitor_usd: r.competitorUsd }).eq('id', r.id).eq('group_id', parsed.data.groupId);
    if (error) {
      logger.error('saveGroupCompetitorRows falló', { error: error.message });
      return err(ErrorCodes.INTERNAL, 'No pudimos guardar los precios de competencia.');
    }
  }
  await supabase.rpc('log_admin_action', { p_action: 'pricing_competitor_update', p_payload: { group_id: parsed.data.groupId } });
  return ok(null);
}

const rangesSchema = z.object({
  groupId: z.string().uuid(),
  ranges: z.array(z.object({ minCostEur: z.number().min(0).max(100000), maxCostEur: z.number().min(0).max(100000).nullable(), marginPct: z.number().min(0).max(1000) })).max(30),
});

/** Reemplaza los rangos de margen por costo de un grupo. Solo super_admin. */
export async function saveGroupMarginRanges(input: { groupId: string; ranges: Array<{ minCostEur: number; maxCostEur: number | null; marginPct: number }> }): Promise<Result<null>> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard;
  const parsed = parseInput(rangesSchema, input);
  if (!parsed.ok) return parsed;
  const supabase = await createSupabaseServerClient();
  const { error: eDel } = await supabase.from('group_margin_range').delete().eq('group_id', parsed.data.groupId);
  if (eDel) {
    logger.error('saveGroupMarginRanges (delete) falló', { error: eDel.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos actualizar los rangos.');
  }
  if (parsed.data.ranges.length) {
    const rows = parsed.data.ranges.map((r, i) => ({ group_id: parsed.data.groupId, min_cost_eur: r.minCostEur, max_cost_eur: r.maxCostEur, margin_pct: r.marginPct, sort_order: i + 1 }));
    const { error: eIns } = await supabase.from('group_margin_range').insert(rows);
    if (eIns) {
      logger.error('saveGroupMarginRanges (insert) falló', { error: eIns.message });
      return err(ErrorCodes.INTERNAL, 'No pudimos guardar los rangos.');
    }
  }
  await supabase.rpc('log_admin_action', { p_action: 'pricing_ranges_update', p_payload: { group_id: parsed.data.groupId } });
  return ok(null);
}

const addCountrySchema = z.object({ groupId: z.string().uuid(), iso: z.string().trim().length(2) });

/** Asigna un país (ISO2) a un grupo (lo saca de cualquier otro). Solo super_admin. */
export async function addCountryToGroup(input: { groupId: string; iso: string }): Promise<Result<null>> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard;
  const parsed = parseInput(addCountrySchema, input);
  if (!parsed.ok) return parsed;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('country_group_member')
    .upsert({ iso_country: parsed.data.iso.toUpperCase(), group_id: parsed.data.groupId }, { onConflict: 'iso_country' });
  if (error) {
    logger.error('addCountryToGroup falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos asignar el país.');
  }
  await supabase.rpc('log_admin_action', { p_action: 'pricing_country_assign', p_payload: { group_id: parsed.data.groupId, iso: parsed.data.iso.toUpperCase() } });
  return ok(null);
}

const removeCountrySchema = z.object({ iso: z.string().trim().length(2) });

/** Quita un país de su grupo (vuelve al default). Solo super_admin. */
export async function removeCountryFromGroup(input: { iso: string }): Promise<Result<null>> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard;
  const parsed = parseInput(removeCountrySchema, input);
  if (!parsed.ok) return parsed;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('country_group_member').delete().eq('iso_country', parsed.data.iso.toUpperCase());
  if (error) {
    logger.error('removeCountryFromGroup falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos quitar el país.');
  }
  await supabase.rpc('log_admin_action', { p_action: 'pricing_country_unassign', p_payload: { iso: parsed.data.iso.toUpperCase() } });
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
