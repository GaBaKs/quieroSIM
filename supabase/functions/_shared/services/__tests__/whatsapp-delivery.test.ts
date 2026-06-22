import { describe, expect, it, vi } from 'vitest';
import { ok } from '../../lib/result.ts';
import {
  sendWhatsappDelivery,
  processPendingWhatsapp,
  WhatsappDeliveryErrorCodes,
  type WhatsappEsimRecord,
  type WhatsappDeliveryStore,
  type WhatsappDeliveryRecord,
  type WhatsappTransport,
  type QrHosting,
} from '../whatsapp-delivery.ts';

/** Store in-memory: misma semántica que el de Supabase (channel whatsapp), sin red. */
function makeStore(esims: Record<string, WhatsappEsimRecord>) {
  const deliveries = new Map<
    string,
    WhatsappDeliveryRecord & { lastError?: string; providerId?: string; langUsed?: string }
  >();
  let seq = 0;

  const store: WhatsappDeliveryStore = {
    async getEsimForDelivery(esimId) {
      return esims[esimId] ?? null;
    },
    async getOrCreateDelivery(esimId) {
      const existing = [...deliveries.values()].find((d) => d.esimId === esimId);
      if (existing) return { ...existing };
      seq += 1;
      const row: WhatsappDeliveryRecord = { id: `d${seq}`, esimId, status: 'pending', resendCount: 0, lastAttemptAt: null };
      deliveries.set(row.id, { ...row });
      return { ...row };
    },
    async recordAttempt(deliveryId, countAttempt) {
      const row = deliveries.get(deliveryId)!;
      row.lastAttemptAt = new Date().toISOString();
      if (countAttempt) row.resendCount += 1;
    },
    async markSent(deliveryId, providerMessageId, langUsed) {
      const row = deliveries.get(deliveryId)!;
      row.status = 'sent';
      row.providerId = providerMessageId;
      row.langUsed = langUsed;
      row.lastError = undefined;
    },
    async markFailed(deliveryId, error) {
      const row = deliveries.get(deliveryId)!;
      row.status = 'failed';
      row.lastError = error;
    },
    async listRetryable(limit) {
      return [...deliveries.values()]
        .filter((d) => d.status !== 'sent' && d.resendCount < 5)
        .slice(0, limit)
        .map((d) => d.esimId);
    },
  };

  return { store, deliveries };
}

function makeMedia() {
  const hostQr = vi.fn(async (_id: string, _png: string) => 'https://signed.example/qr.png');
  const purgeOld = vi.fn(async () => 0);
  return { media: { hostQr, purgeOld } as QrHosting, hostQr, purgeOld };
}

function okTransport() {
  const sendWhatsapp = vi.fn((_params: Parameters<WhatsappTransport['sendWhatsapp']>[0]) =>
    Promise.resolve(ok({ sid: 'SM_1' })),
  );
  return { transport: { sendWhatsapp } as unknown as WhatsappTransport, sendWhatsapp };
}

const ESIM: WhatsappEsimRecord = {
  esimId: 'e1',
  orderId: '290e0f9c-1a00-4540-9bd6-5e67540aa3fe',
  phone: '+54 911 5000-0000',
  lang: 'ES',
  planName: 'United States 5GB_30D',
  lpa: 'LPA:1$smdp.io$K2-TEST01-MOCK01',
  orderStatus: 'fulfilled',
};

