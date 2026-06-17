import { err, ok, type Result } from '../lib/result.ts';
import { fetchJson, HttpFailure, type FetchJsonOptions } from '../lib/http.ts';
import { scrubText } from '../lib/scrub.ts';
import {
  normalizeEsim,
  normalizeOrder,
  normalizePlan,
  normalizeUser,
  type BulkSimInfoResult,
  type RawAllowedOperator,
  type RawBulkSimInfoResponse,
  type RawSupportedDeviceCategory,
  type RawYesimEsim,
  type RawYesimOrder,
  type RawYesimPlan,
  type RawYesimUser,
  type YesimEsim,
  type YesimOrder,
  type YesimPlan,
  type YesimUser,
} from './types.ts';

/**
 * Cliente tipado de la YeSim Partner API.
 * - El token se inyecta UNA vez por config y viaja en query string (contrato
 *   de YeSim); jamás aparece en errores (scrubbing en lib/http).
 * - Reintentos con backoff ante red/timeout/5xx; un 4xx no se reintenta.
 * - Maneja las 3 formas de error reales de la API: `{status,description}`,
 *   array de strings, o texto pelado.
 */

export interface YesimClientConfig {
  baseUrl: string; // real: https://partners-api.yesim.biz — dev: URL del mock
  token: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  maxRetries?: number;
  retryBaseDelayMs?: number;
}

export const YesimErrorCodes = {
  API_ERROR: 'YESIM_API_ERROR', // la API respondió con un error de negocio
  UNAVAILABLE: 'YESIM_UNAVAILABLE', // red/timeout/5xx agotando reintentos
} as const;

/** Detecta las formas de error que YeSim devuelve con HTTP 200. */
function extractApiError(body: unknown): string | null {
  if (Array.isArray(body) && body.length > 0 && body.every((x) => typeof x === 'string')) {
    return body.join('; ');
  }
  if (typeof body === 'object' && body !== null) {
    const obj = body as Record<string, unknown>;
    if (typeof obj.error === 'string' && obj.error.length > 0) return obj.error;
    if (obj.status === 'error' && typeof obj.description === 'string') return obj.description;
  }
  return null;
}

