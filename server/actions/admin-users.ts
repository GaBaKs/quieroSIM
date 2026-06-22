'use server';

import { z } from 'zod';
import { err, ok, type Result } from '../types/result';
import { ErrorCodes } from '../lib/errors';
import { parseInput } from '../lib/validation';
import { logger } from '../lib/logger';
import { createSupabaseServerClient } from '../db/supabase-server';
import { requireAdmin, requireSuperAdmin } from '../lib/admin-guard';
import { sanitizePostgrestSearch } from '../lib/sanitize';

/**
 * Gestión de usuarios. Lectura y suspender: cualquier admin (usr_prof_upd).
 * Editar roles: SOLO super_admin — y NUNCA se da/quita 'admin' desde la UI
 * (ese cambio se hace a mano por seguridad).
 */

const USER_PAGE_SIZE = 20;
/** Roles asignables desde el panel (admin queda fuera a propósito). */
const ASSIGNABLE_ROLES = ['customer', 'affiliate', 'agency'] as const;

export interface AdminUserRow {
  id: string;
  email: string;
  fullName: string | null;
  accountStatus: string;
  roles: string[];
  createdAt: string | null;
}

export interface AdminUserList {
  rows: AdminUserRow[];
  page: number;
  pageSize: number;
  total: number;
}

function rolesOf(row: { user_role?: Array<{ role: { name: string } | { name: string }[] | null }> }): string[] {
  return (row.user_role ?? [])
    .flatMap((r) => (Array.isArray(r.role) ? r.role : r.role ? [r.role] : []))
    .map((r) => r.name);
}

const listSchema = z.object({
  search: z.string().trim().max(120).optional(),
  page: z.number().int().min(1).default(1),
});

export async function getUsers(input: { search?: string; page?: number }): Promise<Result<AdminUserList>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const parsed = parseInput(listSchema, input);
  if (!parsed.ok) return parsed;
  const { search, page } = parsed.data;

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('user_profile')
    .select('id, email, full_name, account_status, created_at, user_role!user_id(role:role_id(name))', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * USER_PAGE_SIZE, page * USER_PAGE_SIZE - 1);

  if (search) {
    const s = sanitizePostgrestSearch(search);
    query = query.or(`email.ilike.%${s}%,full_name.ilike.%${s}%`);
  }

  const { data, error, count } = await query;
  if (error) {
    logger.error('getUsers falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos cargar los usuarios.');
  }

  const rows: AdminUserRow[] = (data ?? []).map((u) => ({
    id: u.id,
    email: u.email,
    fullName: u.full_name,
    accountStatus: u.account_status ?? 'active',
    roles: rolesOf(u),
    createdAt: u.created_at,
  }));
  return ok({ rows, page, pageSize: USER_PAGE_SIZE, total: count ?? rows.length });
}

export interface AdminUserDetail extends AdminUserRow {
  phone: string | null;
  langPref: string | null;
  isAdmin: boolean;
  orders: Array<{ id: string; shortId: string; planName: string; status: string; pricePaid: number; createdAt: string | null }>;
  esims: Array<{ id: string; iccid: string | null; status: string }>;
}

