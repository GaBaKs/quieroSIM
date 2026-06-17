import { err, ok, type Result } from '../lib/result.ts';
import type { YesimClient } from '../yesim/client.ts';
import type { YesimEsim } from '../yesim/types.ts';

/**
 * Máquina de estados de provisión (Plan Backend §5): UNA emisión por pago.
 *
 * Estados del job: queued → creating_esim → activating_plan → confirming → fulfilled.
 * Fallo persistente: la orden pasa a `failed_needs_review` pero el job QUEDA en
 * el paso exacto donde falló — el reintento manual del admin reanuda desde ahí,
 * jamás desde cero (candado 4).
 *
 * Candados de idempotencia:
 *  1. event.id de Stripe (lo aplica el webhook con la tabla stripe_event).
 *  2. Guard de estado de orden (pending→paid una sola vez, en el webhook).
 *  3. ICCID existente: nunca se llama new_esim si la orden ya tiene eSIM.
 *  4. payment_id = orderId hacia YeSim + lock optimista (locked_at) acá.
 *
 * El acceso a datos va por ProvisionStore: Supabase en producción, in-memory
 * en los tests — la máquina se prueba completa contra el mock YeSim sin red.
 */

export type ProvisionJobState = 'queued' | 'creating_esim' | 'activating_plan' | 'confirming' | 'fulfilled';

export interface ProvisionJobRecord {
  orderId: string;
  state: ProvisionJobState;
  attemptCount: number;
}

export interface ProvisionOrderRecord {
  id: string;
  status: string;
  email: string | null;
  userId: string | null;
  planYesimId: string;
}

export interface EsimRecordRef {
  id: string;
  iccid: string;
}

export interface ProvisionStore {
  /** Lock optimista: devuelve el job si lo obtuvo, null si otro proceso lo tiene. */
  lockJob(orderId: string): Promise<ProvisionJobRecord | null>;
  releaseJob(orderId: string): Promise<void>;
  /** Cambia el estado del job y agrega la transición al history (con timestamp). */
  transition(orderId: string, state: ProvisionJobState, note?: string): Promise<void>;
  /** Registra un intento fallido (attempt_count, last_error, history). */
  recordFailure(orderId: string, error: string): Promise<void>;
  getOrder(orderId: string): Promise<ProvisionOrderRecord | null>;
  findEsimByOrder(orderId: string): Promise<EsimRecordRef | null>;
  insertEsim(orderId: string, userId: string | null, esim: YesimEsim): Promise<EsimRecordRef>;
  updateEsimFromSimInfo(esimId: string, info: YesimEsim): Promise<void>;
  setOrderStatus(orderId: string, status: 'fulfilled' | 'failed_needs_review'): Promise<void>;
  logAudit(action: string, payload: Record<string, unknown>): Promise<void>;
}

export interface ProvisionDeps {
  store: ProvisionStore;
  yesim: Pick<YesimClient, 'newEsim' | 'addPlanToIccid' | 'simInfo'>;
  /** Backoff entre reintentos de un paso (default 500ms; 1ms en tests). */
  retryDelayMs?: number;
  maxAttemptsPerStep?: number;
}

