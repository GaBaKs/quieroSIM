import { describe, expect, it, vi } from 'vitest';
import { createYesimMock } from '../mock/handler.ts';
import { MOCK_PLANS } from '../mock/fixtures.ts';

async function callJson(mock: ReturnType<typeof createYesimMock>, url: string, init?: RequestInit) {
  const response = await mock.fetchHandler(url, init);
  return { status: response.status, body: await response.json() };
}

describe('mock YeSim — fidelidad del contrato', () => {
  it('/plans devuelve los campos numéricos como STRINGS (rareza real)', async () => {
    const mock = createYesimMock();
    const { body } = await callJson(mock, 'https://m/plans');
    expect(typeof body[0].days).toBe('string');
    expect(typeof body[0].price).toBe('string');
    expect(body[0].id).toMatch(/^[0-9a-f]{32}$/); // hash hex 32
  });

  it('top-up: repetir add_plan_iccid con el mismo plan ACUMULA datos', async () => {
    const mock = createYesimMock();
    const esim = (await callJson(mock, 'https://m/new_esim?user_id=1')).body;
    const plan = MOCK_PLANS[2]; // Spain 5GB
    const activate = () =>
      callJson(mock, `https://m/add_plan_iccid?iccid=${esim.iccid}&plan_id=${plan.id}`, { method: 'POST' });
    await activate();
    await activate();
    const info = (await callJson(mock, `https://m/sim_info?iccid=${esim.iccid}`)).body;
    expect(info.data_package_mb).toBe(Number(plan.data) * 1024 * 2);
  });

  it('el 4º change_esim falla (límite real de 3 por cuenta)', async () => {
    const mock = createYesimMock();
    const user = (await callJson(mock, 'https://m/new_user?email=a@b.com', { method: 'POST' })).body;
    let esim = (await callJson(mock, `https://m/new_esim?user_id=${user.user_id}`)).body;
    for (let i = 0; i < 3; i++) {
      const r = await callJson(mock, `https://m/change_esim?iccid=${esim.iccid}`, { method: 'POST' });
      expect(r.body.iccid).toBeDefined();
      esim = r.body;
    }
    const fourth = await callJson(mock, `https://m/change_esim?iccid=${esim.iccid}`, { method: 'POST' });
    expect(Array.isArray(fourth.body)).toBe(true); // error formato array
    expect(fourth.body[0]).toContain('No more than 3 replacements');
  });

  it('change_esim transfiere plan y datos, y marca la vieja is_deleted="1"', async () => {
    const mock = createYesimMock();
    const esim = (await callJson(mock, `https://m/new_esim?user_id=1&plan_id=${MOCK_PLANS[0].id}`)).body;
    const replacement = (await callJson(mock, `https://m/change_esim?iccid=${esim.iccid}`, { method: 'POST' })).body;
    expect(replacement.active_plan_id).toBe(MOCK_PLANS[0].id);
    expect(replacement.data_package_mb).toBe(esim.data_package_mb);
    const old = (await callJson(mock, `https://m/sim_info?iccid=${esim.iccid}`)).body;
    expect(old.is_deleted).toBe('1');
  });

  it('cancel_plan sin plan activo devuelve el error EXACTO documentado', async () => {
    const mock = createYesimMock();
    const esim = (await callJson(mock, 'https://m/new_esim?user_id=1')).body;
    const r = await callJson(mock, `https://m/cancel_plan?iccid=${esim.iccid}`, { method: 'POST' });
    expect(r.body[0]).toBe(`The eSIM with iccid ${esim.iccid} doesn't have an active plan.`);
  });

  it('bulk_sim_info pagina de a 100 y reporta found/failed', async () => {
    const mock = createYesimMock();
    const iccids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const esim = (await callJson(mock, 'https://m/new_esim?user_id=1')).body;
      iccids.push(esim.iccid);
    }
    iccids.push('1111111111111111111'); // inexistente
    const r = await callJson(mock, 'https://m/bulk_sim_info', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ iccids }),
    });
    expect(r.body.pagination.per_page).toBe(100);
    expect(r.body.summary).toEqual({ found: 3, failed: 1 });
    const failedItem = r.body.data.find((d: { error: string | null }) => d.error !== null);
    expect(failedItem.status).toBe('error');
  });

  it('issue_esim emite lote con vouchers', async () => {
    const mock = createYesimMock();
    const r = await callJson(mock, `https://m/issue_esim?plan_id=${MOCK_PLANS[0].id}&count=3&voucher=1`, {
      method: 'POST',
    });
    expect(r.body.esims).toHaveLength(3);
    expect(r.body.esims[0].is_voucher).toBe(true);
    expect(r.body.esims[0].voucher_status).toBe('Available');
    expect(r.body.esims[0].voucher_code).toBeDefined();
  });

  it('set_notification_url devuelve el string pelado "OK"', async () => {
    const mock = createYesimMock();
    const r = await callJson(mock, 'https://m/set_notification_url?url=https://receptor.test/webhook', {
      method: 'POST',
    });
    expect(r.body).toBe('OK');
  });

  it('valida el token cuando está configurado', async () => {
    const mock = createYesimMock({ token: 'correcto' });
    const bad = await callJson(mock, 'https://m/plans?token=incorrecto');
    expect(bad.body[0]).toBe('Invalid token.');
    const good = await callJson(mock, 'https://m/plans?token=correcto');
    expect(Array.isArray(good.body)).toBe(true);
  });
});