export function createYesimClient(config: YesimClientConfig) {
  const base = config.baseUrl.replace(/\/$/, '');

  async function call(
    path: string,
    params: Record<string, string | number | undefined>,
    opts: Pick<FetchJsonOptions, 'method' | 'body' | 'headers'> = {},
  ): Promise<Result<unknown>> {
    const url = new URL(`${base}${path}`);
    url.searchParams.set('token', config.token);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    try {
      const body = await fetchJson(url.toString(), {
        ...opts,
        fetchFn: config.fetchFn,
        timeoutMs: config.timeoutMs,
        maxRetries: config.maxRetries,
        retryBaseDelayMs: config.retryBaseDelayMs,
      });
      const apiError = extractApiError(body);
      if (apiError !== null) return err(YesimErrorCodes.API_ERROR, scrubText(apiError));
      return ok(body);
    } catch (e) {
      if (e instanceof HttpFailure) {
        const apiError = extractApiError(e.body);
        if (apiError !== null) return err(YesimErrorCodes.API_ERROR, scrubText(apiError));
        return err(YesimErrorCodes.UNAVAILABLE, e.message);
      }
      return err(YesimErrorCodes.UNAVAILABLE, scrubText(e instanceof Error ? e.message : String(e)));
    }
  }

  function mapOk<T, U>(result: Result<T>, fn: (data: T) => U): Result<U> {
    return result.ok ? ok(fn(result.data)) : result;
  }

  return {
    /** GET /plans — catálogo completo. Sin costo en la API real. */
    async getPlans(filter?: 'country' | 'region'): Promise<Result<YesimPlan[]>> {
      const r = await call('/plans', { filter });
      return mapOk(r, (data) => (data as RawYesimPlan[]).map(normalizePlan));
    },

    /** GET /plans?plan_id= — un plan puntual (acepta id hash u old_id). */
    async getPlan(planId: string): Promise<Result<YesimPlan[]>> {
      const r = await call('/plans', { plan_id: planId });
      return mapOk(r, (data) => (data as RawYesimPlan[]).map(normalizePlan));
    },

    /** POST /new_user — crea usuario YeSim, devuelve {user_id, email}. */
    async newUser(email: string): Promise<Result<{ userId: string; email: string }>> {
      const r = await call('/new_user', { email }, { method: 'POST' });
      return mapOk(r, (data) => {
        const obj = data as { user_id: string; email: string };
        return { userId: String(obj.user_id), email: obj.email };
      });
    },

    /** GET /new_esim — crea la eSIM (con plan opcional). ⚠️ Con plan consume saldo real. */
    async newEsim(params: { userId?: string; planId?: string }): Promise<Result<YesimEsim>> {
      const r = await call('/new_esim', { user_id: params.userId, plan_id: params.planId });
      return mapOk(r, (data) => normalizeEsim(data as RawYesimEsim));
    },

    /**
     * POST /add_plan_iccid — activa el plan sobre el ICCID. ⚠️ Consume saldo real.
     * `paymentId` = nuestro order_id interno (clave de idempotencia hacia YeSim).
     * Repetir con el mismo plan hace top-up (acumula datos) — por eso la máquina
     * de estados chequea el estado persistido ANTES de llamar.
     */
    async addPlanToIccid(params: { iccid: string; planId: string; paymentId?: string }): Promise<Result<{ status: string; description: string }>> {
      const r = await call(
        '/add_plan_iccid',
        { iccid: params.iccid, plan_id: params.planId, payment_id: params.paymentId },
        { method: 'POST' },
      );
      return mapOk(r, (data) => data as { status: string; description: string });
    },

    /** GET /sim_info — estado completo + tráfico de una eSIM. */
    async simInfo(iccid: string): Promise<Result<YesimEsim>> {
      const r = await call('/sim_info', { iccid });
      return mapOk(r, (data) => normalizeEsim(data as RawYesimEsim));
    },

    /** POST /bulk_sim_info — estado en lote (100/página) para reconciliación. */
    async bulkSimInfo(iccids: string[], page = 1): Promise<Result<BulkSimInfoResult>> {
      const r = await call(
        '/bulk_sim_info',
        { page },
        { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ iccids }) },
      );
      return mapOk(r, (data) => {
        const raw = data as RawBulkSimInfoResponse;
        return {
          esims: raw.data.map((item) => ({
            iccid: item.iccid,
            error: item.error ?? null,
            esim: item.error ? null : normalizeEsim(item),
          })),
          pagination: raw.pagination,
          summary: raw.summary,
        };
      });
    },

    /** GET /user — usuario YeSim con sus eSIMs (incluye esim_change_count, máx. 3). */
    async getUser(userId: string): Promise<Result<YesimUser>> {
      const r = await call('/user', { user_id: userId });
      return mapOk(r, (data) => normalizeUser(data as RawYesimUser));
    },

    /** GET /orders — órdenes del partner (cost_eur SIEMPRE en EUR). */
    async getOrders(search?: string): Promise<Result<YesimOrder[]>> {
      const r = await call('/orders', { search });
      return mapOk(r, (data) => (data as RawYesimOrder[]).map(normalizeOrder));
    },

    /** POST /cancel_plan — cancela el plan activo del ICCID (resolución manual admin). */
    async cancelPlan(iccid: string): Promise<Result<{ status: string; description: string }>> {
      const r = await call('/cancel_plan', { iccid }, { method: 'POST' });
      return mapOk(r, (data) => data as { status: string; description: string });
    },

    /** POST /change_esim — reemplaza la eSIM transfiriendo plan/datos. Máx. 3 por cuenta. */
    async changeEsim(iccid: string): Promise<Result<YesimEsim>> {
      const r = await call('/change_esim', { iccid }, { method: 'POST' });
      return mapOk(r, (data) => normalizeEsim(data as RawYesimEsim));
    },

    /** POST /issue_esim — emisión en lote (mayorista), con flag voucher. ⚠️ Consume saldo real. */
    async issueEsim(params: { planId: string; count: number; voucher?: boolean }): Promise<Result<YesimEsim[]>> {
      const r = await call(
        '/issue_esim',
        { plan_id: params.planId, count: params.count, voucher: params.voucher === undefined ? undefined : params.voucher ? 1 : 0 },
        { method: 'POST' },
      );
      return mapOk(r, (data) => ((data as { esims: RawYesimEsim[] }).esims ?? []).map(normalizeEsim));
    },

    /** GET /supported_devices — compatibilidad por categoría/marca/modelo. */
    async supportedDevices(): Promise<Result<RawSupportedDeviceCategory[]>> {
      const r = await call('/supported_devices', {});
      return mapOk(r, (data) => data as RawSupportedDeviceCategory[]);
    },

    /** GET /allowed_operators — operadores habilitados por país/zona. */
    async allowedOperators(params: { country?: string; tadig?: string; locationZone?: string } = {}): Promise<Result<RawAllowedOperator[]>> {
      const r = await call('/allowed_operators', {
        country: params.country,
        tadig: params.tadig,
        location_zone: params.locationZone,
      });
      return mapOk(r, (data) => data as RawAllowedOperator[]);
    },

    /** POST /set_notification_url — registra el receptor de webhooks. Devuelve "OK". */
    async setNotificationUrl(url: string): Promise<Result<string>> {
      const r = await call('/set_notification_url', { url }, { method: 'POST' });
      return mapOk(r, (data) => String(data));
    },
  };
}

export type YesimClient = ReturnType<typeof createYesimClient>;
