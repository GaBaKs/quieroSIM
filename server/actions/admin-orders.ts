'use server';

import { z } from 'zod';
import { err, ok, type Result } from '../types/result';
import { ErrorCodes } from '../lib/errors';
import { parseInput } from '../lib/validation';
import { logger } from '../lib/logger';
import { createSupabaseServerClient } from '../db/supabase-server';
import { requireAdmin, requireSuperAdmin } from '../lib/admin-guard';
import { callEdgeFunctionAuthed } from '../lib/edge';
import { sanitizePostgrestSearch } from '../lib/sanitize';

/**
 * Gestión de órdenes del admin. Lecturas con RLS de admin (ord_sel = is_admin);
 * reintento y refund vía Edge Functions (tocan provisión/Stripe).
 */

const ORDER_PAGE_SIZE = 20;

export interface AdminOrderRow {
  id: string;
  shortId: string;
  email: string | null;
  planName: string;
  pricePaid: number;
  currency: string;
  status: string;
  provisionState: string | null;
  hasEsim: boolean;
  createdAt: string | null;
}

export interface AdminOrderList {
  rows: AdminOrderRow[];
  page: number;
  pageSize: number;
  total: number;
}

const VALID_STATUSES = ['pending', 'paid', 'fulfilled', 'failed_needs_review', 'failed', 'refunded'] as const;

const listSchema = z.object({
  status: z.enum(VALID_STATUSES).optional(),
  search: z.string().trim().max(120).optional(),
  page: z.number().int().min(1).default(1),
});

export async function getOrders(input: {
  status?: string;
  search?: string;
  page?: number;
}): Promise<Result<AdminOrderList>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const parsed = parseInput(listSchema, input);
  if (!parsed.ok) return parsed;
  const { status, search, page } = parsed.data;

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('order')
    .select(
      'id, guest_email, price_paid, currency_sale, status, created_at, plan:plan_id(name), esim(id), provision_job(state)',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range((page - 1) * ORDER_PAGE_SIZE, page * ORDER_PAGE_SIZE - 1);

  if (status) query = query.eq('status', status);
  if (search) {
    // Búsqueda por email o por id. El email se sanea antes de interpolarlo en
    // el `.or()` (anti-inyección de filtro); el id va por isUuid (regex estricta).
    const s = sanitizePostgrestSearch(search);
    query = query.or(`guest_email.ilike.%${s}%,id.eq.${isUuid(search) ? search : ZERO_UUID}`);
  }

  const { data, error, count } = await query;
  if (error) {
    logger.error('getOrders falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos cargar las órdenes.');
  }

  const rows: AdminOrderRow[] = (data ?? []).map((o) => {
    const plan = Array.isArray(o.plan) ? o.plan[0] : o.plan;
    const job = Array.isArray(o.provision_job) ? o.provision_job[0] : o.provision_job;
    const esim = Array.isArray(o.esim) ? o.esim[0] : o.esim;
    return {
      id: o.id,
      shortId: o.id.slice(0, 8).toUpperCase(),
      email: o.guest_email,
      planName: plan?.name ?? '—',
      pricePaid: Number(o.price_paid),
      currency: o.currency_sale ?? 'USD',
      status: o.status ?? 'pending',
      provisionState: job?.state ?? null,
      hasEsim: !!esim,
      createdAt: o.created_at,
    };
  });

  return ok({ rows, page, pageSize: ORDER_PAGE_SIZE, total: count ?? rows.length });
}

export interface AdminOrderDetail extends AdminOrderRow {
  phone: string | null;
  paymentIntentId: string | null;
  lang: string;
  provisionHistory: Array<{ state?: string; note?: string; error?: string; at?: string }>;
  lastError: string | null;
  attemptCount: number;
  esim: { iccid: string | null; qrLpa: string | null; statusQr: string | null } | null;
  delivery: { status: string | null; sentAt: string | null; lastError: string | null } | null;
}

export async function getOrderDetail(orderId: string): Promise<Result<AdminOrderDetail>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  if (!isUuid(orderId)) return err(ErrorCodes.VALIDATION, 'Orden inválida.');

  const supabase = await createSupabaseServerClient();
  const { data: o, error } = await supabase
    .from('order')
    .select(
      'id, guest_email, guest_phone, price_paid, currency_sale, status, lang, created_at, stripe_payment_intent_id, plan:plan_id(name), provision_job(state, history, last_error, attempt_count), esim(id, iccid, qr_lpa, status_qr)',
    )
    .eq('id', orderId)
    .maybeSingle();

  if (error) {
    logger.error('getOrderDetail falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos cargar la orden.');
  }
  if (!o) return err(ErrorCodes.NOT_FOUND, 'Orden no encontrada.');

  const plan = Array.isArray(o.plan) ? o.plan[0] : o.plan;
  const job = Array.isArray(o.provision_job) ? o.provision_job[0] : o.provision_job;
  const esim = Array.isArray(o.esim) ? o.esim[0] : o.esim;

  let delivery: AdminOrderDetail['delivery'] = null;
  if (esim?.id) {
    const { data: qd } = await supabase
      .from('qr_delivery')
      .select('status, sent_at, last_error')
      .eq('esim_id', esim.id)
      .eq('channel', 'email')
      .maybeSingle();
    if (qd) delivery = { status: qd.status, sentAt: qd.sent_at, lastError: qd.last_error };
  }

  return ok({
    id: o.id,
    shortId: o.id.slice(0, 8).toUpperCase(),
    email: o.guest_email,
    phone: o.guest_phone,
    planName: plan?.name ?? '—',
    pricePaid: Number(o.price_paid),
    currency: o.currency_sale ?? 'USD',
    status: o.status ?? 'pending',
    lang: o.lang ?? 'ES',
    paymentIntentId: o.stripe_payment_intent_id,
    provisionState: job?.state ?? null,
    provisionHistory: Array.isArray(job?.history) ? (job.history as AdminOrderDetail['provisionHistory']) : [],
    lastError: job?.last_error ?? null,
    attemptCount: job?.attempt_count ?? 0,
    hasEsim: !!esim,
    esim: esim ? { iccid: esim.iccid, qrLpa: esim.qr_lpa, statusQr: esim.status_qr } : null,
    delivery,
    createdAt: o.created_at,
  });
}

const orderIdSchema = z.object({ orderId: z.string().uuid() });

/** Reintenta la provisión de una orden en failed_needs_review (cualquier admin). */
export async function retryProvision(input: { orderId: string }): Promise<Result<{ state: string }>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const parsed = parseInput(orderIdSchema, input);
  if (!parsed.ok) return parsed;
  return callEdgeFunctionAuthed<{ state: string }>('stripe-webhook/retry', { orderId: parsed.data.orderId });
}

/** Reembolsa una orden (SOLO super_admin). */
export async function refundOrder(input: { orderId: string }): Promise<Result<{ status: string; refundId?: string }>> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard;
  const parsed = parseInput(orderIdSchema, input);
  if (!parsed.ok) return parsed;
  return callEdgeFunctionAuthed<{ status: string; refundId?: string }>('stripe-webhook/refund', {
    orderId: parsed.data.orderId,
  });
}

// ── helpers ──────────────────────────────────────────────────────────────────
const ZERO_UUID = '00000000-0000-0000-0000-000000000000';
function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}
