import { ok, type Result } from '../lib/result.ts';
import type { YesimClient } from '../yesim/client.ts';
import type { YesimEsim, YesimStatusQr } from '../yesim/types.ts';

/**
 * Estado de eSIM híbrido (Plan Backend Etapa 6):
 *  - `handleYesimWebhook`: receptor de los webhooks de YeSim. NO tienen firma,
 *    así que el payload es solo una SEÑAL: se registra siempre en
 *    yesim_webhook_event y el estado real se confirma con /sim_info antes de
 *    tocar la tabla esim.
 *  - `syncEsimStatuses`: reconciliación por cron con /bulk_sim_info — recupera
 *    webhooks perdidos y mantiene el consumo fresco.
 *
 * Mapeo estados de DISPOSITIVO YeSim → esim.status_qr (check de BD:
 * generated/installed/active/expired):
 *  Released → generated · Installed → installed · Enabled → active ·
 *  Disabled → installed (línea apagada en el device) · Deleted → generated
 *  (perfil borrado del device). El estado crudo queda en yesim_status_raw.
 *  ⚠️ 'expired' NO sale del estado de dispositivo: es vencimiento REAL del plan
 *  (plan_expired_at ya pasó) — lo resuelve deriveDbStatus.
 */

export type EsimDbStatus = 'generated' | 'installed' | 'active' | 'expired';

export function mapYesimStatus(statusQr: YesimStatusQr): EsimDbStatus {
  switch (statusQr) {
    case 'Released':
      return 'generated';
    case 'Installed':
      return 'installed';
    case 'Enabled':
      return 'active';
    case 'Disabled':
      return 'installed'; // línea apagada en el device — NO es vencimiento del plan
    case 'Deleted':
      return 'generated'; // perfil borrado del device — NO es vencimiento del plan
  }
}

/**
 * Estado para la BD combinando vencimiento real del plan + estado del device.
 * 'expired' SOLO cuando plan_expired_at ya pasó. Un plan vigente con la línea
 * apagada/borrada NO es 'expired'. Un plan ya activado se muestra 'active'.
 */
export function deriveDbStatus(
  info: Pick<YesimEsim, 'statusQr' | 'planActivatedAt' | 'planExpiredAt'>,
  nowMs: number,
): EsimDbStatus {
  if (info.planExpiredAt && new Date(info.planExpiredAt).getTime() <= nowMs) return 'expired';
  if (info.planActivatedAt) return 'active';
  return mapYesimStatus(info.statusQr);
}

export interface EsimStatusUpdate {
  statusQr: EsimDbStatus;
  yesimStatusRaw: string;
  planActivatedAt?: string | null;
  planExpiredAt?: string | null;
  dataPackageMb?: number | null;
  dataLeftMb?: number | null;
  dataUsedMb?: number | null;
}

export interface EsimStatusStore {
  findEsimByIccid(iccid: string): Promise<{ id: string; iccid: string } | null>;
  /** Registra el webhook crudo (auditoría) y devuelve el id del evento. */
  recordWebhookEvent(eventType: string, iccid: string | null, payload: unknown): Promise<string>;
  setWebhookResult(eventId: string, result: string): Promise<void>;
  applyStatusUpdate(esimId: string, update: EsimStatusUpdate): Promise<void>;
  /** ICCIDs de eSIMs vigentes (no expiradas) a reconciliar por el cron. */
  listActiveIccids(limit: number): Promise<string[]>;
}

export interface EsimStatusDeps {
  store: EsimStatusStore;
  yesim: Pick<YesimClient, 'simInfo' | 'bulkSimInfo'>;
  /**
   * SOLO DEV (YESIM_BASE_URL=mock): el mock es stateless entre invocaciones y
   * /sim_info no conoce ICCIDs de corridas previas; se aceptan los datos del
   * payload sin confirmar. Con la API real esto debe ser SIEMPRE false.
   */
  allowUnconfirmed?: boolean;
}

interface EsimStatusEvent {
  type: 'EsimStatus';
  iccid: string;
  status: Exclude<YesimStatusQr, 'Released'>;
}

interface PackageUsageEvent {
  type: 'PackageUsage';
  iccid: string;
  unitsBefore: number;
  unitsAfter: number;
  thresholdPercentage: number;
}

const ESIM_STATUSES: ReadonlyArray<string> = ['Installed', 'Enabled', 'Disabled', 'Deleted'];

