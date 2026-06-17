import type { RawYesimEsim, RawYesimOrder, YesimWebhookEvent, YesimStatusQr } from '../types.ts';
import { MOCK_ALLOWED_OPERATORS, MOCK_PLANS, MOCK_SUPPORTED_DEVICES } from './fixtures.ts';

/**
 * Mock fiel de la YeSim Partner API (no hay sandbox — TODO el desarrollo corre
 * contra esto; la API real recién se toca en la validación final).
 * Calca las rarezas del contrato: números como strings, plan_id hash, QR en
 * tres formatos, errores en tres formas distintas, top-up acumulativo, límite
 * de 3 change_esim, paginación de bulk_sim_info.
 *
 * Se usa de dos maneras:
 * - Tests / dev local: inyectado como `fetchFn` del cliente (sin red).
 * - Deploy (Etapa 5): Edge Function `yesim-mock` que envuelve `fetchHandler`.
 */

export type MockFailureKind = '500' | 'network' | 'api_error';

interface MockUser {
  id: string;
  email: string;
  created_at: string;
  esim_change_count: number;
}

interface MockState {
  users: Map<string, MockUser>;
  esims: Map<string, RawYesimEsim>; // por iccid
  orders: RawYesimOrder[];
  notificationUrl: string | null;
  failQueue: MockFailureKind[];
  counters: { user: number; esim: number; order: number };
}

export interface YesimMockOptions {
  token?: string; // si se define, valida el ?token= entrante
  /** fetch usado para disparar webhooks salientes (default: global). */
  webhookFetch?: typeof fetch;
  now?: () => Date;
  /** Arranque del contador de ICCIDs (default: aleatorio — ver randomEsimCounterStart). */
  esimCounterStart?: number;
}

/**
 * El mock es stateless entre invocaciones de Edge Functions: con un arranque
 * fijo, cada invocación emitiría el MISMO ICCID y el insert en `esim` chocaría
 * contra el unique de la BD (provisión muerta en creating_esim). Base aleatoria
 * de 7 dígitos para que cada invocación genere ICCIDs distintos.
 */
