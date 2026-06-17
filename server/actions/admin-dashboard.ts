'use server';

import { err, ok, type Result } from '../types/result';
import { ErrorCodes } from '../lib/errors';
import { requireEnv } from '../lib/env';
import { logger } from '../lib/logger';
import { createSupabaseServerClient } from '../db/supabase-server';
import { requireAdmin } from '../lib/admin-guard';

/**
 * Métricas del dashboard admin. Lecturas vía RPC (security definer con guard
 * is_admin) y salud del sistema vía Edge Function (toca los secretos de los
 * proveedores). Patrón Result<T>.
 */

export interface DashboardMetrics {
  salesToday: number;
  salesMonth: number;
  revenueTotal: number;
  ordersTotal: number;
  ordersToday: number;
  pendingReview: number;
}

export interface TopPlan {
  planId: string;
  name: string;
  units: number;
  revenue: number;
}

export interface SalesPoint {
  day: string;
  total: number;
}

export type HealthStatus = 'ok' | 'down' | 'not_configured';
export interface SystemHealth {
  stripe: HealthStatus;
  yesim: HealthStatus;
  resend: HealthStatus;
}

export async function getDashboardMetrics(): Promise<Result<DashboardMetrics>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_dashboard_metrics');
  if (error || !data) {
    logger.error('getDashboardMetrics falló', { error: error?.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos cargar las métricas.');
  }
  const m = data as Record<string, number>;
  return ok({
    salesToday: Number(m.sales_today ?? 0),
    salesMonth: Number(m.sales_month ?? 0),
    revenueTotal: Number(m.revenue_total ?? 0),
    ordersTotal: Number(m.orders_total ?? 0),
    ordersToday: Number(m.orders_today ?? 0),
    pendingReview: Number(m.pending_review ?? 0),
  });
}

export async function getTopPlans(limit = 5): Promise<Result<TopPlan[]>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_top_plans', { p_limit: limit });
  if (error) {
    logger.error('getTopPlans falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos cargar los planes más vendidos.');
  }
  return ok(
    (data ?? []).map((r: { plan_id: string; name: string; units: number; revenue: number }) => ({
      planId: r.plan_id,
      name: r.name,
      units: Number(r.units),
      revenue: Number(r.revenue),
    })),
  );
}

export async function getSalesSeries(days = 30): Promise<Result<SalesPoint[]>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_sales_series', { p_days: days });
  if (error) {
    logger.error('getSalesSeries falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos cargar la serie de ventas.');
  }
  return ok((data ?? []).map((r: { day: string; total: number }) => ({ day: r.day, total: Number(r.total) })));
}

export async function getSystemHealth(): Promise<Result<SystemHealth>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return err(ErrorCodes.UNAUTHORIZED, 'No hay una sesión activa.');

  const url = `${requireEnv('NEXT_PUBLIC_SUPABASE_URL')}/functions/v1/admin-health`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` },
      body: '{}',
    });
    const payload = (await response.json().catch(() => null)) as
      | { ok?: boolean; data?: SystemHealth }
      | null;
    if (!response.ok || !payload?.ok || !payload.data) {
      return err(ErrorCodes.PROVIDER_UNAVAILABLE, 'No pudimos consultar la salud del sistema.');
    }
    return ok(payload.data);
  } catch (e) {
    logger.error('getSystemHealth falló', { error: e instanceof Error ? e.message : String(e) });
    return err(ErrorCodes.PROVIDER_UNAVAILABLE, 'No pudimos consultar la salud del sistema.');
  }
}
