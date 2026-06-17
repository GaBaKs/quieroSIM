import 'server-only';
import { err, type Result } from '../types/result';
import { ErrorCodes } from './errors';
import { getAuthContext, type AuthContext } from './auth';

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
