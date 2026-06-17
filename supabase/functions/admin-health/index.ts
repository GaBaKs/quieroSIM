import { createClient } from '@supabase/supabase-js';

/**
 * Salud del sistema para el dashboard admin (verify_jwt ON + valida admin).
 * Pinguea en paralelo los 3 servicios externos con llamadas LIVIANAS y sin
 * costo (YeSim /plans no consume saldo). Nunca filtra secretos al cliente.
 *  - ok            → el servicio respondió bien
 *  - down          → respondió error / no respondió
 *  - not_configured→ falta el secreto (Resend en dev)
 */

type Health = 'ok' | 'down' | 'not_configured';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

async function pingStripe(): Promise<Health> {
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) return 'not_configured';
  try {
    const r = await fetch('https://api.stripe.com/v1/balance', {
      headers: { authorization: `Bearer ${key}` },
    });
    return r.ok ? 'ok' : 'down';
  } catch {
    return 'down';
  }
}

async function pingYesim(): Promise<Health> {
  const baseUrl = Deno.env.get('YESIM_BASE_URL') ?? 'mock';
  // En modo mock (dev) el cliente in-process siempre está disponible.
  if (baseUrl === 'mock') return 'ok';
  const token = Deno.env.get('YESIM_TOKEN');
  if (!token) return 'not_configured';
  try {
    const url = new URL(`${baseUrl.replace(/\/$/, '')}/plans`);
    url.searchParams.set('token', token);
    const r = await fetch(url.toString());
    return r.ok ? 'ok' : 'down';
  } catch {
    return 'down';
  }
}

async function pingResend(): Promise<Health> {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) return 'not_configured';
  try {
    const r = await fetch('https://api.resend.com/domains', {
      headers: { authorization: `Bearer ${key}` },
    });
    return r.ok ? 'ok' : 'down';
  } catch {
    return 'down';
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Falta token.' } }, 401);
  const { data: userData } = await supabase.auth.getUser(token);
  if (!userData.user) return json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Token inválido.' } }, 401);
  const { data: adminRow } = await supabase
    .from('admin_profile')
    .select('sub_role')
    .eq('user_id', userData.user.id)
    .maybeSingle();
  if (!adminRow) return json({ ok: false, error: { code: 'FORBIDDEN', message: 'Solo administradores.' } }, 403);

  const [stripe, yesim, resend] = await Promise.all([pingStripe(), pingYesim(), pingResend()]);
  return json({ ok: true, data: { stripe, yesim, resend } });
});
