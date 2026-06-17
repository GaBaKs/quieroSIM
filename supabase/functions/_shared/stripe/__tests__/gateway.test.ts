import { describe, expect, it, vi } from 'vitest';
import Stripe from 'stripe';
import { createStripeGateway } from '../gateway.ts';

const WEBHOOK_SECRET = 'whsec_test_secret_de_prueba';

describe('stripe gateway — verificación de firma de webhook', () => {
  // Instancia real del SDK (no toca la red para firmas).
  const stripe = new Stripe('sk_test_dummy_no_network');
  const gateway = createStripeGateway(stripe);

  const payload = JSON.stringify({
    id: 'evt_test_1',
    object: 'event',
    type: 'payment_intent.succeeded',
    data: { object: { id: 'pi_123', metadata: { order_id: 'ord-1' } } },
  });

  it('acepta una firma válida y devuelve el evento', async () => {
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
    const r = await gateway.verifyWebhookEvent(payload, header, WEBHOOK_SECRET);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.id).toBe('evt_test_1');
    expect(r.data.type).toBe('payment_intent.succeeded');
  });

  it('rechaza una firma inválida', async () => {
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_otro_secreto' });
    const r = await gateway.verifyWebhookEvent(payload, header, WEBHOOK_SECRET);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('STRIPE_INVALID_SIGNATURE');
  });

  it('rechaza un payload adulterado tras la firma', async () => {
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
    const tampered = payload.replace('pi_123', 'pi_999');
    const r = await gateway.verifyWebhookEvent(tampered, header, WEBHOOK_SECRET);
    expect(r.ok).toBe(false);
  });
});

describe('stripe gateway — PaymentIntent y refund (instancia fake)', () => {
  function makeFake() {
    const piCreate = vi.fn(async (params: unknown) => ({
      id: 'pi_fake_1',
      client_secret: 'pi_fake_1_secret_x',
      ...(params as object),
    }));
    const refundCreate = vi.fn(async () => ({ id: 're_fake_1', status: 'succeeded' }));
    const fake = {
      paymentIntents: { create: piCreate },
      refunds: { create: refundCreate },
    } as unknown as Stripe;
    return { fake, piCreate, refundCreate };
  }

  it('createPaymentIntent manda monto, metadata.order_id e idempotencyKey', async () => {
    const { fake, piCreate } = makeFake();
    const gateway = createStripeGateway(fake);

    const r = await gateway.createPaymentIntent({
      amountMinor: 1300,
      currency: 'usd',
      orderId: 'ord-abc',
      receiptEmail: 'cliente@test.com',
    });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toEqual(expect.objectContaining({ id: 'pi_fake_1', clientSecret: 'pi_fake_1_secret_x' }));
    expect(piCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 1300,
        currency: 'usd',
        receipt_email: 'cliente@test.com',
        metadata: { order_id: 'ord-abc' },
      }),
      { idempotencyKey: 'order_ord-abc_pi' },
    );
  });

  it('createRefund usa el payment_intent y clave de idempotencia', async () => {
    const { fake, refundCreate } = makeFake();
    const gateway = createStripeGateway(fake);

    const r = await gateway.createRefund({ paymentIntentId: 'pi_fake_1', reason: 'requested_by_customer' });

    expect(r.ok).toBe(true);
    expect(refundCreate).toHaveBeenCalledWith(
      { payment_intent: 'pi_fake_1', reason: 'requested_by_customer' },
      { idempotencyKey: 'refund_pi_fake_1' },
    );
  });

  it('un error del SDK se normaliza a Result sin filtrar claves', async () => {
    const fake = {
      paymentIntents: {
        create: vi.fn(async () => {
          throw new Error('Invalid API Key provided: sk_test_abcDEF123');
        }),
      },
    } as unknown as Stripe;
    const gateway = createStripeGateway(fake);

    const r = await gateway.createPaymentIntent({ amountMinor: 100, currency: 'usd', orderId: 'o1' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('STRIPE_ERROR');
    expect(r.error.message).not.toContain('sk_test_abcDEF123');
  });
});
