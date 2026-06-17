import { err, type Result } from '../types/result';

/** Códigos de error estables que ve el front. Agregar acá, nunca inventar strings sueltas. */
export const ErrorCodes = {
  VALIDATION: 'VALIDATION',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  INTERNAL: 'INTERNAL',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Error interno con código estable. El `message` debe ser apto para mostrar
 * al usuario (sin detalles técnicos ni datos sensibles).
 */
export class AppError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'AppError';
    this.code = code;
  }

  toResult(): Result<never> {
    return err(this.code, this.message);
  }
}

/**
 * Normaliza cualquier excepción a un Result de error limpio.
 * Un error desconocido nunca filtra su mensaje crudo al front.
 */
export function toErrorResult(e: unknown): Result<never> {
  if (e instanceof AppError) return e.toResult();
  return err(ErrorCodes.INTERNAL, 'Ocurrió un error inesperado. Intentá de nuevo.');
}