function randomEsimCounterStart(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return 1_000_000 + (buf[0] % 8_000_000);
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

const DUMMY_QR_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

export function createYesimMock(options: YesimMockOptions = {}) {
  const now = options.now ?? (() => new Date());
  const state: MockState = {
    users: new Map(),
    esims: new Map(),
    orders: [],
    notificationUrl: null,
    failQueue: [],
    counters: { user: 100, esim: options.esimCounterStart ?? randomEsimCounterStart(), order: 1000 },
  };

  function nextIccid(): string {
    state.counters.esim += 1;
    return `894865000003${String(state.counters.esim).padStart(7, '0')}`;
  }

  function makeEsim(userId: string): RawYesimEsim {
    const iccid = nextIccid();
    const suffix = state.counters.esim.toString(36).toUpperCase().padStart(6, '0');
    return {
      id: String(state.counters.esim),
      iccid,
      user_id: userId,
      created_at: fmtDate(now()),
      active_plan_id: null,
      plan_activated_at: null,
      plan_expired_at: null,
      qrcode: `LPA:1$smdp.io$K2-${suffix}-MOCK01`,
      status_qr: 'Released',
      imsi: `2600101${String(state.counters.esim).padStart(8, '0')}`,
      msisdn: null,
      is_deleted: '0',
      img: DUMMY_QR_PNG,
      ios_tap_link: `https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=LPA%3A1%24smdp.io%24K2-${suffix}-MOCK01`,
      esim_passport: `https://esimpass.cloud/MOCK-${suffix}`,
      is_voucher: false,
    };
  }

  function activatePlan(esim: RawYesimEsim, planId: string): { ok: true } | { ok: false; error: string } {
    const plan = MOCK_PLANS.find((p) => p.id === planId || p.old_id === planId);
    if (!plan) return { ok: false, error: `Plan with id ${planId} not found.` };

    const mb = Number(plan.data) * 1024;
    if (esim.active_plan_id === plan.id) {
      // top-up: acumula datos (comportamiento real documentado)
      esim.data_package_mb = (esim.data_package_mb ?? 0) + mb;
      esim.data_left_mb = (esim.data_left_mb ?? 0) + mb;
    } else {
      esim.active_plan_id = plan.id;
      esim.plan_activated_at = fmtDate(now());
      const expires = new Date(now().getTime() + Number(plan.days) * 86_400_000);
      esim.plan_expired_at = fmtDate(expires);
      esim.data_package_mb = mb;
      esim.data_left_mb = mb;
      esim.data_used_mb = 0;
    }

    state.counters.order += 1;
    return { ok: true };
  }

  function recordOrder(esim: RawYesimEsim, planId: string, paymentId: string | null) {
    const plan = MOCK_PLANS.find((p) => p.id === planId || p.old_id === planId);
    state.orders.push({
      id: String(state.counters.order),
      user_id: esim.user_id,
      iccid: esim.iccid,
      plan_id: plan?.old_id ?? planId,
      cost_eur: plan ? Number(plan.price).toFixed(2) : '0.00',
      created_at: fmtDate(now()),
      payment_id: paymentId,
    });
  }

  function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }

  /** Error estilo YeSim: array de strings con HTTP 200. */
  function apiError(message: string): Response {
    return json([message]);
  }

  async function fetchHandler(input: string | URL | Request, init?: RequestInit): Promise<Response> {
    const request = input instanceof Request ? input : new Request(input, init);
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const q = (name: string) => url.searchParams.get(name) ?? undefined;

    // Inyección de fallos (para testear reintentos y la máquina de estados)
    const failure = state.failQueue.shift();
    if (failure === '500') return new Response('Internal Server Error', { status: 500 });
    if (failure === 'network') throw new TypeError('fetch failed (mock network error)');
    if (failure === 'api_error') return apiError('Temporary processing error. Please retry.');

    if (options.token !== undefined && q('token') !== options.token) {
      return apiError('Invalid token.');
    }

    switch (path) {
      case '/plans': {
        const planId = q('plan_id');
        const filter = q('filter');
        let plans = MOCK_PLANS;
        if (planId) plans = plans.filter((p) => p.id === planId || p.old_id === planId);
        if (filter) plans = plans.filter((p) => p.plan_type === filter);
        return json(plans);
      }

      case '/new_user': {
        const email = q('email');
        if (!email) return apiError('Email is required.');
        state.counters.user += 1;
        const user: MockUser = {
          id: String(state.counters.user),
          email,
          created_at: fmtDate(now()),
          esim_change_count: 0,
        };
        state.users.set(user.id, user);
        return json({ user_id: user.id, email: user.email });
      }

      case '/new_esim': {
        const userId = q('user_id') ?? '0';
        const planId = q('plan_id');
        const esim = makeEsim(userId);
        if (planId) {
          const activated = activatePlan(esim, planId);
          if (!activated.ok) return apiError(activated.error);
          recordOrder(esim, planId, null);
        }
        state.esims.set(esim.iccid, esim);
        return json(esim);
      }

      case '/add_plan_iccid': {
        const iccid = q('iccid');
        const planId = q('plan_id');
        if (!iccid || !planId) return apiError('iccid and plan_id are required.');
        const esim = state.esims.get(iccid);
        if (!esim) return apiError(`The eSIM with iccid ${iccid} doesn't exist.`);
        const activated = activatePlan(esim, planId);
        if (!activated.ok) return apiError(activated.error);
        recordOrder(esim, planId, q('payment_id') ?? null);
        return json({ status: 'success', description: 'OK' });
      }

      case '/sim_info': {
        const iccid = q('iccid');
        const esim = iccid ? state.esims.get(iccid) : undefined;
        if (!esim) return apiError(`The eSIM with iccid ${iccid ?? '?'} doesn't exist.`);
        return json(esim);
      }

      case '/bulk_sim_info': {
        let iccids: string[] = [];
        try {
          const body = (await request.json()) as { iccids?: string[] };
          iccids = body.iccids ?? [];
        } catch {
          return apiError('Invalid JSON body.');
        }
        const perPage = 100;
        const page = Number(q('page') ?? '1');
        const slice = iccids.slice((page - 1) * perPage, page * perPage);
        let failed = 0;
        const data = slice.map((iccid) => {
          const esim = state.esims.get(iccid);
          if (!esim) {
            failed += 1;
            return { iccid, status: 'error', error: `The eSIM with iccid ${iccid} doesn't exist.` } as never;
          }
          return { ...esim, status: null, error: null };
        });
        return json({
          data,
          pagination: {
            page,
            per_page: perPage,
            total: iccids.length,
            total_pages: Math.max(1, Math.ceil(iccids.length / perPage)),
            returned: slice.length,
          },
          summary: { found: slice.length - failed, failed },
        });
      }

      case '/user': {
        const userId = q('user_id');
        const user = userId ? state.users.get(userId) : undefined;
        if (!user) return apiError(`User ${userId ?? '?'} not found.`);
        const esims = [...state.esims.values()].filter((e) => e.user_id === user.id);
        return json({
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          esim_change_count: String(user.esim_change_count),
          batch_id: null,
          stripe_user_id: null,
          esims,
        });
      }

      case '/orders': {
        const search = q('search');
        const orders = search
          ? state.orders.filter((o) => o.iccid === search || o.user_id === search)
          : state.orders;
        return json(orders);
      }

      case '/cancel_plan': {
        const iccid = q('iccid');
        const esim = iccid ? state.esims.get(iccid) : undefined;
        if (!esim) return apiError(`The eSIM with iccid ${iccid ?? '?'} doesn't exist.`);
        if (!esim.active_plan_id) {
          return apiError(`The eSIM with iccid ${iccid} doesn't have an active plan.`);
        }
        esim.active_plan_id = null;
        esim.plan_activated_at = null;
        esim.plan_expired_at = null;
        return json({ status: 'success', description: 'OK' });
      }

      case '/change_esim': {
        const iccid = q('iccid');
        const oldEsim = iccid ? state.esims.get(iccid) : undefined;
        if (!oldEsim) return apiError(`The eSIM with iccid ${iccid ?? '?'} doesn't exist.`);
        const user = state.users.get(oldEsim.user_id);
        if (user && user.esim_change_count >= 3) {
          return apiError('No more than 3 replacements are allowed per user.');
        }
        if (user) user.esim_change_count += 1;
        const replacement = makeEsim(oldEsim.user_id);
        replacement.active_plan_id = oldEsim.active_plan_id;
        replacement.plan_activated_at = fmtDate(now());
        replacement.plan_expired_at = oldEsim.plan_expired_at;
        replacement.data_package_mb = oldEsim.data_package_mb;
        replacement.data_left_mb = oldEsim.data_left_mb;
        replacement.data_used_mb = oldEsim.data_used_mb;
        oldEsim.is_deleted = '1';
        state.esims.set(replacement.iccid, replacement);
        return json(replacement);
      }

      case '/issue_esim': {
        const planId = q('plan_id');
        const count = Number(q('count') ?? '0');
        const voucher = q('voucher') === '1';
        if (!planId || count < 1) return apiError('plan_id and count are required.');
        const esims: RawYesimEsim[] = [];
        for (let i = 0; i < count; i++) {
          const esim = makeEsim('0');
          const activated = activatePlan(esim, planId);
          if (!activated.ok) return apiError(activated.error);
          if (voucher) {
            esim.is_voucher = true;
            esim.voucher_status = 'Available';
            esim.voucher_code = `MOCK${String(state.counters.esim).padStart(4, '0')}`;
          }
          recordOrder(esim, planId, null);
          state.esims.set(esim.iccid, esim);
          esims.push(esim);
        }
        return json({ esims });
      }

      case '/supported_devices':
        return json(MOCK_SUPPORTED_DEVICES);

      case '/allowed_operators': {
        const country = q('country');
        const ops = country
          ? MOCK_ALLOWED_OPERATORS.filter((o) => o.country.toLowerCase() === country.toLowerCase())
          : MOCK_ALLOWED_OPERATORS;
        return json(ops);
      }

      case '/set_notification_url': {
        const target = q('url');
        if (!target) return apiError('url is required.');
        state.notificationUrl = target;
        return json('OK'); // string pelado, como la API real
      }

      default:
        return new Response('Not Found', { status: 404 });
    }
  }

  /**
   * Inyecta fallos en las próximas llamadas (en orden): '500' (HTTP 500),
   * 'network' (excepción de red), 'api_error' (HTTP 200 con error de negocio).
   */
  function failNext(count: number, kind: MockFailureKind) {
    for (let i = 0; i < count; i++) state.failQueue.push(kind);
  }

  /**
   * Simula el webhook saliente de YeSim. Si hay receiverUrl (o se registró vía
   * /set_notification_url), hace el POST real; siempre devuelve el payload.
   * `simulateStatusChange` también actualiza el estado interno de la eSIM.
   */
  async function triggerWebhook(
    event:
      | { type: 'EsimStatus'; iccid: string; status: Exclude<YesimStatusQr, 'Released'> }
      | { type: 'PackageUsage'; iccid: string; thresholdPercentage: 50 | 90 },
    receiverUrl?: string,
  ): Promise<YesimWebhookEvent> {
    let payload: YesimWebhookEvent;
    if (event.type === 'EsimStatus') {
      const esim = state.esims.get(event.iccid);
      if (esim) esim.status_qr = event.status;
      payload = { type: 'EsimStatus', iccid: event.iccid, status: event.status };
    } else {
      const esim = state.esims.get(event.iccid);
      const packageMb = esim?.data_package_mb ?? 1024;
      const usedMb = (packageMb * event.thresholdPercentage) / 100;
      if (esim) {
        esim.data_used_mb = usedMb;
        esim.data_left_mb = packageMb - usedMb;
      }
      payload = {
        type: 'PackageUsage',
        iccid: event.iccid,
        unitsBefore: Math.round((usedMb - 1) * 1024 * 1024),
        unitsAfter: Math.round(usedMb * 1024 * 1024),
        thresholdPercentage: event.thresholdPercentage,
      };
    }

    const target = receiverUrl ?? state.notificationUrl;
    if (target) {
      const webhookFetch = options.webhookFetch ?? fetch;
      await webhookFetch(target, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    return payload;
  }

  return { fetchHandler: fetchHandler as typeof fetch, state, failNext, triggerWebhook };
}
