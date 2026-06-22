'use server';

import { z } from 'zod';
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
  storeName: string;
  supportEmail: string;
  defaultCurrency: string;
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
    storeName: (d.store_name as string) ?? '',
    supportEmail: (d.support_email as string) ?? '',
    defaultCurrency: (d.default_currency as string) ?? 'USD',
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
  storeName: z.string().trim().min(1).max(80),
  supportEmail: z.string().trim().email().max(120),
  defaultCurrency: z.enum(['USD', 'EUR', 'ARS']),
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
      store_name: s.storeName,
      support_email: s.supportEmail,
      default_currency: s.defaultCurrency,
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
