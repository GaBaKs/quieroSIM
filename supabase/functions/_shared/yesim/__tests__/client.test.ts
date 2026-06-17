import { describe, expect, it, vi } from 'vitest';
import { createYesimClient } from '../client.ts';
import { createYesimMock } from '../mock/handler.ts';
import { MOCK_PLANS } from '../mock/fixtures.ts';

const TOKEN = 'tok-super-secreto-de-prueba';

function makeClient(overrides: Partial<Parameters<typeof createYesimClient>[0]> = {}) {
  const mock = createYesimMock({ token: TOKEN });
  const client = createYesimClient({
    baseUrl: 'https://yesim.mock',
    token: TOKEN,
    fetchFn: mock.fetchHandler,
    retryBaseDelayMs: 1,
    ...overrides,
  });
  return { client, mock };
}

describe('createYesimClient — normalización', () => {
  it('getPlans convierte strings a números y preserva el plan_id hash', async () => {
    const { client } = makeClient();
    const r = await client.getPlans();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const albania = r.data.find((p) => p.iso3 === 'ALB')!;
    expect(albania.id).toBe('d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8'); // string intacto
    expect(albania.days).toBe(1); // "1" → 1
    expect(albania.price).toBe(0.39); // "0.39" → 0.39
    expect(albania.dataGb).toBe(0.49);
    expect(albania.oldId).toBe(59950); // legacy numérico
    const sinOldId = r.data.find((p) => p.name === 'Spain Unlimited_30D')!;
    expect(sinOldId.oldId).toBeNull();
  });

  it('newEsim normaliza is_deleted "0" → false y tráfico ausente → null', async () => {
    const { client } = makeClient();
    const r = await client.newEsim({});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.isDeleted).toBe(false);
    expect(r.data.dataLeftMb).toBeNull();
    expect(r.data.statusQr).toBe('Released');
    expect(r.data.qrcode).toMatch(/^LPA:1\$/);
    expect(r.data.iccid).toMatch(/^\d{19}$/);
  });
});

describe('createYesimClient — flujo feliz completo (integración con el mock)', () => {
  it('new_user → new_esim → add_plan_iccid → sim_info', async () => {
    const { client } = makeClient();

    const user = await client.newUser('viajero@test.com');
    expect(user.ok).toBe(true);
    if (!user.ok) return;

    const esim = await client.newEsim({ userId: user.data.userId });
    expect(esim.ok).toBe(true);
    if (!esim.ok) return;
    expect(esim.data.activePlanId).toBeNull();

    const plan = MOCK_PLANS[0];
    const activation = await client.addPlanToIccid({
      iccid: esim.data.iccid,
      planId: plan.id,
      paymentId: 'order-interno-123',
    });
    expect(activation.ok).toBe(true);

    const info = await client.simInfo(esim.data.iccid);
    expect(info.ok).toBe(true);
    if (!info.ok) return;
    expect(info.data.activePlanId).toBe(plan.id);
    expect(info.data.dataPackageMb).toBe(Number(plan.data) * 1024);
    expect(info.data.dataLeftMb).toBe(Number(plan.data) * 1024);

    // el payment_id quedó como rastro de idempotencia en la orden de YeSim
    const orders = await client.getOrders(esim.data.iccid);
    expect(orders.ok).toBe(true);
    if (!orders.ok) return;
    expect(orders.data[0].paymentId).toBe('order-interno-123');
    expect(orders.data[0].costEur).toBe(Number(plan.price));
  });
});

describe('createYesimClient — reintentos y errores', () => {
  it('reintenta ante 500 y se recupera', async () => {
    const { client, mock } = makeClient();
    mock.failNext(1, '500');
    const r = await client.getPlans();
    expect(r.ok).toBe(true); // el segundo intento entra
  });

  it('reintenta ante fallo de red y se recupera', async () => {
    const { client, mock } = makeClient();
    mock.failNext(1, 'network');
    const r = await client.getPlans();
    expect(r.ok).toBe(true);
  });

  it('agota reintentos si el fallo persiste → YESIM_UNAVAILABLE', async () => {
    const { client, mock } = makeClient({ maxRetries: 1 });
    mock.failNext(5, '500');
    const r = await client.getPlans();
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('YESIM_UNAVAILABLE');
  });

  it('NO reintenta ante 4xx', async () => {
    let calls = 0;
    const fetchFn = vi.fn(async () => {
      calls += 1;
      return new Response('Bad Request', { status: 400 });
    }) as unknown as typeof fetch;
    const client = createYesimClient({ baseUrl: 'https://x', token: 't', fetchFn, retryBaseDelayMs: 1 });
    const r = await client.getPlans();
    expect(r.ok).toBe(false);
    expect(calls).toBe(1);
  });

  it('normaliza el error estilo array de strings (HTTP 200)', async () => {
    const { client } = makeClient();
    const r = await client.simInfo('8999999999999999999');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('YESIM_API_ERROR');
    expect(r.error.message).toContain("doesn't exist");
  });

  it('el token JAMÁS aparece en los mensajes de error', async () => {
    const failingFetch = (async () => {
      throw new TypeError(`fetch failed for https://yesim.mock/plans?token=${TOKEN}`);
    }) as unknown as typeof fetch;
    const client = createYesimClient({
      baseUrl: 'https://yesim.mock',
      token: TOKEN,
      fetchFn: failingFetch,
      maxRetries: 0,
      retryBaseDelayMs: 1,
    });
    const r = await client.getPlans();
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.message).not.toContain(TOKEN);
    expect(JSON.stringify(r.error)).not.toContain(TOKEN);
  });
});
