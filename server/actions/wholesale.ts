'use server';

import { z } from 'zod';
import { err, ok, type Result } from '../types/result';
import { ErrorCodes } from '../lib/errors';
import { parseInput } from '../lib/validation';
import { logger } from '../lib/logger';
import { createSupabaseServerClient } from '../db/supabase-server';

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
