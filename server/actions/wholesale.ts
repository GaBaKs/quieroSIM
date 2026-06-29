'use server';

import { z } from 'zod';
import { err, ok, type Result } from '../types/result';
import { ErrorCodes } from '../lib/errors';
import { parseInput } from '../lib/validation';
import { logger } from '../lib/logger';
import { createSupabaseServerClient } from '../db/supabase-server';
import { requireAgency } from '../lib/admin-guard';
import { callEdgeFunctionAuthed } from '../lib/edge';

/** Nombre de la Edge de checkout mayorista. Prod 'wholesale-checkout' (Stripe live);
 *  en local con WHOLESALE_FN_NAME=wholesale-checkout-test apunta al espejo en test. */
const WHOLESALE_FN = process.env.WHOLESALE_FN_NAME ?? 'wholesale-checkout';

/**
 * Fachada del portal mayorista (lado agencia). El alta va por RPC SECURITY
 * DEFINER (register_agency); la aprobación la hace el admin. El front solo
 * conoce estas actions. Precio mayorista e inventario llegan en M2/M3/M4.
 */

export interface MyAgency {
  id: string;
  status: 'pending' | 'approved' | 'suspended';
  companyName: string;
  taxId: string | null;
  billingAddress: string | null;
  customMarginPct: number | null;
}

/** Perfil de agencia del usuario actual (o null si no es agencia). */
export async function getMyAgency(): Promise<Result<MyAgency | null>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err(ErrorCodes.UNAUTHORIZED, 'Iniciá sesión para ver tu portal mayorista.');

  const { data, error } = await supabase
    .from('agency_profile')
    .select('id, status, company_name, tax_id, billing_address, custom_margin_pct')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) {
    logger.error('getMyAgency falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos cargar tu portal.');
  }
  if (!data) return ok(null);
  return ok({
    id: data.id,
    status: data.status as MyAgency['status'],
    companyName: data.company_name,
    taxId: data.tax_id,
    billingAddress: data.billing_address,
    customMarginPct: data.custom_margin_pct === null ? null : Number(data.custom_margin_pct),
  });
}

const registerSchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  taxId: z.string().trim().max(60).optional(),
  billingAddress: z.string().trim().max(300).optional(),
});

/** Alta como agencia (queda pendiente de aprobación). */
export async function registerAgency(input: { companyName: string; taxId?: string; billingAddress?: string }): Promise<Result<{ agencyId: string }>> {
  const parsed = parseInput(registerSchema, input);
  if (!parsed.ok) return parsed;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err(ErrorCodes.UNAUTHORIZED, 'Iniciá sesión para registrar tu agencia.');

  const { data, error } = await supabase.rpc('register_agency' as never, {
    p_company_name: parsed.data.companyName,
    p_tax_id: parsed.data.taxId ?? null,
    p_billing_address: parsed.data.billingAddress ?? null,
  } as never);
  if (error) {
    logger.error('registerAgency falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos registrar tu solicitud.');
  }
  const r = data as { ok?: boolean; reason?: string; agencyId?: string } | null;
  if (!r?.ok) return err(ErrorCodes.VALIDATION, r?.reason ?? 'No pudimos registrar tu solicitud.');
  return ok({ agencyId: r.agencyId! });
}

export interface WholesalePlan {
  planId: string;
  name: string;
  isoCountry: string | null;
  countryRegion: string | null;
  durationDays: number | null;
  dataAmount: string | null;
  isFup: boolean;
  priceWholesale: number;
}

/** Catálogo a precio mayorista (con el margen de la agencia). Solo agencias aprobadas. */
export async function getWholesaleCatalog(): Promise<Result<WholesalePlan[]>> {
  const guard = await requireAgency();
  if (!guard.ok) return guard;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('wholesale_catalog' as never);
  if (error) {
    logger.error('getWholesaleCatalog falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos cargar el catálogo mayorista.');
  }
  const rows = (data ?? []) as Array<{
    plan_id: string; name: string; iso_country: string | null; country_region: string | null;
    duration_days: number | null; data_amount: string | null; is_fup: boolean | null; price_wholesale: number | string;
  }>;
  return ok(
    rows.map((r) => ({
      planId: r.plan_id,
      name: r.name,
      isoCountry: r.iso_country,
      countryRegion: r.country_region,
      durationDays: r.duration_days,
      dataAmount: r.data_amount,
      isFup: !!r.is_fup,
      priceWholesale: Number(r.price_wholesale),
    })),
  );
}