describe('mock YeSim — webhooks salientes', () => {
  it('EsimStatus postea el payload exacto del doc contra el receptor', async () => {
    const received: unknown[] = [];
    const webhookFetch = vi.fn(async (_url: unknown, init?: RequestInit) => {
      received.push(JSON.parse(String(init?.body)));
      return new Response('ok');
    }) as unknown as typeof fetch;

    const mock = createYesimMock({ webhookFetch });
    const esim = (await (await mock.fetchHandler('https://m/new_esim?user_id=1')).json());

    await mock.triggerWebhook({ type: 'EsimStatus', iccid: esim.iccid, status: 'Installed' }, 'https://receptor.test/yesim');

    expect(received).toEqual([{ type: 'EsimStatus', iccid: esim.iccid, status: 'Installed' }]);
    // y el estado interno quedó consistente para el próximo sim_info
    const info = await (await mock.fetchHandler(`https://m/sim_info?iccid=${esim.iccid}`)).json();
    expect(info.status_qr).toBe('Installed');
  });

  it('PackageUsage trae unitsBefore/unitsAfter/thresholdPercentage y actualiza consumo', async () => {
    const mock = createYesimMock();
    const esim = await (await mock.fetchHandler(`https://m/new_esim?user_id=1&plan_id=${MOCK_PLANS[0].id}`)).json();

    const payload = await mock.triggerWebhook({ type: 'PackageUsage', iccid: esim.iccid, thresholdPercentage: 50 });

    expect(payload).toMatchObject({ type: 'PackageUsage', iccid: esim.iccid, thresholdPercentage: 50 });
    if (payload.type === 'PackageUsage') {
      expect(payload.unitsAfter).toBeGreaterThan(payload.unitsBefore);
    }
    const info = await (await mock.fetchHandler(`https://m/sim_info?iccid=${esim.iccid}`)).json();
    expect(info.data_used_mb).toBe(info.data_package_mb / 2);
  });

  it('usa la URL registrada vía set_notification_url si no se pasa receptor', async () => {
    const calls: string[] = [];
    const webhookFetch = vi.fn(async (url: unknown) => {
      calls.push(String(url));
      return new Response('ok');
    }) as unknown as typeof fetch;

    const mock = createYesimMock({ webhookFetch });
    await mock.fetchHandler('https://m/set_notification_url?url=https://registrado.test/hook', { method: 'POST' });
    const esim = await (await mock.fetchHandler('https://m/new_esim?user_id=1')).json();
    await mock.triggerWebhook({ type: 'EsimStatus', iccid: esim.iccid, status: 'Enabled' });

    expect(calls).toEqual(['https://registrado.test/hook']);
  });
});

describe('mock YeSim — inyección de fallos', () => {
  it('failNext produce el fallo y después se recupera', async () => {
    const mock = createYesimMock();
    mock.failNext(1, '500');
    const failed = await mock.fetchHandler('https://m/plans');
    expect(failed.status).toBe(500);
    const recovered = await mock.fetchHandler('https://m/plans');
    expect(recovered.status).toBe(200);
  });

  it('failNext network lanza excepción de red', async () => {
    const mock = createYesimMock();
    mock.failNext(1, 'network');
    await expect(mock.fetchHandler('https://m/plans')).rejects.toThrow('fetch failed');
  });
});
