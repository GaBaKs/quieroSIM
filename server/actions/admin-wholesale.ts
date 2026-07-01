'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { err, ok, type Result } from '../types/result';
import { ErrorCodes } from '../lib/errors';
import { parseInput } from '../lib/validation';
import { logger } from '../lib/logger';
import { createSupabaseServerClient } from '../db/supabase-server';
import { requireSuperAdmin, requireAdmin } from '../lib/admin-guard';

/**
 * Gestión de agencias mayoristas (admin). Listado y datos los ve super_admin
 * (incluye montos/finanzas más adelante); el cambio de estado/margen lo hace
 * cualquier admin vía RPC SECURITY DEFINER. Espejo de admin-affiliates.
 */

export interface AdminAgencyRow {
  id: string;
  companyName: string;
  name: string | null;
  email: string;
  taxId: string | null;
  status: 'pending' | 'approved' | 'suspended';
  customMarginPct: number | null;
  approvedAt: string | null;
}

export async function getAgenciesAdmin(): Promise<Result<AdminAgencyRow[]>> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('agency_profile')
    .select('id, company_name, tax_id, status, custom_margin_pct, approved_at, user_profile:user_id(email, full_name)')
    .order('approved_at', { ascending: false, nullsFirst: true });
  if (error) {
    logger.error('getAgenciesAdmin falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos cargar las agencias.');
  }
  const rows: AdminAgencyRow[] = (data ?? []).map((a) => {
    const up = Array.isArray(a.user_profile) ? a.user_profile[0] : a.user_profile;
    return {
      id: a.id,
      companyName: a.company_name,
      name: up?.full_name ?? null,
      email: up?.email ?? '—',
      taxId: a.tax_id,
      status: (a.status ?? 'pending') as AdminAgencyRow['status'],
      customMarginPct: a.custom_margin_pct === null ? null : Number(a.custom_margin_pct),
      approvedAt: a.approved_at,
    };
  });
  return ok(rows);
}

const statusSchema = z.object({ agencyId: z.string().uuid(), status: z.enum(['pending', 'approved', 'suspended']) });

export async function setAgencyStatus(input: { agencyId: string; status: 'pending' | 'approved' | 'suspended' }): Promise<Result<null>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const parsed = parseInput(statusSchema, input);
  if (!parsed.ok) return parsed;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_set_agency_status' as never, {
    p_agency_id: parsed.data.agencyId,
    p_status: parsed.data.status,
  } as never);
  if (error) {
    logger.error('setAgencyStatus falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos actualizar la agencia.');
  }
  const r = data as { ok?: boolean; reason?: string } | null;
  if (!r?.ok) return err(ErrorCodes.VALIDATION, r?.reason ?? 'No se pudo actualizar.');
  revalidatePath('/admin/wholesale');
  return ok(null);
}

const marginSchema = z.object({ agencyId: z.string().uuid(), margin: z.number().min(0).max(1000).nullable() });

export async function updateAgencyMargin(input: { agencyId: string; margin: number | null }): Promise<Result<null>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const parsed = parseInput(marginSchema, input);
  if (!parsed.ok) return parsed;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_set_agency_margin' as never, {
    p_agency_id: parsed.data.agencyId,
    p_margin: parsed.data.margin,
  } as never);
  if (error) {
    logger.error('updateAgencyMargin falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos actualizar el margen.');
  }
  const r = data as { ok?: boolean; reason?: string } | null;
  if (!r?.ok) return err(ErrorCodes.VALIDATION, r?.reason ?? 'No se pudo actualizar.');
  revalidatePath('/admin/wholesale');
  return ok(null);
}

const createSchema = z.object({
  email: z.string().trim().email().max(120),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres.')
    .max(72)
    .regex(/[a-z]/, 'Debe incluir una minúscula.')
    .regex(/[A-Z]/, 'Debe incluir una mayúscula.')
    .regex(/[0-9]/, 'Debe incluir un número.'),
  companyName: z.string().trim().min(2).max(120),
  taxId: z.string().trim().max(60).optional(),
  billingAddress: z.string().trim().max(300).optional(),
  margin: z.number().min(0).max(1000).optional(),
});

/** Crea un usuario nuevo y lo convierte en agencia APROBADA de cero (super_admin). */
export async function createAgency(input: {
  email: string; password: string; companyName: string; taxId?: string; billingAddress?: string; margin?: number;
}): Promise<Result<{ agencyId: string }>> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard;
  const parsed = parseInput(createSchema, input);
  if (!parsed.ok) return parsed;

  // 1) Crear el usuario (Edge admin-users, service_role).
  const { callEdgeFunctionAuthed } = await import('../lib/edge');
  const userRes = await callEdgeFunctionAuthed<{ userId: string }>('admin-users/create', {
    email: parsed.data.email,
    password: parsed.data.password,
    role: 'agency',
  });
  if (!userRes.ok) return userRes;

  // 2) Crear el perfil de agencia aprobado (asigna rol + datos de empresa).
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_create_agency' as never, {
    p_user_id: userRes.data.userId,
    p_company_name: parsed.data.companyName,
    p_tax_id: parsed.data.taxId ?? null,
    p_billing_address: parsed.data.billingAddress ?? null,
    p_margin: parsed.data.margin ?? null,
  } as never);
  if (error) {
    logger.error('createAgency: admin_create_agency falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'El usuario se creó pero no pudimos crear la agencia.');
  }
  const r = data as { ok?: boolean; reason?: string; agencyId?: string } | null;
  if (!r?.ok) return err(ErrorCodes.VALIDATION, r?.reason ?? 'No se pudo crear la agencia.');
  revalidatePath('/admin/wholesale');
  return ok({ agencyId: r.agencyId! });
}
