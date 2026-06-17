import { describe, expect, it } from 'vitest';
import { runProvision, type ProvisionJobState, type ProvisionStore } from '../provisioning.ts';
import { createYesimClient } from '../../yesim/client.ts';
import { createYesimMock } from '../../yesim/mock/handler.ts';
import { MOCK_PLANS } from '../../yesim/mock/fixtures.ts';
import type { YesimEsim } from '../../yesim/types.ts';

/**
 * La verificación de los 4 candados de "una emisión por pago" (Plan Backend §5.3),
 * con la máquina completa corriendo contra el mock fiel de YeSim.
 */

const PLAN = MOCK_PLANS[0]; // United States 5GB

interface MemoryState {
  job: { state: ProvisionJobState; attemptCount: number; lockedAt: number | null; history: unknown[] };
  order: { status: string };
  esim: { id: string; iccid: string; raw?: YesimEsim } | null;
  audits: Array<{ action: string; payload: Record<string, unknown> }>;
}

function createMemoryStore(orderId: string, initialOrderStatus = 'paid') {
  const state: MemoryState = {
    job: { state: 'queued', attemptCount: 0, lockedAt: null, history: [] },
    order: { status: initialOrderStatus },
    esim: null,
    audits: [],
  };

  const store: ProvisionStore = {
    async lockJob(id) {
      if (id !== orderId) return null;
      const now = Date.now();
      if (state.job.lockedAt !== null && now - state.job.lockedAt < 120_000) return null;
      state.job.lockedAt = now;
      return { orderId, state: state.job.state, attemptCount: state.job.attemptCount };
    },
    async releaseJob() {
      state.job.lockedAt = null;
    },
    async transition(_id, newState, note) {
      state.job.state = newState;
      state.job.history.push({ state: newState, note });
    },
    async recordFailure(_id, error) {
      state.job.attemptCount += 1;
      state.job.history.push({ error });
    },
    async getOrder(id) {
      if (id !== orderId) return null;
      return { id, status: state.order.status, email: 'viajero@test.com', userId: null, planYesimId: PLAN.id };
    },
    async findEsimByOrder() {
      return state.esim ? { id: state.esim.id, iccid: state.esim.iccid } : null;
    },
    async insertEsim(_id, _userId, esim) {
      state.esim = { id: 'esim-row-1', iccid: esim.iccid, raw: esim };
      return { id: 'esim-row-1', iccid: esim.iccid };
    },
    async updateEsimFromSimInfo(_esimId, info) {
      state.esim = state.esim ? { ...state.esim, raw: info } : null;
    },
    async setOrderStatus(_id, status) {
      state.order.status = status;
    },
    async logAudit(action, payload) {
      state.audits.push({ action, payload });
    },
  };

  return { store, state };
}

function makeYesim(mock: ReturnType<typeof createYesimMock>) {
  return createYesimClient({
    baseUrl: 'https://yesim.mock',
    token: 'mock-token',
    fetchFn: mock.fetchHandler,
    retryBaseDelayMs: 1,
    maxRetries: 0, // los reintentos los maneja la máquina, no el cliente (tests más deterministas)
  });
}

const fastDeps = { retryDelayMs: 1 };

describe('runProvision — camino feliz', () => {
  it('queued → fulfilled: emite UNA eSIM, la persiste y cierra la orden', async () => {
    const mock = createYesimMock();
    const { store, state } = createMemoryStore('order-1');
    const result = await runProvision('order-1', { store, yesim: makeYesim(mock), ...fastDeps });

    expect(result).toEqual({ ok: true, data: { state: 'fulfilled' } });
    expect(state.order.status).toBe('fulfilled');
    expect(state.job.state).toBe('fulfilled');
    expect(state.esim?.iccid).toMatch(/^\d{19}$/);
    expect(state.esim?.raw?.activePlanId).toBe(PLAN.id); // confirmado vía sim_info
    expect(mock.state.esims.size).toBe(1); // UNA sola eSIM emitida en YeSim
    expect(mock.state.orders[0].payment_id).toBe('order-1'); // candado 4: payment_id = orderId
  });
});

