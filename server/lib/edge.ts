import 'server-only';
import { err, ok, type Result } from '../types/result';
import { ErrorCodes } from './errors';
import { requireEnv } from './env';
import { logger } from './logger';
import { createSupabaseServerClient } from '../db/supabase-server';

/**
 * Proxy a una Edge Function CON la sesión del usuario logueado (su JWT). Para
 * acciones admin que tocan secretos (refund, retry): la Edge Function valida
 * el token y el rol. Devuelve Result<T> normalizado.
 */
export async function callEdgeFunctionAuthed<T>(path: string, body: unknown): Promise<Result<T>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return err(ErrorCodes.UNAUTHORIZED, 'No hay una sesión activa.');

  const url = `${requireEnv('NEXT_PUBLIC_SUPABASE_URL')}/functions/v1/${path}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => null)) as
      | { ok?: boolean; data?: T; error?: { code: string; message: string } }
      | null;
    if (!response.ok || !payload?.ok) {
      return err(
        payload?.error?.code ?? ErrorCodes.INTERNAL,
        payload?.error?.message ?? 'No pudimos procesar la operación. Intentá de nuevo.',
      );
    }
    return ok(payload.data as T);
  } catch (e) {
    logger.error('callEdgeFunctionAuthed: excepción', { path, error: e instanceof Error ? e.message : String(e) });
    return err(ErrorCodes.PROVIDER_UNAVAILABLE, 'No pudimos conectar con el servidor. Intentá de nuevo.');
  }
}
