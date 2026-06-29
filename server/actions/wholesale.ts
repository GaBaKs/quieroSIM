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