describe('runProvision — candados de idempotencia', () => {
  it('lock: una segunda ejecución concurrente no emite', async () => {
    const mock = createYesimMock();
    const { store } = createMemoryStore('order-1');
    const yesim = makeYesim(mock);

    const [first, second] = await Promise.all([
      runProvision('order-1', { store, yesim, ...fastDeps }),
      runProvision('order-1', { store, yesim, ...fastDeps }),
    ]);

    const codes = [first, second].map((r) => (r.ok ? 'OK' : r.error.code)).sort();
    expect(codes).toEqual(['OK', 'PROVISION_LOCKED']);
    expect(mock.state.esims.size).toBe(1);
  });

  it('re-ejecutar tras fulfilled es no-op (no segunda eSIM)', async () => {
    const mock = createYesimMock();
    const { store } = createMemoryStore('order-1');
    const yesim = makeYesim(mock);

    await runProvision('order-1', { store, yesim, ...fastDeps });
    const again = await runProvision('order-1', { store, yesim, ...fastDeps });

    expect(again).toEqual({ ok: true, data: { state: 'fulfilled' } });
    expect(mock.state.esims.size).toBe(1);
  });

  it('no emite si la orden no está pagada', async () => {
    const mock = createYesimMock();
    const { store } = createMemoryStore('order-1', 'pending');
    const result = await runProvision('order-1', { store, yesim: makeYesim(mock), ...fastDeps });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PROVISION_INVALID_ORDER_STATUS');
    expect(mock.state.esims.size).toBe(0);
  });
});

describe('runProvision — fallos y reanudación (§5.4)', () => {
  it('fallo transitorio en add_plan: reintenta dentro de la corrida y llega a fulfilled', async () => {
    const mock = createYesimMock();
    const { store, state } = createMemoryStore('order-1');
    const yesim = makeYesim(mock);

    // new_esim OK; el PRIMER add_plan falla (transitorio) y el reintento entra.
    // El fallo se inyecta interceptando addPlanToIccid en el momento exacto.
    let addPlanCalls = 0;
    const flakyYesim = {
      ...yesim,
      addPlanToIccid: async (params: Parameters<typeof yesim.addPlanToIccid>[0]) => {
        addPlanCalls += 1;
        if (addPlanCalls === 1) {
          return { ok: false as const, error: { code: 'YESIM_UNAVAILABLE', message: 'timeout simulado' } };
        }
        return yesim.addPlanToIccid(params);
      },
    };

    const result = await runProvision('order-1', { store, yesim: flakyYesim, ...fastDeps });

    expect(result).toEqual({ ok: true, data: { state: 'fulfilled' } });
    expect(addPlanCalls).toBe(2); // 1 fallo + 1 reintento exitoso
    expect(state.job.attemptCount).toBe(1); // el fallo quedó registrado
    expect(state.order.status).toBe('fulfilled');
  });

  it('fallo persistente: orden a failed_needs_review, job QUEDA en el paso exacto, audit registrado', async () => {
    const mock = createYesimMock();
    const { store, state } = createMemoryStore('order-1');
    const yesim = makeYesim(mock);
    const brokenYesim = {
      ...yesim,
      addPlanToIccid: async () => ({
        ok: false as const,
        error: { code: 'YESIM_UNAVAILABLE', message: 'caído' },
      }),
    };

    const result = await runProvision('order-1', { store, yesim: brokenYesim, ...fastDeps });

    expect(result).toEqual({ ok: true, data: { state: 'failed_needs_review' } });
    expect(state.order.status).toBe('failed_needs_review');
    expect(state.job.state).toBe('activating_plan'); // punto exacto de reanudación
    expect(state.audits[0]?.action).toBe('provision_needs_review');
    expect(mock.state.esims.size).toBe(1); // la eSIM YA fue emitida — no debe re-emitirse
  });

  it('reintento manual tras needs_review reanuda desde activating_plan SIN segunda eSIM', async () => {
    const mock = createYesimMock();
    const { store, state } = createMemoryStore('order-1');
    const yesim = makeYesim(mock);

    // Primera corrida: add_plan siempre falla → needs_review con eSIM ya creada.
    const broken = {
      ...yesim,
      addPlanToIccid: async () => ({ ok: false as const, error: { code: 'X', message: 'caído' } }),
    };
    await runProvision('order-1', { store, yesim: broken, ...fastDeps });
    expect(state.order.status).toBe('failed_needs_review');
    const iccidBefore = state.esim?.iccid;

    // Reintento manual (admin): mismo mock (estado YeSim persiste), cliente sano.
    const retry = await runProvision('order-1', { store, yesim, ...fastDeps });

    expect(retry).toEqual({ ok: true, data: { state: 'fulfilled' } });
    expect(state.order.status).toBe('fulfilled');
    expect(state.esim?.iccid).toBe(iccidBefore); // misma eSIM
    expect(mock.state.esims.size).toBe(1); // JAMÁS una segunda emisión
  });
});
