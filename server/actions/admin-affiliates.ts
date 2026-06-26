'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { err, ok, type Result } from '../types/result';
import { ErrorCodes } from '../lib/errors';
import { parseInput } from '../lib/validation';
import { logger } from '../lib/logger';
import { createSupabaseServerClient } from '../db/supabase-server';
import { requireAdmin, requireSuperAdmin } from '../lib/admin-guard';

/**
 * Gestión de afiliados (admin). El listado con finanzas es super_admin (las
 * comisiones son datos financieros); el cambio de estado lo hace cualquier admin
 * vía RPC admin_set_affiliate_status (que genera link + cupón al aprobar).
 */

export interface AdminAffiliateRow {
  id: string;
  name: string;
  email: string;
  channel: string | null;
  audience: number | null;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  sales: number;
  pendingCommission: number;
  paidCommission: number;
  referralLink: string | null;
  couponCode: string | null;
  createdAt: string | null;
}

export async function getAffiliatesAdmin(): Promise<Result<AdminAffiliateRow[]>> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard;
  const supabase = await createSupabaseServerClient();

  const [{ data: profiles, error: pErr }, { data: comms }, { data: orders }] = await Promise.all([
    supabase
      .from('affiliate_profile')
      .select('id, channel, estimated_audience, status, referral_link, coupon_code, created_at, user_profile:user_id(email, full_name)')
      .order('created_at', { ascending: false }),
    supabase.from('commission_movement').select('affiliate_profile_id, amount, status'),
    supabase.from('order').select('affiliate_profile_id').not('affiliate_profile_id', 'is', null),
  ]);

  if (pErr) {
    logger.error('getAffiliatesAdmin falló', { error: pErr.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos cargar los afiliados.');
  }

  const availableBy = new Map<string, number>();
  const paidBy = new Map<string, number>();
  for (const c of comms ?? []) {
    const id = c.affiliate_profile_id as string;
    const amt = Number(c.amount ?? 0);
    if (c.status === 'available') availableBy.set(id, (availableBy.get(id) ?? 0) + amt);
    else if (c.status === 'paid') paidBy.set(id, (paidBy.get(id) ?? 0) + amt);
  }
  const salesBy = new Map<string, number>();
  for (const o of orders ?? []) {
    const id = o.affiliate_profile_id as string;
    salesBy.set(id, (salesBy.get(id) ?? 0) + 1);
  }

  const rows: AdminAffiliateRow[] = (profiles ?? []).map((p) => {
    const up = Array.isArray(p.user_profile) ? p.user_profile[0] : p.user_profile;
    return {
      id: p.id,
      name: up?.full_name ?? '—',
      email: up?.email ?? '—',
      channel: p.channel,
      audience: p.estimated_audience === null ? null : Number(p.estimated_audience),
      status: (p.status ?? 'pending') as AdminAffiliateRow['status'],
      sales: salesBy.get(p.id) ?? 0,
      pendingCommission: Math.round((availableBy.get(p.id) ?? 0) * 100) / 100,
      paidCommission: Math.round((paidBy.get(p.id) ?? 0) * 100) / 100,
      referralLink: p.referral_link,
      couponCode: p.coupon_code,
      createdAt: p.created_at,
    };
  });
  return ok(rows);
}

const statusSchema = z.object({
  affiliateId: z.string().uuid(),
  status: z.enum(['pending', 'approved', 'rejected', 'suspended']),
});

/** Aprobar/suspender/reactivar/rechazar un afiliado. Genera link+cupón al aprobar. */
export async function setAffiliateStatus(input: {
  affiliateId: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
}): Promise<Result<{ status: string }>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const parsed = parseInput(statusSchema, input);
  if (!parsed.ok) return parsed;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_set_affiliate_status' as never, {
    p_affiliate_id: parsed.data.affiliateId,
    p_status: parsed.data.status,
  } as never);
  if (error) {
    logger.error('setAffiliateStatus falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos actualizar el afiliado.');
  }
  const r = data as { ok?: boolean; reason?: string } | null;
  if (!r?.ok) return err(ErrorCodes.VALIDATION, r?.reason ?? 'No se pudo actualizar.');

  revalidatePath('/admin/affiliates');
  return ok({ status: parsed.data.status });
}
