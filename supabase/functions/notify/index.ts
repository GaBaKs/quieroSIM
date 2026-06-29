import { createClient } from '@supabase/supabase-js';
import { createResendClient } from '../_shared/email/resend.ts';

/**
 * Avisos internos por email (verify_jwt OFF — la llaman triggers de la BD vía
 * pg_net, autenticados con x-cron-secret). NO expone datos al cliente.
 *  POST /notify  body { kind:'sale', orderId } | { kind:'claim', ticketId }
 * Lee el email destino de platform_settings (sales_notify_email / claims_notify_email).
 * Si el destino está vacío → no-op. No loguea PII.
 */

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

const ADMIN_BASE = 'https://www.quierosim.com';

function makeEmail() {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) return null;
  return createResendClient({ apiKey, from: Deno.env.get('EMAIL_FROM') ?? 'QuieroSIM <onboarding@resend.dev>' });
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const cronSecret = Deno.env.get('CRON_SECRET');
  if (cronSecret && req.headers.get('x-cron-secret') !== cronSecret) {
    return new Response('forbidden', { status: 403 });
  }

  let body: { kind?: string; orderId?: string; ticketId?: string };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: 'bad body' }, 400);
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const email = makeEmail(supabase);
  if (!email) return json({ ok: true, skipped: 'no resend' });

  const { data: settings } = await supabase
    .from('platform_settings')
    .select('sales_notify_email, claims_notify_email')
    .eq('id', 1)
    .maybeSingle();

  try {
    if (body.kind === 'sale' && body.orderId) {
      const to = (settings?.sales_notify_email as string | null) ?? '';
      if (!to) return json({ ok: true, skipped: 'no sales email' });
      const { data: o } = await supabase
        .from('order')
        .select('id, price_paid, currency_sale, guest_email, plan:plan_id(name)')
        .eq('id', body.orderId)
        .maybeSingle();
      if (!o) return json({ ok: true, skipped: 'order not found' });
      // deno-lint-ignore no-explicit-any
      const plan = Array.isArray((o as any).plan) ? (o as any).plan[0] : (o as any).plan;
      const planName = plan?.name ?? 'Plan';
      const amount = `${o.currency_sale ?? 'USD'} ${Number(o.price_paid ?? 0).toFixed(2)}`;
      const shortId = String(o.id).slice(0, 8).toUpperCase();
      await email.sendEmail({
        to,
        subject: `🟢 Nueva venta · ${amount} · ${planName}`,
        html: `<h2>Nueva venta</h2>
          <p><strong>Plan:</strong> ${planName}</p>
          <p><strong>Monto:</strong> ${amount}</p>
          <p><strong>Cliente:</strong> ${o.guest_email ?? '—'}</p>
          <p><strong>Orden:</strong> #${shortId}</p>
          <p><a href="${ADMIN_BASE}/admin/orders">Ver en el panel</a></p>`,
        idempotencyKey: `sale_notify_${o.id}`,
      });
      return json({ ok: true });
    }

    if (body.kind === 'claim' && body.ticketId) {
      const to = (settings?.claims_notify_email as string | null) ?? '';
      if (!to) return json({ ok: true, skipped: 'no claims email' });
      const { data: t } = await supabase
        .from('support_ticket')
        .select('id, bot_conversation_history, user_profile:user_id(email, full_name)')
        .eq('id', body.ticketId)
        .maybeSingle();
      if (!t) return json({ ok: true, skipped: 'ticket not found' });
      // deno-lint-ignore no-explicit-any
      const up = Array.isArray((t as any).user_profile) ? (t as any).user_profile[0] : (t as any).user_profile;
      const hist = Array.isArray(t.bot_conversation_history) ? t.bot_conversation_history : [];
      // deno-lint-ignore no-explicit-any
      const firstMsg = (hist.find((m: any) => m?.author === 'user') ?? hist[0]) as any;
      const msg = firstMsg?.body ?? '(sin detalle)';
      await email.sendEmail({
        to,
        subject: `📩 Nuevo reclamo de soporte`,
        html: `<h2>Nuevo caso de soporte</h2>
          <p><strong>Cliente:</strong> ${up?.full_name ?? '—'} (${up?.email ?? '—'})</p>
          <p><strong>Mensaje:</strong></p>
          <blockquote>${String(msg).slice(0, 1000)}</blockquote>
          <p><a href="${ADMIN_BASE}/admin/support">Atender en el panel</a></p>`,
        idempotencyKey: `claim_notify_${t.id}`,
      });
      return json({ ok: true });
    }
  } catch (e) {
    console.error('notify error', e instanceof Error ? e.message : 'err');
    return json({ ok: false, error: 'send failed' }, 500);
  }

  return json({ ok: false, error: 'unknown kind' }, 400);
});