export interface WholesaleCheckoutSession {
  batchId: string;
  clientSecret: string;
  totalUsd: number;
  count: number;
}

const cartSchema = z.object({
  items: z.array(z.object({ planId: z.string().uuid(), qty: z.number().int().min(1).max(200) })).min(1).max(50),
});

/** Crea el lote + PaymentIntent por el total mayorista. Devuelve el clientSecret para pagar. */
export async function createWholesaleCheckout(input: { items: { planId: string; qty: number }[] }): Promise<Result<WholesaleCheckoutSession>> {
  const guard = await requireAgency();
  if (!guard.ok) return guard;
  const parsed = parseInput(cartSchema, input);
  if (!parsed.ok) return parsed;
  return callEdgeFunctionAuthed<WholesaleCheckoutSession>(`${WHOLESALE_FN}/create`, { items: parsed.data.items });
}

// ── Inventario + asignación (M4) ─────────────────────────────────────────────

export interface InventoryEsim {
  id: string;
  planName: string | null;
  iccid: string | null;
  qrLpa: string | null;
  iosTapLink: string | null;
  statusQr: string;
  inventoryStatus: 'unassigned' | 'assigned';
  assignedClientName: string | null;
  assignedClientEmail: string | null;
  batchId: string | null;
  createdAt: string | null;
}

/** Inventario de eSIMs emitidas de la agencia (RLS las limita a las suyas). */
export async function getMyInventory(): Promise<Result<InventoryEsim[]>> {
  const guard = await requireAgency();
  if (!guard.ok) return guard;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('esim')
    .select('id, iccid, qr_lpa, ios_tap_link, status_qr, inventory_status, assigned_client_name, assigned_client_email, created_at, order:order_id(batch_id, plan:plan_id(name))')
    .eq('agency_profile_id', guard.data.agencyId)
    .order('created_at', { ascending: false });
  if (error) {
    logger.error('getMyInventory falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos cargar tu inventario.');
  }
  // deno-lint-ignore no-explicit-any
  return ok((data ?? []).map((e: any) => {
    const order = Array.isArray(e.order) ? e.order[0] : e.order;
    const plan = order && (Array.isArray(order.plan) ? order.plan[0] : order.plan);
    return {
      id: e.id,
      planName: plan?.name ?? null,
      iccid: e.iccid,
      qrLpa: e.qr_lpa,
      iosTapLink: e.ios_tap_link,
      statusQr: e.status_qr ?? 'generated',
      inventoryStatus: (e.inventory_status ?? 'unassigned') as 'unassigned' | 'assigned',
      assignedClientName: e.assigned_client_name,
      assignedClientEmail: e.assigned_client_email,
      batchId: order?.batch_id ?? null,
      createdAt: e.created_at,
    };
  }));
}

const assignSchema = z.object({
  esimId: z.string().uuid(),
  clientName: z.string().trim().max(120).optional(),
  clientEmail: z.string().trim().email(),
});

/** Asigna una eSIM a un cliente final y le envía el QR por email. */
export async function assignEsim(input: { esimId: string; clientName?: string; clientEmail: string }): Promise<Result<{ emailed: boolean }>> {
  const guard = await requireAgency();
  if (!guard.ok) return guard;
  const parsed = parseInput(assignSchema, input);
  if (!parsed.ok) return parsed;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('agency_assign_esim' as never, {
    p_esim_id: parsed.data.esimId,
    p_client_name: parsed.data.clientName ?? null,
    p_client_email: parsed.data.clientEmail,
  } as never);
  if (error) {
    logger.error('assignEsim falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos asignar la eSIM.');
  }
  const r = data as { ok?: boolean; reason?: string } | null;
  if (!r?.ok) return err(ErrorCodes.VALIDATION, r?.reason ?? 'No se pudo asignar.');
  // Enviar el QR al cliente (best-effort: la asignación ya quedó registrada).
  const sent = await callEdgeFunctionAuthed<{ status: string }>('deliveries/assign-send', { esimId: parsed.data.esimId });
  return ok({ emailed: sent.ok });
}

/** Reenvía el QR al cliente final ya asignado. */
export async function resendAssignedQr(input: { esimId: string }): Promise<Result<null>> {
  const guard = await requireAgency();
  if (!guard.ok) return guard;
  const parsed = parseInput(z.object({ esimId: z.string().uuid() }), input);
  if (!parsed.ok) return parsed;
  const res = await callEdgeFunctionAuthed<{ status: string }>('deliveries/assign-send', { esimId: parsed.data.esimId });
  if (!res.ok) return res;
  return ok(null);
}