describe('sendWhatsappDelivery', () => {
  it('manda el WhatsApp con media (URL firmada), normaliza el teléfono y marca sent', async () => {
    const { store, deliveries } = makeStore({ e1: ESIM });
    const { transport, sendWhatsapp } = okTransport();
    const { media, hostQr } = makeMedia();

    const r = await sendWhatsappDelivery('e1', { store, whatsapp: transport, media });
    expect(r).toEqual({ ok: true, data: { status: 'sent' } });

    const params = sendWhatsapp.mock.calls[0][0] as Parameters<WhatsappTransport['sendWhatsapp']>[0];
    expect(params.to).toBe('+5491150000000'); // normalizado a E.164
    expect(params.mediaUrl).toBe('https://signed.example/qr.png');
    expect(params.body).toContain('United States 5GB_30D');
    expect(hostQr).toHaveBeenCalledOnce();

    const row = deliveries.get('d1')!;
    expect(row.status).toBe('sent');
    expect(row.providerId).toBe('SM_1');
    expect(row.langUsed).toBe('ES');
    expect(row.resendCount).toBe(1);
  });

  it('re-disparo automático sobre una entrega sent → no-op', async () => {
    const { store } = makeStore({ e1: ESIM });
    const { transport, sendWhatsapp } = okTransport();
    const { media } = makeMedia();

    await sendWhatsappDelivery('e1', { store, whatsapp: transport, media });
    const again = await sendWhatsappDelivery('e1', { store, whatsapp: transport, media });

    expect(again).toEqual({ ok: true, data: { status: 'already_sent' } });
    expect(sendWhatsapp).toHaveBeenCalledTimes(1);
  });

  it('sin teléfono / sin QR / orden no fulfilled → NOT_READY (jamás se envía a medias)', async () => {
    const { store } = makeStore({
      e1: { ...ESIM, phone: null },
      e2: { ...ESIM, esimId: 'e2', lpa: null },
      e3: { ...ESIM, esimId: 'e3', orderStatus: 'paid' },
      e4: { ...ESIM, esimId: 'e4', phone: '123' }, // teléfono inválido
    });
    const { transport, sendWhatsapp } = okTransport();
    const { media, hostQr } = makeMedia();

    for (const id of ['e1', 'e2', 'e3', 'e4']) {
      const r = await sendWhatsappDelivery(id, { store, whatsapp: transport, media });
      expect(!r.ok && r.error.code).toBe(WhatsappDeliveryErrorCodes.NOT_READY);
    }
    expect(sendWhatsapp).not.toHaveBeenCalled();
    expect(hostQr).not.toHaveBeenCalled();
  });

  it('sin secrets de Twilio → failed WHATSAPP_NOT_CONFIGURED sin consumir presupuesto', async () => {
    const { store, deliveries } = makeStore({ e1: ESIM });
    const { media } = makeMedia();

    const r = await sendWhatsappDelivery('e1', { store, whatsapp: null, media });
    expect(!r.ok && r.error.code).toBe(WhatsappDeliveryErrorCodes.NOT_CONFIGURED);

    const row = deliveries.get('d1')!;
    expect(row.status).toBe('failed');
    expect(row.lastError).toBe(WhatsappDeliveryErrorCodes.NOT_CONFIGURED);
    expect(row.resendCount).toBe(0); // el cron podrá reintentar cuando haya secrets
  });

  it('error del proveedor → failed con last_error y consume presupuesto', async () => {
    const { store, deliveries } = makeStore({ e1: ESIM });
    const { media } = makeMedia();
    const transport: WhatsappTransport = {
      sendWhatsapp: async () => ({ ok: false, error: { code: 'WHATSAPP_SEND_FAILED', message: 'Twilio HTTP 500' } }),
    };

    const r = await sendWhatsappDelivery('e1', { store, whatsapp: transport, media });
    expect(!r.ok && r.error.code).toBe(WhatsappDeliveryErrorCodes.SEND_FAILED);
    const row = deliveries.get('d1')!;
    expect(row.status).toBe('failed');
    expect(row.lastError).toContain('Twilio HTTP 500');
    expect(row.resendCount).toBe(1);
  });

  it('reenvío manual: respeta límite de 3 y cooldown de 60s', async () => {
    const { store, deliveries } = makeStore({ e1: ESIM });
    const { transport, sendWhatsapp } = okTransport();
    const { media } = makeMedia();
    const deps = { store, whatsapp: transport, media };

    await sendWhatsappDelivery('e1', deps);
    const tooSoon = await sendWhatsappDelivery('e1', deps, { manual: true });
    expect(!tooSoon.ok && tooSoon.error.code).toBe(WhatsappDeliveryErrorCodes.RESEND_LIMIT);

    const row = deliveries.get('d1')!;
    row.lastAttemptAt = new Date(Date.now() - 120_000).toISOString();
    const second = await sendWhatsappDelivery('e1', deps, { manual: true });
    expect(second.ok).toBe(true);

    row.lastAttemptAt = new Date(Date.now() - 120_000).toISOString();
    const third = await sendWhatsappDelivery('e1', deps, { manual: true });
    expect(third.ok).toBe(true);

    row.lastAttemptAt = new Date(Date.now() - 120_000).toISOString();
    const fourth = await sendWhatsappDelivery('e1', deps, { manual: true });
    expect(!fourth.ok && fourth.error.code).toBe(WhatsappDeliveryErrorCodes.RESEND_LIMIT);
    expect(sendWhatsapp).toHaveBeenCalledTimes(3);
  });
});

describe('processPendingWhatsapp', () => {
  it('barre pendientes/fallidas, reporta el resultado y purga media', async () => {
    const { store } = makeStore({
      e1: ESIM,
      e2: { ...ESIM, esimId: 'e2', phone: '+14155238886' },
    });
    const { media } = makeMedia();
    // Crear las dos entregas como failed (corrida previa sin secrets).
    await sendWhatsappDelivery('e1', { store, whatsapp: null, media });
    await sendWhatsappDelivery('e2', { store, whatsapp: null, media });

    const { transport, sendWhatsapp } = okTransport();
    const { media: media2, purgeOld } = makeMedia();
    const r = await processPendingWhatsapp({ store, whatsapp: transport, media: media2 });

    expect(r).toEqual({ ok: true, data: { processed: 2, sent: 2, failed: 0, purged: 0 } });
    expect(sendWhatsapp).toHaveBeenCalledTimes(2);
    expect(purgeOld).toHaveBeenCalledOnce();
  });
});
