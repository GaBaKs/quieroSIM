/**
 * Result<T> para los módulos de Edge Functions (Deno).
 * Mismo contrato que server/types/result.ts del lado Next — copia liviana a
 * propósito: las functions no pueden importar archivos fuera de su raíz al
 * deployar, así que los dos árboles se mantienen separados.
 */
export type AppErrorShape = {
  code: string;
  message: string;
};

export type Result<T> = { ok: true; data: T } | { ok: false; error: AppErrorShape };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function err(code: string, message: string): Result<never> {
  return { ok: false, error: { code, message } };
}
