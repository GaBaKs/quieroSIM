'use server';

import { z } from 'zod';
import { err, ok, type Result } from '../types/result';
import { ErrorCodes } from '../lib/errors';
import { parseInput } from '../lib/validation';
import { requireEnv } from '../lib/env';
import { logger } from '../lib/logger';
import { createSupabaseServerClient } from '../db/supabase-server';

/**
 * Fachada del panel "Mis eSIMs" (Etapa 6). Lecturas con la sesión del usuario
 * (RLS: esim_sel user_id = auth.uid()); el reenvío de email va a la Edge
 * Function `deliveries` (que tiene los secretos de Resend).
 */

export interface MyEsim {
  id: string;
  iccid: string | null;
  qrLpa: string | null;
  iosTapLink: string | null;
  /** generated | installed | active | expired (check de la BD). */
  status: string;
  planName: string;
  durationDays: number | null;
  dataAmount: string | null;
  dataPackageMb: number | null;
  dataUsedMb: number | null;
  dataLeftMb: number | null;
  planActivatedAt: string | null;
  planExpiredAt: string | null;
  orderShortId: string;
  purchasedAt: string | null;
}

/**
 * Vincula al usuario las compras guest hechas con su email (RF-CHK-02).
 * Idempotente y barato: se llama en cada carga del panel. El candado anti-robo
 * es la verificación del email (lo exige la función SQL).
 */
export async function claimMyOrders(): Promise<Result<{ claimed: number }>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('claim_my_orders');
  if (error) {
    logger.warn('claimMyOrders falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos vincular tus compras. Recargá la página.');
  }
  return ok({ claimed: (data as number | null) ?? 0 });
}

/** eSIMs del usuario logueado (RLS), más recientes primero. */
export async function getMyEsims(): Promise<Result<MyEsim[]>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err(ErrorCodes.UNAUTHORIZED, 'No hay una sesión activa.');

  const { data, error } = await supabase
    .from('esim')
    .select(
      'id, iccid, qr_lpa, ios_tap_link, status_qr, data_package_mb, data_used_mb, data_left_mb, plan_activated_at, plan_expired_at, created_at, order:order_id(id, created_at, plan:plan_id(name, duration_days, data_amount))',
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('getMyEsims falló', { error: error.message });
    return err(ErrorCodes.INTERNAL, 'No pudimos cargar tus eSIMs. Intentá de nuevo.');
  }

  const esims: MyEsim[] = (data ?? []).map((row) => {
    const order = Array.isArray(row.order) ? row.order[0] : row.order;
    const plan = order ? (Array.isArray(order.plan) ? order.plan[0] : order.plan) : null;
    return {
      id: row.id,
      iccid: row.iccid,
      qrLpa: row.qr_lpa,
      iosTapLink: row.ios_tap_link,
      status: row.status_qr ?? 'generated',
      planName: plan?.name ?? 'eSIM QuieroSIM',
      durationDays: plan?.duration_days ?? null,
      dataAmount: plan?.data_amount ?? null,
      dataPackageMb: row.data_package_mb === null ? null : Number(row.data_package_mb),
      dataUsedMb: row.data_used_mb === null ? null : Number(row.data_used_mb),
      dataLeftMb: row.data_left_mb === null ? null : Number(row.data_left_mb),
      planActivatedAt: row.plan_activated_at,
      planExpiredAt: row.plan_expired_at,
      orderShortId: order ? order.id.slice(0, 8).toUpperCase() : '—',
      purchasedAt: order?.created_at ?? row.created_at,
    };
  });

  return ok(esims);
}

const resendSchema = z.object({ esimId: z.string().uuid() });

/** Reenvía el email con el QR (límites anti-abuso en la Edge Function). */
export async function resendQrEmail(input: { esimId: string }): Promise<Result<{ status: string }>> {
  const parsed = parseInput(resendSchema, input);
  if (!parsed.ok) return parsed;

  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return err(ErrorCodes.UNAUTHORIZED, 'No hay una sesión activa.');

  const url = `${requireEnv('NEXT_PUBLIC_SUPABASE_URL')}/functions/v1/deliveries/resend`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ esimId: parsed.data.esimId }),
    });
    const payload = (await response.json().catch(() => null)) as
      | { ok?: boolean; data?: { status: string }; error?: { code: string; message: string } }
      | null;
    if (!response.ok || !payload?.ok) {
      return err(
        payload?.error?.code ?? ErrorCodes.INTERNAL,
        payload?.error?.message ?? 'No pudimos reenviar el email. Intentá de nuevo.',
      );
    }
    return ok(payload.data as { status: string });
  } catch (e) {
    logger.error('resendQrEmail falló', { error: e instanceof Error ? e.message : String(e) });
    return err(ErrorCodes.PROVIDER_UNAVAILABLE, 'No pudimos conectar con el servidor. Intentá de nuevo.');
  }
}