export async function getUserDetail(userId: string): Promise<Result<AdminUserDetail>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  if (!isUuid(userId)) return err(ErrorCodes.VALIDATION, 'Usuario inválido.');

  const supabase = await createSupabaseServerClient();
  const { data: u, error } = await supabase
    .from('user_profile')
    .select('id, email, full_name, phone_whatsapp, lang_pref, account_status, created_at, user_role!user_id(role:role_id(name)), admin_profile(sub_role)')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    logger.error('getUserDetail falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos cargar el usuario.');
  }
  if (!u) return err(ErrorCodes.NOT_FOUND, 'Usuario no encontrado.');

  const { data: orders } = await supabase
    .from('order')
    .select('id, status, price_paid, created_at, plan:plan_id(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  const { data: esims } = await supabase
    .from('esim')
    .select('id, iccid, status_qr')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  const adminRow = Array.isArray(u.admin_profile) ? u.admin_profile[0] : u.admin_profile;

  return ok({
    id: u.id,
    email: u.email,
    fullName: u.full_name,
    phone: u.phone_whatsapp,
    langPref: u.lang_pref,
    accountStatus: u.account_status ?? 'active',
    roles: rolesOf(u),
    isAdmin: !!adminRow,
    createdAt: u.created_at,
    orders: (orders ?? []).map((o) => {
      const plan = Array.isArray(o.plan) ? o.plan[0] : o.plan;
      return {
        id: o.id,
        shortId: o.id.slice(0, 8).toUpperCase(),
        planName: plan?.name ?? '—',
        status: o.status ?? 'pending',
        pricePaid: Number(o.price_paid),
        createdAt: o.created_at,
      };
    }),
    esims: (esims ?? []).map((e) => ({ id: e.id, iccid: e.iccid, status: e.status_qr ?? 'generated' })),
  });
}

const statusSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(['active', 'suspended']),
});

export async function setUserStatus(input: { userId: string; status: 'active' | 'suspended' }): Promise<Result<{ status: string }>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const parsed = parseInput(statusSchema, input);
  if (!parsed.ok) return parsed;

  const supabase = await createSupabaseServerClient();
  // No suspenderse a sí mismo ni a otro admin desde la UI.
  const { data: target } = await supabase
    .from('admin_profile')
    .select('user_id')
    .eq('user_id', parsed.data.userId)
    .maybeSingle();
  if (target) return err(ErrorCodes.FORBIDDEN, 'No se puede suspender a un administrador desde el panel.');

  const { error } = await supabase
    .from('user_profile')
    .update({ account_status: parsed.data.status })
    .eq('id', parsed.data.userId);
  if (error) {
    logger.error('setUserStatus falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos cambiar el estado del usuario.');
  }

  await supabase.rpc('log_admin_action', {
    p_action: 'user_status_update',
    p_payload: { user_id: parsed.data.userId, status: parsed.data.status },
  });
  return ok({ status: parsed.data.status });
}

const rolesSchema = z.object({
  userId: z.string().uuid(),
  roles: z.array(z.enum(ASSIGNABLE_ROLES)).max(3),
});

/** Reemplaza los roles asignables del usuario (super_admin). Nunca toca 'admin'. */
export async function setUserRoles(input: { userId: string; roles: string[] }): Promise<Result<{ roles: string[] }>> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard;
  const parsed = parseInput(rolesSchema, input);
  if (!parsed.ok) return parsed;
  const { userId, roles } = parsed.data;

  const supabase = await createSupabaseServerClient();

  // IDs de los roles asignables.
  const { data: roleRows, error: roleErr } = await supabase
    .from('role')
    .select('id, name')
    .in('name', ASSIGNABLE_ROLES as unknown as string[]);
  if (roleErr || !roleRows) {
    logger.error('setUserRoles: roles no encontrados', { error: roleErr?.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos resolver los roles.');
  }
  const assignableIds = roleRows.map((r) => r.id);
  const targetIds = roleRows.filter((r) => (roles as string[]).includes(r.name)).map((r) => r.id);

  // Borrar SOLO los roles asignables actuales (admin/otros quedan intactos).
  const { error: delErr } = await supabase
    .from('user_role')
    .delete()
    .eq('user_id', userId)
    .in('role_id', assignableIds);
  if (delErr) {
    logger.error('setUserRoles delete falló', { error: delErr.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos actualizar los roles.');
  }

  if (targetIds.length > 0) {
    const { error: insErr } = await supabase
      .from('user_role')
      .insert(targetIds.map((role_id) => ({ user_id: userId, role_id })));
    if (insErr) {
      logger.error('setUserRoles insert falló', { error: insErr.message });
      return err(ErrorCodes.INTERNAL, 'No pudimos asignar los roles.');
    }
  }

  await supabase.rpc('log_admin_action', { p_action: 'user_roles_update', p_payload: { user_id: userId, roles } });
  return ok({ roles });
}

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}
