'use server';

import { err, ok, type Result } from '../types/result';
import { ErrorCodes } from '../lib/errors';
import { getAuthContext, type AdminSubRole } from '../lib/auth';

/** Perfil del usuario logueado — contrato de la fachada para el front. */
export interface CurrentUserProfile {
  userId: string;
  email: string | null;
  fullName: string | null;
  langPref: string | null;
  roles: string[];
  adminSubRole: AdminSubRole | null;
}

export async function getCurrentUserProfile(): Promise<Result<CurrentUserProfile>> {
  const ctx = await getAuthContext();
  if (!ctx) return err(ErrorCodes.UNAUTHORIZED, 'No hay una sesión activa.');
  return ok({
    userId: ctx.userId,
    email: ctx.email,
    fullName: ctx.profile?.full_name ?? null,
    langPref: ctx.profile?.lang_pref ?? null,
    roles: ctx.roles,
    adminSubRole: ctx.adminSubRole,
  });
}
