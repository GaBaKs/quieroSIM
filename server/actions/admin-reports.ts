'use server';

import { err, ok, type Result } from '../types/result';
import { ErrorCodes } from '../lib/errors';
import { logger } from '../lib/logger';
import { createSupabaseServerClient } from '../db/supabase-server';
import { requireSuperAdmin } from '../lib/admin-guard';

/**
 * Reportes del panel admin (Fase 11 parcial): ventas, finanzas y reembolsos.
 * Datos REALES de las órdenes vía RPC (security definer + guard is_admin).
 * Solo super_admin (es financiero, consistente con el Sidebar superAdminOnly).
 * Finanzas = ingresos/reembolsos/neto exactos, SIN costo/margen.
 */

export interface SalesBucket {
  month: string;
  units: number;
  revenue: number;
}
export interface CountryBucket {
  country: string;
  units: number;
  revenue: number;
}
export interface SalesReport {
  byMonth: SalesBucket[];
  byCountry: CountryBucket[];
}

export interface FinancePoint {
  month: string;
  income: number;
  refunds: number;
  net: number;
}

export interface RefundRow {
  orderId: string;
  customer: string;
  amount: number;
  refundedAt: string;
  adminEmail: string;
}

export async function getSalesReport(days = 180): Promise<Result<SalesReport>> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_sales_report', { p_days: days });
  if (error || !data) {
    logger.error('getSalesReport falló', { error: error?.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos cargar el reporte de ventas.');
  }
  const d = data as { by_month?: unknown[]; by_country?: unknown[] };
  return ok({
    byMonth: (d.by_month ?? []).map((r) => {
      const b = r as { month: string; units: number; revenue: number };
      return { month: b.month, units: Number(b.units), revenue: Number(b.revenue) };
    }),
    byCountry: (d.by_country ?? []).map((r) => {
      const b = r as { country: string; units: number; revenue: number };
      return { country: b.country, units: Number(b.units), revenue: Number(b.revenue) };
    }),
  });
}

export async function getFinanceReport(months = 6): Promise<Result<FinancePoint[]>> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_finance_report', { p_months: months });
  if (error || !data) {
    logger.error('getFinanceReport falló', { error: error?.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos cargar el reporte financiero.');
  }
  return ok(
    (data as unknown[]).map((r) => {
      const f = r as { month: string; income: number; refunds: number; net: number };
      return { month: f.month, income: Number(f.income), refunds: Number(f.refunds), net: Number(f.net) };
    }),
  );
}

export async function getRefundsReport(limit = 50): Promise<Result<RefundRow[]>> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_refunds_report', { p_limit: limit });
  if (error) {
    logger.error('getRefundsReport falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos cargar el reporte de reembolsos.');
  }
  return ok(
    (data ?? []).map((r: { order_id: string; customer: string; amount: number; refunded_at: string; admin_email: string }) => ({
      orderId: r.order_id,
      customer: r.customer,
      amount: Number(r.amount),
      refundedAt: r.refunded_at,
      adminEmail: r.admin_email,
    })),
  );
}
