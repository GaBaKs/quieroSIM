import { describe, expect, it, vi } from 'vitest';
import { err, ok } from '../../lib/result.ts';
import {
  sendQrDelivery,
  processPendingDeliveries,
  DeliveryErrorCodes,
  type DeliveryEsimRecord,
  type DeliveryStore,
  type EmailTransport,
  type QrDeliveryRecord,
} from '../delivery.ts';

/** Store in-memory: misma semántica que el de Supabase, sin red. */
function makeStore(esims: Record<string, DeliveryEsimRecord>) {
  const deliveries = new Map<string, QrDeliveryRecord & { lastError?: string; providerId?: string; langUsed?: string }>();
  let seq = 0;

  const store: DeliveryStore = {
    async getEsimForDelivery(esimId) {
      return esims[esimId] ?? null;
    },
    async getOrCreateDelivery(esimId) {
      const existing = [...deliveries.values()].find((d) => d.esimId === esimId);
      if (existing) return { ...existing };
      seq += 1;
      const row: QrDeliveryRecord = { id: `d${seq}`, esimId, status: 'pending', resendCount: 0, lastAttemptAt: null };
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

const ESIM: DeliveryEsimRecord = {
  esimId: 'e1',
  orderId: '290e0f9c-1a00-4540-9bd6-5e67540aa3fe',
  email: 'viajero@test.com',
  lang: 'ES',
  planName: 'United States 5GB_30D',
  lpa: 'LPA:1$smdp.io$K2-TEST01-MOCK01',
  iosTapLink: 'https://esimsetup.apple.com/x',
  orderStatus: 'fulfilled',
};

function okTransport() {
  const sendEmail = vi.fn((_params: Parameters<EmailTransport['sendEmail']>[0]) =>
    Promise.resolve(ok({ id: 'email_1' })),
  );
  return { transport: { sendEmail } as unknown as EmailTransport, sendEmail };
}

describe('sendQrDelivery', () => {
  it('envía el email con QR adjunto, idempotency key y marca sent', async () => {
    const { store, deliveries } = makeStore({ e1: ESIM });
    const { transport, sendEmail } = okTransport();

    const r = await sendQrDelivery('e1', { store, email: transport });
    expect(r).toEqual({ ok: true, data: { status: 'sent' } });

    const params = sendEmail.mock.calls[0][0] as Parameters<EmailTransport['sendEmail']>[0];
    expect(params.to).toBe('viajero@test.com');
    expect(params.html).toContain(ESIM.lpa);
    expect(params.attachments?.[0].filename).toBe('quierosim-esim-qr.png');
    expect(params.idempotencyKey).toBe('qr_delivery:d1:0');

    const row = deliveries.get('d1')!;
    expect(row.status).toBe('sent');
    expect(row.providerId).toBe('email_1');
    expect(row.langUsed).toBe('ES');
    expect(row.resendCount).toBe(1);
  });

  it('re-disparo automático sobre una entrega sent → no-op (no manda otro email)', async () => {
    const { store } = makeStore({ e1: ESIM });
    const { transport, sendEmail } = okTransport();

    await sendQrDelivery('e1', { store, email: transport });
    const again = await sendQrDelivery('e1', { store, email: transport });

    expect(again).toEqual({ ok: true, data: { status: 'already_sent' } });
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it('orden no fulfilled o sin QR → NOT_READY (jamás se envía a medias)', async () => {
    const { store } = makeStore({ e1: { ...ESIM, orderStatus: 'paid' }, e2: { ...ESIM, esimId: 'e2', lpa: null } });
    const { transport, sendEmail } = okTransport();

    const r1 = await sendQrDelivery('e1', { store, email: transport });
    const r2 = await sendQrDelivery('e2', { store, email: transport });
    expect(!r1.ok && r1.error.code).toBe(DeliveryErrorCodes.NOT_READY);
    expect(!r2.ok && r2.error.code).toBe(DeliveryErrorCodes.NOT_READY);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('sin RESEND_API_KEY → failed RESEND_NOT_CONFIGURED sin consumir presupuesto', async () => {
    const { store, deliveries } = makeStore({ e1: ESIM });

    const r = await sendQrDelivery('e1', { store, email: null });
    expect(!r.ok && r.error.code).toBe(DeliveryErrorCodes.NOT_CONFIGURED);

    const row = deliveries.get('d1')!;
    expect(row.status).toBe('failed');
    expect(row.lastError).toBe('RESEND_NOT_CONFIGURED');
    expect(row.resendCount).toBe(0); // el cron podrá reintentar cuando haya key
  });

  it('error del proveedor → failed con last_error y consume presupuesto', async () => {
    const { store, deliveries } = makeStore({ e1: ESIM });
    const transport: EmailTransport = {
      sendEmail: async () => err('EMAIL_SEND_FAILED', 'Resend HTTP 500'),
    };

    const r = await sendQrDelivery('e1', { store, email: transport });
    expect(!r.ok && r.error.code).toBe(DeliveryErrorCodes.SEND_FAILED);
    const row = deliveries.get('d1')!;
    expect(row.status).toBe('failed');
    expect(row.lastError).toContain('Resend HTTP 500');
    expect(row.resendCount).toBe(1);
  });

  it('reenvío manual: respeta límite de 3 y cooldown de 60s', async () => {
    const { store, deliveries } = makeStore({ e1: ESIM });
    const { transport, sendEmail } = okTransport();

    // Primer envío (automático) + cooldown activo para el manual inmediato.
    await sendQrDelivery('e1', { store, email: transport });
    const tooSoon = await sendQrDelivery('e1', { store, email: transport }, { manual: true });
    expect(!tooSoon.ok && tooSoon.error.code).toBe(DeliveryErrorCodes.RESEND_LIMIT);

    // Pasado el cooldown puede reenviar hasta llegar a 3 envíos contados.
    const row = deliveries.get('d1')!;
    row.lastAttemptAt = new Date(Date.now() - 120_000).toISOString();
    const second = await sendQrDelivery('e1', { store, email: transport }, { manual: true });
    expect(second.ok).toBe(true);

    row.lastAttemptAt = new Date(Date.now() - 120_000).toISOString();
    const third = await sendQrDelivery('e1', { store, email: transport }, { manual: true });
    expect(third.ok).toBe(true);

    row.lastAttemptAt = new Date(Date.now() - 120_000).toISOString();
    const fourth = await sendQrDelivery('e1', { store, email: transport }, { manual: true });
    expect(!fourth.ok && fourth.error.code).toBe(DeliveryErrorCodes.RESEND_LIMIT);
    expect(sendEmail).toHaveBeenCalledTimes(3);
  });
});

describe('processPendingDeliveries', () => {
  it('barre pendientes/fallidas y reporta el resultado', async () => {
    const { store } = makeStore({
      e1: ESIM,
      e2: { ...ESIM, esimId: 'e2', email: 'otro@test.com' },
    });
    // Crear las dos entregas como failed (p.ej. corrida previa sin API key).
    await sendQrDelivery('e1', { store, email: null });
    await sendQrDelivery('e2', { store, email: null });

    const { transport, sendEmail } = okTransport();
    const r = await processPendingDeliveries({ store, email: transport });

    expect(r).toEqual({ ok: true, data: { processed: 2, sent: 2, failed: 0 } });
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });
});
