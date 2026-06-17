/**
 * Contrato único de la fachada del backend (Plan de Acción §A.4).
 * Toda Server Action devuelve Result<T>: el front nunca ve excepciones,
 * stack traces ni errores crudos de YeSim/Stripe.
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
