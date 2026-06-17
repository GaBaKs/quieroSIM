import 'server-only';
import { createSupabaseAnonClient } from '../db/supabase-anon';
import { logger } from '../lib/logger';
import { buildCatalog, groupDevices, type UiCatalog } from './catalog-mappers';

/**
 * Lecturas de catálogo para la landing (anon + RLS; cero secretos, sin
 * cookies — compatible con ISR). app/page.tsx las llama en build/revalidate.
 * Ante error devuelven vacío y loguean: la landing nunca se cae por la BD.
 */

export async function getCatalog(): Promise<UiCatalog> {
  try {
    const supabase = createSupabaseAnonClient();
    const [destRes, planRes, pricingRes] = await Promise.all([
      supabase
        .from('destination')
        .select('slug, name, code, region, popular, flag, search_aliases, iso_match')
        .eq('status', 'active')
        .order('sort_order'),
      supabase
        .from('plan')
        .select('id, name, iso_country, duration_days, data_amount, is_fup, operators')
        .eq('status', 'active'),
      supabase.from('catalog_pricing').select('plan_id, price_final'),
    ]);

    if (destRes.error || planRes.error || pricingRes.error) {
      logger.error('getCatalog: error leyendo catálogo', {
        dest: destRes.error?.message,
        plan: planRes.error?.message,
        pricing: pricingRes.error?.message,
      });
      return { destinations: [], plansByDestination: {} };
    }

    const priceByPlanId = new Map(pricingRes.data.map((p) => [p.plan_id, p.price_final]));
    const planRows = planRes.data.map((p) => ({
      ...p,
      price_final: priceByPlanId.get(p.id) ?? null,
    }));

    return buildCatalog(destRes.data, planRows);
  } catch (e) {
    logger.error('getCatalog: excepción', { error: e instanceof Error ? e.message : String(e) });
    return { destinations: [], plansByDestination: {} };
  }
}

export async function getSupportedDevices(): Promise<Array<{ brand: string; models: string[] }>> {
  try {
    const supabase = createSupabaseAnonClient();
    const { data, error } = await supabase
      .from('device_compat')
      .select('brand, model, category')
      .eq('category', 'PHONE')
      .order('brand');
    if (error) {
      logger.error('getSupportedDevices: error leyendo device_compat', { error: error.message });
      return [];
    }
    return groupDevices(data);
  } catch (e) {
    logger.error('getSupportedDevices: excepción', { error: e instanceof Error ? e.message : String(e) });
    return [];
  }
}
