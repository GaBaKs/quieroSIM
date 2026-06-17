import type Stripe from 'stripe';
import { err, ok, type Result } from '../lib/result.ts';
import { scrubText } from '../lib/scrub.ts';

/**
 * Wrapper fino sobre el SDK de Stripe. La instancia se INYECTA:
 * - Edge Function (Deno): new Stripe(secretKey, { httpClient: Stripe.createFetchHttpClient() })
 *   con `stripe` mapeado a npm:stripe en deno.json.
 * - Tests: instancia fake / secreto de prueba.
 * Solo cubre lo que necesita el núcleo de venta: PaymentIntent, verificación
 * de firma del webhook y refund (siempre iniciado por un humano — RF-SUP-05).
 */

export const StripeErrorCodes = {
  PAYMENT_ERROR: 'STRIPE_ERROR',
  INVALID_SIGNATURE: 'STRIPE_INVALID_SIGNATURE',
} as const;

export interface CreatePaymentIntentParams {
  /** Monto en unidades mínimas (centavos). El server SIEMPRE lo recalcula desde la BD. */
  amountMinor: number;
  currency: string; // 'usd'
  /** order_id interno: viaja en metadata y como idempotency key. */
  orderId: string;
  receiptEmail?: string;
}

export function createStripeGateway(stripe: Stripe) {
  return {
    async createPaymentIntent(params: CreatePaymentIntentParams): Promise<Result<{ id: string; clientSecret: string | null }>> {
      try {
        const intent = await stripe.paymentIntents.create(
          {
            amount: params.amountMinor,
            currency: params.currency,
            receipt_email: params.receiptEmail,
            metadata: { order_id: params.orderId },
            automatic_payment_methods: { enabled: true },
          },
          // Idempotencia: reintentar la creación para la misma orden no duplica el cobro.
          { idempotencyKey: `order_${params.orderId}_pi` },
        );
        return ok({ id: intent.id, clientSecret: intent.client_secret });
      } catch (e) {
        return err(StripeErrorCodes.PAYMENT_ERROR, scrubText(e instanceof Error ? e.message : String(e)));
      }
    },

    /**
     * Verifica la firma `stripe-signature` ANTES de procesar nada (regla §2.4).
     * Usa constructEventAsync (WebCrypto) — funciona en Deno y Node.
     */
    async verifyWebhookEvent(rawBody: string, signatureHeader: string, webhookSecret: string): Promise<Result<Stripe.Event>> {
      try {
        const event = await stripe.webhooks.constructEventAsync(rawBody, signatureHeader, webhookSecret);
        return ok(event);
      } catch (e) {
        return err(StripeErrorCodes.INVALID_SIGNATURE, scrubText(e instanceof Error ? e.message : String(e)));
      }
    },

    /** Refund de un PaymentIntent. La APROBACIÓN es siempre humana; esto solo ejecuta. */
    async createRefund(params: { paymentIntentId: string; reason?: Stripe.RefundCreateParams.Reason }): Promise<Result<{ id: string; status: string | null }>> {
      try {
        const refund = await stripe.refunds.create(
          { payment_intent: params.paymentIntentId, reason: params.reason },
          { idempotencyKey: `refund_${params.paymentIntentId}` },
        );
        return ok({ id: refund.id, status: refund.status });
      } catch (e) {
        return err(StripeErrorCodes.PAYMENT_ERROR, scrubText(e instanceof Error ? e.message : String(e)));
      }
    },
  };
}

export type StripeGateway = ReturnType<typeof createStripeGateway>;
