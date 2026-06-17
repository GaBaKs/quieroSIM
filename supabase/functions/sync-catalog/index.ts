import { createClient } from 'npm:@supabase/supabase-js@2';
import { createYesimClient } from '../_shared/yesim/client.ts';
import { createYesimMock } from '../_shared/yesim/mock/handler.ts';

/**
 * Cron de sincronización de catálogo (RF-CAT, RF-PRC-01/03/06).
 * - Upsert de planes YeSim en `plan` (por yesim_id).
 * - Planes nuevos: crea `plan_pricing` con margen default 100% (el trigger
 *   calculate_plan_pricing materializa price_final; tg_log_price_history audita).
 * - Costo con variación ≥5% → evento `price_alert` en audit_log (el email al
 *   admin llega en Etapa 6 con Resend).
 * - Planes que desaparecen del feed → status 'inactive'.
 * En dev YESIM_BASE_URL=mock (o ausente) usa el mock in-process: cero red, cero saldo.
 */

const PRICE_ALERT_THRESHOLD_PCT = 5;
const DEFAULT_MARGIN_PCT = 100;

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

  const plansResult = await yesim.getPlans();
  if (!plansResult.ok) {
    return Response.json({ ok: false, error: plansResult.error }, { status: 502 });
  }
  const feed = plansResult.data;

  const { data: existingPricing, error: pricingErr } = await supabase
    .from('plan_pricing')
    .select('plan_id, cost_provider_eur, price_final');
  if (pricingErr) return Response.json({ ok: false, error: pricingErr.message }, { status: 500 });
  const pricingByPlanId = new Map(existingPricing.map((p) => [p.plan_id as string, p]));

  const stats = { upserted: 0, pricingCreated: 0, costUpdated: 0, priceAlerts: 0, deactivated: 0 };
  const alerts: Array<Record<string, unknown>> = [];

  for (const plan of feed) {
    const { data: planRow, error: upsertErr } = await supabase
      .from('plan')
      .upsert(
        {
          yesim_id: plan.id,
          yesim_old_id: plan.oldId,
          name: plan.name,
          country_region: plan.countriesIncluded,
          iso_country: plan.countryIso2,
          plan_type: plan.planType,
          duration_days: plan.days,
          data_amount: String(plan.dataGb),
          operators: plan.operators,
          currency: plan.currency,
          retail_price_ref: plan.retailPrice,
          is_fup: plan.name.toLowerCase().includes('unlimited'),
          status: 'active',
          last_sync_at: new Date().toISOString(),
        },
        { onConflict: 'yesim_id' },
      )
      .select('id')
      .single();
    if (upsertErr || !planRow) {
      return Response.json({ ok: false, error: upsertErr?.message, yesimId: plan.id }, { status: 500 });
    }
    stats.upserted += 1;

    const pricing = pricingByPlanId.get(planRow.id);
    if (!pricing) {
      // price_final lo materializa el trigger calculate_plan_pricing (BEFORE INSERT).
      const { error } = await supabase.from('plan_pricing').insert({
        plan_id: planRow.id,
        cost_provider_eur: plan.price,
        margin_pct: DEFAULT_MARGIN_PCT,
        price_final: 0,
      });
      if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
      stats.pricingCreated += 1;
    } else if (Number(pricing.cost_provider_eur) !== plan.price) {
      const oldCost = Number(pricing.cost_provider_eur);
      const pctChange = oldCost > 0 ? (Math.abs(plan.price - oldCost) / oldCost) * 100 : 100;
      const { error } = await supabase
        .from('plan_pricing')
        .update({ cost_provider_eur: plan.price })
        .eq('plan_id', planRow.id);
      if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
      stats.costUpdated += 1;
      if (pctChange >= PRICE_ALERT_THRESHOLD_PCT) {
        stats.priceAlerts += 1;
        alerts.push({
          yesim_id: plan.id,
          plan_name: plan.name,
          old_cost: oldCost,
          new_cost: plan.price,
          pct_change: Math.round(pctChange * 100) / 100,
        });
      }
    }
  }

  if (alerts.length > 0) {
    await supabase.from('audit_log').insert({
      action: 'price_alert',
      actor_type: 'system_cron',
      payload: { source: 'sync-catalog', threshold_pct: PRICE_ALERT_THRESHOLD_PCT, alerts },
    });
  }

  // Planes activos que ya no vienen en el feed → inactivos (no se venden más).
  const feedIds = feed.map((p) => p.id);
  const { data: deactivated } = await supabase
    .from('plan')
    .update({ status: 'inactive' })
    .eq('status', 'active')
    .not('yesim_id', 'in', `(${feedIds.map((id) => `"${id}"`).join(',')})`)
    .select('id');
  stats.deactivated = deactivated?.length ?? 0;

  return Response.json({ ok: true, source: useMock ? 'mock' : 'yesim', stats });
});