function parseWebhookPayload(payload: unknown): EsimStatusEvent | PackageUsageEvent | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const obj = payload as Record<string, unknown>;
  if (typeof obj.iccid !== 'string' || obj.iccid.length === 0) return null;
  if (obj.type === 'EsimStatus' && typeof obj.status === 'string' && ESIM_STATUSES.includes(obj.status)) {
    return { type: 'EsimStatus', iccid: obj.iccid, status: obj.status as EsimStatusEvent['status'] };
  }
  if (obj.type === 'PackageUsage' && typeof obj.unitsAfter === 'number') {
    return {
      type: 'PackageUsage',
      iccid: obj.iccid,
      unitsBefore: typeof obj.unitsBefore === 'number' ? obj.unitsBefore : 0,
      unitsAfter: obj.unitsAfter,
      thresholdPercentage: typeof obj.thresholdPercentage === 'number' ? obj.thresholdPercentage : 0,
    };
  }
  return null;
}

function updateFromSimInfo(info: YesimEsim): EsimStatusUpdate {
  return {
    statusQr: deriveDbStatus(info, Date.now()),
    yesimStatusRaw: info.statusQr,
    planActivatedAt: info.planActivatedAt,
    planExpiredAt: info.planExpiredAt,
    dataPackageMb: info.dataPackageMb,
    dataLeftMb: info.dataLeftMb,
    dataUsedMb: info.dataUsedMb,
  };
}

/**
 * Procesa un webhook entrante. SIEMPRE devuelve ok (el HTTP responde 200
 * escueto pase lo que pase: no le revelamos nada al emisor); el detalle queda
 * en yesim_webhook_event.processing_result.
 */
export async function handleYesimWebhook(
  payload: unknown,
  deps: EsimStatusDeps,
): Promise<Result<{ result: string }>> {
  const { store, yesim } = deps;

  const parsed = parseWebhookPayload(payload);
  const eventType =
    parsed?.type ??
    (typeof payload === 'object' && payload !== null && typeof (payload as Record<string, unknown>).type === 'string'
      ? String((payload as Record<string, unknown>).type)
      : 'unknown');
  const eventId = await store.recordWebhookEvent(eventType, parsed?.iccid ?? null, payload);

  const finish = async (result: string) => {
    await store.setWebhookResult(eventId, result);
    return ok({ result });
  };

  if (!parsed) return finish('invalid_payload');

  const esim = await store.findEsimByIccid(parsed.iccid);
  if (!esim) return finish('ignored_unknown_iccid');

  // El webhook no trae firma: confirmar SIEMPRE contra /sim_info.
  const info = await yesim.simInfo(parsed.iccid);
  if (info.ok) {
    await store.applyStatusUpdate(esim.id, updateFromSimInfo(info.data));
    return finish('processed');
  }

  if (deps.allowUnconfirmed) {
    // Rama solo-dev: aplicar lo que dice el payload (mock stateless).
    if (parsed.type === 'EsimStatus') {
      await store.applyStatusUpdate(esim.id, {
        statusQr: mapYesimStatus(parsed.status),
        yesimStatusRaw: parsed.status,
      });
    } else {
      const usedMb = parsed.unitsAfter / (1024 * 1024);
      await store.applyStatusUpdate(esim.id, {
        statusQr: 'active',
        yesimStatusRaw: 'Enabled',
        dataUsedMb: usedMb,
      });
    }
    return finish('processed_unconfirmed_dev');
  }

  return finish(`error_confirming: ${info.error.code}`);
}

/** Cron de reconciliación: /bulk_sim_info sobre las eSIMs vigentes (lotes de 100). */
export async function syncEsimStatuses(
  deps: EsimStatusDeps,
  limit = 500,
): Promise<Result<{ checked: number; updated: number; failed: number }>> {
  const { store, yesim } = deps;
  const iccids = await store.listActiveIccids(limit);

  let updated = 0;
  let failed = 0;
  for (let i = 0; i < iccids.length; i += 100) {
    const chunk = iccids.slice(i, i + 100);
    const bulk = await yesim.bulkSimInfo(chunk);
    if (!bulk.ok) {
      failed += chunk.length;
      continue;
    }
    for (const item of bulk.data.esims) {
      if (!item.esim || item.error) {
        failed += 1;
        continue;
      }
      const esim = await store.findEsimByIccid(item.iccid);
      if (!esim) {
        failed += 1;
        continue;
      }
      await store.applyStatusUpdate(esim.id, updateFromSimInfo(item.esim));
      updated += 1;
    }
  }
  return ok({ checked: iccids.length, updated, failed });
}
