import { createClient } from 'npm:@supabase/supabase-js@2';
import { createYesimClient } from '../_shared/yesim/client.ts';
import { createYesimMock } from '../_shared/yesim/mock/handler.ts';

/**
 * Cron de dispositivos compatibles (RF-QR-06): sincroniza /supported_devices
 * a device_compat. Solo AGREGA (upsert sin deletes): el seed curado del front
 * es más rico que el feed y no debe pisarse.
 */
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const cronSecret = Deno.env.get('CRON_SECRET');
  if (cronSecret && req.headers.get('x-cron-secret') !== cronSecret) {
    return new Response('forbidden', { status: 403 });
  }

  const baseUrl = Deno.env.get('YESIM_BASE_URL') ?? 'mock';
  const token = Deno.env.get('YESIM_TOKEN') ?? 'mock-token';
  const useMock = baseUrl === 'mock';
  const yesim = createYesimClient({
    baseUrl: useMock ? 'https://yesim.mock' : baseUrl,
    token,
    fetchFn: useMock ? createYesimMock({ token }).fetchHandler : undefined,
  });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const devicesResult = await yesim.supportedDevices();
  if (!devicesResult.ok) {
    return Response.json({ ok: false, error: devicesResult.error }, { status: 502 });
  }

  const rows = devicesResult.data.flatMap((category) =>
    category.brands.flatMap((brand) =>
      brand.models.map((m) => ({
        category: category.type,
        brand: brand.brand,
        model: m.model,
        synced_at: new Date().toISOString(),
      })),
    ),
  );

  const { error } = await supabase
    .from('device_compat')
    .upsert(rows, { onConflict: 'category,brand,model', ignoreDuplicates: true });
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  return Response.json({ ok: true, source: useMock ? 'mock' : 'yesim', received: rows.length });
});
