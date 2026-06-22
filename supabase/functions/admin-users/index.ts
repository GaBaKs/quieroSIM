import { createClient } from '@supabase/supabase-js';

/**
 * Gestión de usuarios por la Admin API (verify_jwt ON; necesita service_role, por
 * eso vive en una Edge Function — los Server Actions no la tienen).
 *  POST /admin-users/create → crea un usuario (solo super_admin). Lo crea con
 *    email_confirm=true (queda activo, no depende del email). El trigger
 *    tg_handle_new_auth_user le pone el perfil + rol customer; si se pidió otro
 *    rol asignable, se agrega.
 */

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
function fail(code: string, message: string, status = 400): Response {
  return json({ ok: false, error: { code, message } }, status);
}

const ASSIGNABLE_ROLES = ['customer', 'affiliate', 'agency'];

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  const route = new URL(req.url).pathname.split('/').filter(Boolean).pop();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  if (route === 'create') {
    // ── Solo super_admin ──────────────────────────────────────────────────────
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return fail('UNAUTHORIZED', 'Falta token.', 401);
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData.user) return fail('UNAUTHORIZED', 'Token inválido.', 401);
    const { data: adminRow } = await supabase
      .from('admin_profile')
      .select('sub_role')
      .eq('user_id', userData.user.id)
      .maybeSingle();
    if (adminRow?.sub_role !== 'super_admin') {
      return fail('FORBIDDEN', 'Solo super administradores pueden crear usuarios.', 403);
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return fail('VALIDATION', 'Body JSON inválido.');
    }
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const lang = ['ES', 'EN', 'PT'].includes(String(body.lang)) ? String(body.lang) : 'ES';
    const role = ASSIGNABLE_ROLES.includes(String(body.role)) ? String(body.role) : 'customer';
    if (!email || !/\S+@\S+\.\S+/.test(email) || password.length < 8) {
      return fail('VALIDATION', 'Email o contraseña inválidos.');
    }

    const { data: created, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { lang },
    });
    if (error || !created?.user) {
      // Email duplicado u otro error de la Admin API.
      return fail('CREATE_FAILED', error?.message ?? 'No pudimos crear el usuario.', 400);
    }
    const newUserId = created.user.id;

    // El trigger crea el perfil + rol customer. Aseguramos el email y, si se pidió
    // un rol distinto, lo agregamos.
    await supabase.from('user_profile').update({ email }).eq('id', newUserId);
    if (role !== 'customer') {
      const { data: roleRow } = await supabase.from('role').select('id').eq('name', role).maybeSingle();
      if (roleRow) {
        await supabase.from('user_role').insert({ user_id: newUserId, role_id: roleRow.id });
      }
    }

    await supabase.from('audit_log').insert({
      action: 'user_created',
      actor_id: userData.user.id,
      actor_type: 'admin',
      payload: { new_user_id: newUserId, email, role },
    });

    return json({ ok: true, data: { userId: newUserId } });
  }

  return new Response('not found', { status: 404 });
});
