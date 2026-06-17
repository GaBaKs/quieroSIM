import 'server-only';
import { createSupabaseServerClient } from '../db/supabase-server';
import type { Tables } from '../types/database';

/**
 * Contexto de autorización del usuario actual. ÚNICA fuente de verdad de
 * usuario+rol para todas las Server Actions (la seguridad de datos real la
 * aplica RLS; esto resuelve qué mostrar y qué acción permitir).
 */

import type { AdminSubRole } from '../types/auth';

export type { AdminSubRole };

export interface AuthContext {
  userId: string;
  email: string | null;
  profile: Tables<'user_profile'> | null;
  roles: string[];
  adminSubRole: AdminSubRole | null;
}

type RoleRow = { role: { name: string } | { name: string }[] | null };

/** Mapeo puro (testeable) de las filas de BD al contexto. */
export function buildAuthContext(
  user: { id: string; email: string | null },
  profile: Tables<'user_profile'> | null,
  roleRows: RoleRow[] | null,
  adminRow: { sub_role: string } | null,
): AuthContext {
  const roles = (roleRows ?? [])
    .flatMap((row) => (Array.isArray(row.role) ? row.role : row.role ? [row.role] : []))
    .map((r) => r.name);

  const adminSubRole =
    adminRow?.sub_role === 'super_admin' || adminRow?.sub_role === 'support_agent'
      ? (adminRow.sub_role as AdminSubRole)
      : null;

  return { userId: user.id, email: user.email, profile, roles, adminSubRole };
}

/** Usuario + roles de la sesión actual, o null si no hay sesión válida. */
export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [profileRes, rolesRes, adminRes] = await Promise.all([
    supabase.from('user_profile').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('user_role').select('role:role_id(name)').eq('user_id', user.id),
    supabase.from('admin_profile').select('sub_role').eq('user_id', user.id).maybeSingle(),
  ]);

  return buildAuthContext(
    { id: user.id, email: user.email ?? null },
    profileRes.data,
    rolesRes.data,
    adminRes.data,
  );
}
