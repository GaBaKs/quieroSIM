import type { Destination, Plan } from '@/lib/types';

/**
 * Mappers puros BD → formas exactas de la UI (lib/types.ts).
 * Sin I/O: testeables en Vitest. El fetch vive en server/services/catalog.ts.
 */

export interface DestinationRow {
  slug: string;
  name: string;
  code: string;
  region: string;
  popular: boolean | null;
  flag: string;
  search_aliases: unknown; // jsonb
  iso_match: string | null;
}

export interface CatalogPlanRow {
  id: string; // uuid interno — es el id que viaja al checkout
  name: string;
  iso_country: string | null;
  duration_days: number | null;
  data_amount: string | null;
  is_fup: boolean | null;
  operators: string | null;
  price_final: number | null; // de la vista catalog_pricing
  is_recommended?: boolean | null; // marca manual del admin (override del auto-popular)
}

/** Features con frases que lib/i18n/featureTranslator ya sabe traducir. */
export function buildPlanFeatures(destinationName: string, operators: string | null): string[] {
  const network =
    operators && operators.trim() && operators.trim().toLowerCase() !== 'multiple'
      ? `Red ${operators}` // regla dinámica 'Red ...' del featureTranslator
      : `Red local Premium en ${destinationName}`; // regla dinámica con país traducible
  return [network, 'Internet 4G/5G LTE de alta velocidad', 'Activación inmediata por código QR', 'Compartir Datos (Hotspot)'];
}

export function formatDataGB(dataAmount: string | null, isFup: boolean | null): string {
  if (isFup) return 'Ilimitado';
  const value = Number(dataAmount);
  if (!dataAmount || Number.isNaN(value)) return `${dataAmount ?? '?'} GB`;
  return `${value} GB`;
}

function mapPlan(row: CatalogPlanRow, destination: DestinationRow): Plan {
  return {
    id: row.id,
    destinationId: destination.slug,
    dataGB: formatDataGB(row.data_amount, row.is_fup),
    days: row.duration_days ?? 0,
    priceUSD: Math.round((row.price_final ?? 0) * 100) / 100,
    features: buildPlanFeatures(destination.name, row.operators),
    isPopular: !!row.is_recommended,
  };
}

/** El plan de precio mediano del destino lleva el badge "más popular". */
export function markPopularPlan(plans: Plan[]): Plan[] {
  if (plans.length < 2) return plans;
  const sorted = [...plans].sort((a, b) => a.priceUSD - b.priceUSD);
  const median = sorted[Math.floor(sorted.length / 2)];
  return plans.map((p) => (p.id === median.id ? { ...p, isPopular: true } : p));
}

export interface UiCatalog {
  destinations: Destination[];
  plansByDestination: Record<string, Plan[]>;
}

/**
 * Cruza destinos curados con planes sincronizados (destination.iso_match ↔
 * plan.iso_country). SOLO se muestran destinos con ≥1 plan activo con precio:
 * la landing refleja el catálogo real, nada de planes inventados.
 */
export function buildCatalog(destinationRows: DestinationRow[], planRows: CatalogPlanRow[]): UiCatalog {
  const plansByIso = new Map<string, CatalogPlanRow[]>();
  for (const plan of planRows) {
    if (!plan.iso_country || plan.price_final === null) continue;
    const list = plansByIso.get(plan.iso_country) ?? [];
    list.push(plan);
    plansByIso.set(plan.iso_country, list);
  }

  const destinations: Destination[] = [];
  const plansByDestination: Record<string, Plan[]> = {};

  for (const dest of destinationRows) {
    const planRowsForDest = dest.iso_match ? (plansByIso.get(dest.iso_match) ?? []) : [];
    if (planRowsForDest.length === 0) continue;

    destinations.push({
      id: dest.slug,
      name: dest.name,
      code: dest.code,
      region: dest.region as Destination['region'],
      popular: dest.popular ?? false,
      flag: dest.flag,
      searchAliases: Array.isArray(dest.search_aliases) ? (dest.search_aliases as string[]) : [],
    });

    const mapped = planRowsForDest
      .map((row) => mapPlan(row, dest))
      .sort((a, b) => a.priceUSD - b.priceUSD);
    // Si el admin marcó algún plan como recomendado en este destino, se respeta
    // esa marca (mapPlan ya puso isPopular). Si no, fallback al auto (mediana).
    const hasManual = planRowsForDest.some((r) => r.is_recommended);
    plansByDestination[dest.slug] = hasManual ? mapped : markPopularPlan(mapped);
  }

  return { destinations, plansByDestination };
}

export interface DeviceRow {
  brand: string | null;
  model: string | null;
  category: string | null;
}

/** Agrupa device_compat por marca con el orden que la UI espera (Apple primero, Otros último). */
export function groupDevices(rows: DeviceRow[]): Array<{ brand: string; models: string[] }> {
  const byBrand = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.brand || !row.model) continue;
    const list = byBrand.get(row.brand) ?? [];
    if (!list.includes(row.model)) list.push(row.model);
    byBrand.set(row.brand, list);
  }
  const preferredOrder = ['Apple', 'Samsung', 'Google'];
  const brands = [...byBrand.keys()].sort((a, b) => {
    const ia = preferredOrder.indexOf(a);
    const ib = preferredOrder.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    if (a === 'Otros') return 1;
    if (b === 'Otros') return -1;
    return a.localeCompare(b);
  });
  // 'Otros' siempre al final
  const sorted = brands.filter((b) => b !== 'Otros');
  if (byBrand.has('Otros')) sorted.push('Otros');
  return sorted.map((brand) => ({ brand, models: byBrand.get(brand)! }));
}
