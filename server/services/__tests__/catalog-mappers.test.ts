import { describe, expect, it } from 'vitest';
import {
  buildCatalog,
  buildPlanFeatures,
  formatDataGB,
  groupDevices,
  markPopularPlan,
  type CatalogPlanRow,
  type DestinationRow,
} from '../catalog-mappers';
import type { Plan } from '@/lib/types';

const destUS: DestinationRow = {
  slug: 'eeuu',
  name: 'Estados Unidos',
  code: 'US',
  region: 'Americas',
  popular: true,
  flag: '🇺🇸',
  search_aliases: ['USA', 'EEUU'],
  iso_match: 'US',
};

const destSinPlanes: DestinationRow = {
  slug: 'latam-multi',
  name: 'América Latina',
  code: 'LATAM',
  region: 'Global',
  popular: false,
  flag: '🌎',
  search_aliases: [],
  iso_match: 'LATAM',
};

function planRow(overrides: Partial<CatalogPlanRow>): CatalogPlanRow {
  return {
    id: 'uuid-1',
    name: 'United States 5GB_30D',
    iso_country: 'US',
    duration_days: 30,
    data_amount: '5',
    is_fup: false,
    operators: 'T-Mobile, AT&T',
    price_final: 13,
    ...overrides,
  };
}

describe('formatDataGB', () => {
  it('formatea GB y respeta decimales', () => {
    expect(formatDataGB('5', false)).toBe('5 GB');
    expect(formatDataGB('0.49', false)).toBe('0.49 GB');
  });
  it('is_fup → Ilimitado (la UI lo traduce)', () => {
    expect(formatDataGB('50', true)).toBe('Ilimitado');
  });
});

describe('buildPlanFeatures', () => {
  it('usa la red del operador cuando existe (regla "Red ..." del featureTranslator)', () => {
    const features = buildPlanFeatures('Estados Unidos', 'T-Mobile, AT&T');
    expect(features[0]).toBe('Red T-Mobile, AT&T');
  });
  it('cae a "Red local Premium en {destino}" con operators genérico', () => {
    expect(buildPlanFeatures('Europa Regional', 'Multiple')[0]).toBe('Red local Premium en Europa Regional');
    expect(buildPlanFeatures('España', null)[0]).toBe('Red local Premium en España');
  });
  it('solo usa frases que featureTranslator conoce', () => {
    const features = buildPlanFeatures('España', null);
    expect(features).toContain('Internet 4G/5G LTE de alta velocidad');
    expect(features).toContain('Activación inmediata por código QR');
    expect(features).toContain('Compartir Datos (Hotspot)');
  });
});

describe('markPopularPlan', () => {
  it('marca el plan de precio mediano', () => {
    const plans = [
      { id: 'a', priceUSD: 5 },
      { id: 'b', priceUSD: 13 },
      { id: 'c', priceUSD: 22 },
    ] as Plan[];
    const marked = markPopularPlan(plans);
    expect(marked.find((p) => p.id === 'b')?.isPopular).toBe(true);
    expect(marked.filter((p) => p.isPopular)).toHaveLength(1);
  });
  it('con un solo plan no marca nada', () => {
    const plans = [{ id: 'a', priceUSD: 5 }] as Plan[];
    expect(markPopularPlan(plans)[0].isPopular).toBeUndefined();
  });
});

describe('buildCatalog', () => {
  it('solo incluye destinos con planes activos con precio', () => {
    const { destinations, plansByDestination } = buildCatalog(
      [destUS, destSinPlanes],
      [planRow({})],
    );
    expect(destinations.map((d) => d.id)).toEqual(['eeuu']);
    expect(plansByDestination['eeuu']).toHaveLength(1);
    expect(plansByDestination['latam-multi']).toBeUndefined();
  });

  it('mapea a la forma exacta de la UI (id=uuid, destinationId=slug, ordenado por precio)', () => {
    const { plansByDestination, destinations } = buildCatalog(
      [destUS],
      [
        planRow({ id: 'uuid-caro', price_final: 22.4, data_amount: '10' }),
        planRow({ id: 'uuid-barato', price_final: 13 }),
      ],
    );
    const plans = plansByDestination['eeuu'];
    expect(plans.map((p) => p.id)).toEqual(['uuid-barato', 'uuid-caro']);
    expect(plans[0]).toMatchObject({
      destinationId: 'eeuu',
      dataGB: '5 GB',
      days: 30,
      priceUSD: 13,
    });
    expect(destinations[0]).toMatchObject({
      id: 'eeuu',
      name: 'Estados Unidos',
      code: 'US',
      region: 'Americas',
      popular: true,
      searchAliases: ['USA', 'EEUU'],
    });
  });

  it('excluye planes sin precio (sin fila en catalog_pricing)', () => {
    const { destinations } = buildCatalog([destUS], [planRow({ price_final: null })]);
    expect(destinations).toHaveLength(0);
  });
});

describe('groupDevices', () => {
  it('agrupa por marca, dedupe y deja Otros al final', () => {
    const grouped = groupDevices([
      { brand: 'Otros', model: 'Xiaomi 13 Pro', category: 'PHONE' },
      { brand: 'Apple', model: 'iPhone 15', category: 'PHONE' },
      { brand: 'Apple', model: 'iPhone 15', category: 'PHONE' }, // duplicado
      { brand: 'Samsung', model: 'Galaxy S24', category: 'PHONE' },
      { brand: null, model: 'sin marca', category: 'PHONE' }, // ignorada
    ]);
    expect(grouped.map((g) => g.brand)).toEqual(['Apple', 'Samsung', 'Otros']);
    expect(grouped[0].models).toEqual(['iPhone 15']);
  });
});
