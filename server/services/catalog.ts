import 'server-only';
import { createSupabaseAnonClient } from '../db/supabase-anon';
import { logger } from '../lib/logger';
import { buildCatalog, groupDevices, type UiCatalog } from './catalog-mappers';

/**
 * Lecturas de catálogo para la landing (anon + RLS; cero secretos, sin
 * cookies — compatible con ISR). app/page.tsx las llama en build/revalidate.
 * Ante error devuelven vacío y loguean: la landing nunca se cae por la BD.
 */

/**
 * Trae TODAS las filas paginando de a 1000: PostgREST/Supabase corta cada
 * request en 1000 filas (max-rows), y el catálogo tiene >1500 planes. Sin esto
 * se perdían planes silenciosamente. Requiere un orden estable (por id).
 */
async function fetchAllPages<T>(
  makeQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<{ data: T[]; error: string | null }> {
  const PAGE = 1000;
  const all: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await makeQuery(from, from + PAGE - 1);
    if (error) return { data: [], error: error.message };
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < PAGE) break;
  }
  return { data: all, error: null };
}

export async function getCatalog(): Promise<UiCatalog> {
  try {
    const supabase = createSupabaseAnonClient();
    const destRes = await supabase
      .from('destination')
      .select('slug, name, code, region, popular, flag, search_aliases, iso_match')
      .eq('status', 'active')
      .order('sort_order');
    // plan (>1500) y catalog_pricing (>1500) superan el límite de 1000 → paginar.
    const planRes = await fetchAllPages((from, to) =>
      supabase
        .from('plan')
        .select('id, name, iso_country, duration_days, data_amount, is_fup, operators, is_recommended')
        .eq('status', 'active')
        .order('id')
        .range(from, to),
    );
    const pricingRes = await fetchAllPages((from, to) =>
      supabase.from('catalog_pricing').select('plan_id, price_final').order('plan_id').range(from, to),
    );

    if (destRes.error || planRes.error || pricingRes.error) {
      logger.error('getCatalog: error leyendo catálogo', {
        dest: destRes.error?.message,
        plan: planRes.error,
        pricing: pricingRes.error,
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
