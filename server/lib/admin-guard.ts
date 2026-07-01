import 'server-only';
import { err, type Result } from '../types/result';
import { ErrorCodes } from './errors';
import { getAuthContext, type AuthContext } from './auth';
import { createSupabaseServerClient } from '../db/supabase-server';

/**
 * Guards de las Server Actions del panel admin. La seguridad REAL la da RLS
 * (lecturas) + los checks de las Edge Functions (escrituras con secretos);
 * estos guards resuelven qué permitir desde la fachada y dan mensajes claros.
 */

export async function requireAdmin(): Promise<Result<AuthContext>> {
  const ctx = await getAuthContext();
  if (!ctx) return err(ErrorCodes.UNAUTHORIZED, 'No hay una sesión activa.');
  if (!ctx.roles.includes('admin') && ctx.adminSubRole === null) {
    return err(ErrorCodes.FORBIDDEN, 'No tenés permisos de administrador.');
  }
  return { ok: true, data: ctx };
}

export async function requireSuperAdmin(): Promise<Result<AuthContext>> {
  const ctx = await getAuthContext();
  if (!ctx) return err(ErrorCodes.UNAUTHORIZED, 'No hay una sesión activa.');
  if (ctx.adminSubRole !== 'super_admin') {
    return err(ErrorCodes.FORBIDDEN, 'Esta acción es solo para super administradores.');
  }
  return { ok: true, data: ctx };
}

export interface AgencyContext extends AuthContext {
  agencyId: string;
}

/** Exige que el usuario sea una agencia APROBADA. Devuelve su agencyId. */
export async function requireAgency(): Promise<Result<AgencyContext>> {
  const ctx = await getAuthContext();
  if (!ctx) return err(ErrorCodes.UNAUTHORIZED, 'No hay una sesión activa.');
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('agency_profile')
    .select('id, status')
    .eq('user_id', ctx.userId)
    .maybeSingle();
  if (!data || data.status !== 'approved') {
    return err(ErrorCodes.FORBIDDEN, 'Tu cuenta no es una agencia aprobada.');
  }
  return { ok: true, data: { ...ctx, agencyId: data.id } };
}
