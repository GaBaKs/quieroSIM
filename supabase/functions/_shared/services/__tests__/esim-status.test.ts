import { describe, expect, it } from 'vitest';
import { createYesimClient } from '../../yesim/client.ts';
import { createYesimMock } from '../../yesim/mock/handler.ts';
import { MOCK_PLANS } from '../../yesim/mock/fixtures.ts';
import {
  handleYesimWebhook,
  syncEsimStatuses,
  mapYesimStatus,
  type EsimStatusStore,
  type EsimStatusUpdate,
} from '../esim-status.ts';

/** Store in-memory con la misma semántica que el de Supabase. */
function makeStore(esims: Array<{ id: string; iccid: string }>) {
  const events: Array<{ id: string; eventType: string; iccid: string | null; result: string }> = [];
  const updates = new Map<string, EsimStatusUpdate>();

  const store: EsimStatusStore = {
    async findEsimByIccid(iccid) {
      return esims.find((e) => e.iccid === iccid) ?? null;
    },
    async recordWebhookEvent(eventType, iccid) {
      const id = `ev${events.length + 1}`;
      events.push({ id, eventType, iccid, result: 'received' });
      return id;
    },
    async setWebhookResult(eventId, result) {
      events.find((e) => e.id === eventId)!.result = result;
    },
    async applyStatusUpdate(esimId, update) {
      updates.set(esimId, { ...updates.get(esimId), ...update });
    },
    async listActiveIccids(limit) {
      return esims.slice(0, limit).map((e) => e.iccid);
    },
  };

  return { store, events, updates };
}

/** Mock + cliente in-process (con estado DENTRO del test) + una eSIM creada. */
async function makeYesimWithEsim() {
  const mock = createYesimMock({ token: 't' });
  const client = createYesimClient({ baseUrl: 'https://m', token: 't', fetchFn: mock.fetchHandler, retryBaseDelayMs: 1 });
  const esim = await client.newEsim({});
  if (!esim.ok) throw new Error('mock newEsim falló');
  await client.addPlanToIccid({ iccid: esim.data.iccid, planId: MOCK_PLANS[0].id, paymentId: 'order-1' });
  return { mock, client, iccid: esim.data.iccid };
}

describe('mapYesimStatus', () => {
  it('mapea los 5 estados del contrato al check de la BD', () => {
    expect(mapYesimStatus('Released')).toBe('generated');
    expect(mapYesimStatus('Installed')).toBe('installed');
    expect(mapYesimStatus('Enabled')).toBe('active');
    expect(mapYesimStatus('Disabled')).toBe('expired');
    expect(mapYesimStatus('Deleted')).toBe('expired');
  });
});

describe('handleYesimWebhook', () => {
  it('EsimStatus: registra el evento, CONFIRMA con sim_info y aplica el estado', async () => {
    const { mock, client, iccid } = await makeYesimWithEsim();
    const { store, events, updates } = makeStore([{ id: 'e1', iccid }]);

    const payload = await mock.triggerWebhook({ type: 'EsimStatus', iccid, status: 'Installed' });
    const r = await handleYesimWebhook(payload, { store, yesim: client });

    expect(r.ok && r.data.result).toBe('processed');
    expect(events[0]).toMatchObject({ eventType: 'EsimStatus', iccid, result: 'processed' });
    const update = updates.get('e1')!;
    expect(update.statusQr).toBe('installed');
    expect(update.yesimStatusRaw).toBe('Installed');
    expect(update.dataPackageMb).toBeGreaterThan(0); // sim_info trae el consumo completo
  });

  it('PackageUsage: aplica el consumo confirmado por sim_info', async () => {
    const { mock, client, iccid } = await makeYesimWithEsim();
    const { store, updates } = makeStore([{ id: 'e1', iccid }]);

    const payload = await mock.triggerWebhook({ type: 'PackageUsage', iccid, thresholdPercentage: 50 });
    const r = await handleYesimWebhook(payload, { store, yesim: client });

    expect(r.ok && r.data.result).toBe('processed');
    const update = updates.get('e1')!;
    expect(update.dataUsedMb).toBeCloseTo((update.dataPackageMb ?? 0) / 2, 1);
  });

  it('ICCID ajeno: queda registrado como ignored_unknown_iccid y NO toca nada', async () => {
    const { client } = await makeYesimWithEsim();
    const { store, events, updates } = makeStore([]); // ninguna eSIM nuestra

    const r = await handleYesimWebhook(
      { type: 'EsimStatus', iccid: '8999999999999999999', status: 'Enabled' },
      { store, yesim: client },
    );

    expect(r.ok && r.data.result).toBe('ignored_unknown_iccid');
    expect(events).toHaveLength(1);
    expect(updates.size).toBe(0);
  });

  it('payload inválido: registrado como invalid_payload, sin efectos', async () => {
    const { client } = await makeYesimWithEsim();
    const { store, events, updates } = makeStore([{ id: 'e1', iccid: 'x' }]);

    const r = await handleYesimWebhook({ garbage: true }, { store, yesim: client });

    expect(r.ok && r.data.result).toBe('invalid_payload');
    expect(events[0].eventType).toBe('unknown');
    expect(updates.size).toBe(0);
  });

  it('sin confirmación de sim_info NO aplica nada (salvo rama dev explícita)', async () => {
    const { store, updates } = makeStore([{ id: 'e1', iccid: '8948650000031111111' }]);
    // Mock NUEVO sin la eSIM: sim_info responde unknown-iccid (caso stateless real).
    const mock = createYesimMock({ token: 't' });
    const client = createYesimClient({ baseUrl: 'https://m', token: 't', fetchFn: mock.fetchHandler, retryBaseDelayMs: 1 });
    const payload = { type: 'EsimStatus', iccid: '8948650000031111111', status: 'Enabled' };

    const strict = await handleYesimWebhook(payload, { store, yesim: client });
    expect(strict.ok && strict.data.result).toContain('error_confirming');
    expect(updates.size).toBe(0);

    const dev = await handleYesimWebhook(payload, { store, yesim: client, allowUnconfirmed: true });
    expect(dev.ok && dev.data.result).toBe('processed_unconfirmed_dev');
    expect(updates.get('e1')!.statusQr).toBe('active');
  });
});

describe('syncEsimStatuses', () => {
  it('un webhook PERDIDO lo recupera la reconciliación con bulk_sim_info', async () => {
    const { mock, client, iccid } = await makeYesimWithEsim();
    const { store, updates } = makeStore([{ id: 'e1', iccid }]);

    // El estado cambió en YeSim pero el webhook nunca nos llegó:
    await mock.triggerWebhook({ type: 'EsimStatus', iccid, status: 'Enabled' });
    expect(updates.size).toBe(0);

    const r = await syncEsimStatuses({ store, yesim: client });

    expect(r).toEqual({ ok: true, data: { checked: 1, updated: 1, failed: 0 } });
    const update = updates.get('e1')!;
    expect(update.statusQr).toBe('active');
    expect(update.yesimStatusRaw).toBe('Enabled');
  });

  it('ICCIDs que el proveedor no conoce se saltean sin romper el lote', async () => {
    const { client, iccid } = await makeYesimWithEsim();
    const { store, updates } = makeStore([
      { id: 'e1', iccid },
      { id: 'e2', iccid: '8999999999999999999' },
    ]);

    const r = await syncEsimStatuses({ store, yesim: client });

    expect(r).toEqual({ ok: true, data: { checked: 2, updated: 1, failed: 1 } });
    expect(updates.has('e1')).toBe(true);
    expect(updates.has('e2')).toBe(false);
  });
});
