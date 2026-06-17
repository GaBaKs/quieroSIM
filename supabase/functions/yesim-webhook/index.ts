import { createClient } from '@supabase/supabase-js';
import { createYesimClient } from '../_shared/yesim/client.ts';
import { createYesimMock } from '../_shared/yesim/mock/handler.ts';
import { handleYesimWebhook, syncEsimStatuses } from '../_shared/services/esim-status.ts';
import { createSupabaseEsimStatusStore } from '../_shared/services/esim-status-store-supabase.ts';

/**
 * Estado de eSIM híbrido (verify_jwt OFF: YeSim no manda JWT NI firma):
 *  POST /yesim-webhook       → receptor de webhooks. El payload es solo una
 *                              señal: se registra en yesim_webhook_event y se
 *                              confirma con /sim_info antes de tocar la BD.
 *                              SIEMPRE responde 200 escueto (nada que revelar).
 *  POST /yesim-webhook/sync  → cron de reconciliación /bulk_sim_info cada 30
 *                              min (exige x-cron-secret): recupera webhooks
 *                              perdidos y refresca el consumo.
 */

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function makeYesim() {
  const baseUrl = Deno.env.get('YESIM_BASE_URL') ?? 'mock';
  const token = Deno.env.get('YESIM_TOKEN') ?? 'mock-token';
  const useMock = baseUrl === 'mock';
  return {
    useMock,
    client: createYesimClient({
      baseUrl: useMock ? 'https://yesim.mock' : baseUrl,
      token,
      fetchFn: useMock ? createYesimMock({ token }).fetchHandler : undefined,
    }),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  const route = new URL(req.url).pathname.split('/').filter(Boolean).pop();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const store = createSupabaseEsimStatusStore(supabase);
  const { useMock, client } = makeYesim();

  // ── /sync: cron de reconciliación ──────────────────────────────────────────
  if (route === 'sync') {
    const cronSecret = Deno.env.get('CRON_SECRET');
    if (cronSecret && req.headers.get('x-cron-secret') !== cronSecret) {
      return new Response('forbidden', { status: 403 });
    }
    const result = await syncEsimStatuses({ store, yesim: client, allowUnconfirmed: false });
    return json(result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error });
  }

  // ── Receptor del webhook ───────────────────────────────────────────────────
  const payload = await req.json().catch(() => null);
  try {
    // allowUnconfirmed SOLO en mock: el mock es stateless y /sim_info no conoce
    // ICCIDs de otras invocaciones. Con la API real la confirmación es ley.
    await handleYesimWebhook(payload, { store, yesim: client, allowUnconfirmed: useMock });
  } catch (e) {
    console.error('yesim-webhook error', e instanceof Error ? e.message : String(e));
  }
  // Respuesta uniforme pase lo que pase: no revelar nada al emisor.
  return json({ received: true });
});