export const ProvisionErrorCodes = {
  LOCKED: 'PROVISION_LOCKED',
  NOT_FOUND: 'PROVISION_NOT_FOUND',
  INVALID_ORDER_STATUS: 'PROVISION_INVALID_ORDER_STATUS',
} as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runProvision(
  orderId: string,
  deps: ProvisionDeps,
): Promise<Result<{ state: ProvisionJobState | 'failed_needs_review' }>> {
  const { store, yesim } = deps;
  const retryDelayMs = deps.retryDelayMs ?? 500;
  const maxAttempts = deps.maxAttemptsPerStep ?? 3;

  const job = await store.lockJob(orderId);
  if (!job) return err(ProvisionErrorCodes.LOCKED, 'La provisión ya está corriendo en otro proceso.');

  try {
    if (job.state === 'fulfilled') return ok({ state: 'fulfilled' });

    const order = await store.getOrder(orderId);
    if (!order) return err(ProvisionErrorCodes.NOT_FOUND, `Orden ${orderId} sin job/orden válida.`);
    // Solo se emite para órdenes pagadas (o en revisión manual — reintento del admin).
    if (order.status !== 'paid' && order.status !== 'failed_needs_review') {
      return err(
        ProvisionErrorCodes.INVALID_ORDER_STATUS,
        `La orden está en estado '${order.status}'; la emisión exige paid/failed_needs_review.`,
      );
    }

    let lastError = '';
    /** Reintentos acotados con backoff por paso. null = agotados. */
    async function withRetries<T>(step: string, fn: () => Promise<Result<T>>): Promise<T | null> {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const result = await fn();
        if (result.ok) return result.data;
        lastError = `[${step}] ${result.error.code}: ${result.error.message}`;
        await store.recordFailure(orderId, lastError);
        if (attempt < maxAttempts) await sleep(retryDelayMs * attempt);
      }
      return null;
    }

    /** §5.4: retención explícita — orden visible para revisión humana, job queda en el paso exacto. */
    async function toNeedsReview(): Promise<Result<{ state: 'failed_needs_review' }>> {
      await store.setOrderStatus(orderId, 'failed_needs_review');
      await store.logAudit('provision_needs_review', { order_id: orderId, last_error: lastError });
      return ok({ state: 'failed_needs_review' });
    }

    let state: ProvisionJobState = job.state;
    if (state === 'queued') {
      state = 'creating_esim';
      await store.transition(orderId, 'creating_esim');
    }

    if (state === 'creating_esim') {
      // Candado 3: si la orden ya tiene eSIM (corrida anterior), NO se crea otra.
      let esim = await store.findEsimByOrder(orderId);
      if (!esim) {
        const created = await withRetries('new_esim', () => yesim.newEsim({}));
        if (!created) return toNeedsReview();
        esim = await store.insertEsim(orderId, order.userId, created);
      }
      state = 'activating_plan';
      await store.transition(orderId, 'activating_plan', `iccid:${esim.iccid}`);
    }

    if (state === 'activating_plan') {
      const esim = await store.findEsimByOrder(orderId);
      if (!esim) {
        lastError = 'Job en activating_plan sin eSIM asociada (estado inconsistente).';
        await store.recordFailure(orderId, lastError);
        return toNeedsReview();
      }
      const activated = await withRetries('add_plan_iccid', () =>
        yesim.addPlanToIccid({ iccid: esim.iccid, planId: order.planYesimId, paymentId: orderId }),
      );
      if (!activated) return toNeedsReview();
      state = 'confirming';
      await store.transition(orderId, 'confirming');
    }

    if (state === 'confirming') {
      const esim = await store.findEsimByOrder(orderId);
      if (!esim) {
        lastError = 'Job en confirming sin eSIM asociada (estado inconsistente).';
        await store.recordFailure(orderId, lastError);
        return toNeedsReview();
      }
      const info = await withRetries('sim_info', async () => {
        const r = await yesim.simInfo(esim.iccid);
        if (r.ok && !r.data.activePlanId) {
          return err('YESIM_PLAN_NOT_ACTIVE', `sim_info de ${esim.iccid} sin plan activo tras la activación.`);
        }
        return r;
      });
      if (!info) return toNeedsReview();
      await store.updateEsimFromSimInfo(esim.id, info);
      await store.transition(orderId, 'fulfilled');
      await store.setOrderStatus(orderId, 'fulfilled');
    }

    return ok({ state: 'fulfilled' });
  } catch (e) {
    // Falla NO prevista (p. ej. un insert que viola un unique en BD): sin esto
    // la excepción mataba la tarea en background sin dejar rastro — el job
    // quedaba congelado en su estado y la orden en paid para siempre (§5.4).
    const message = e instanceof Error ? e.message : String(e);
    await store.recordFailure(orderId, `[unexpected] ${message}`);
    await store.setOrderStatus(orderId, 'failed_needs_review');
    await store.logAudit('provision_needs_review', { order_id: orderId, last_error: message });
    return ok({ state: 'failed_needs_review' });
  } finally {
    await store.releaseJob(orderId);
  }
}
