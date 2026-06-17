import { z } from 'zod';
import { err, ok, type Result } from '../types/result';
import { ErrorCodes } from './errors';

/**
 * Valida input en el borde de cada Server Action / endpoint (Plan Backend §2.7).
 * Devuelve Result para encadenar sin try/catch en la fachada.
 */
export function parseInput<S extends z.ZodType>(schema: S, input: unknown): Result<z.infer<S>> {
  const parsed = schema.safeParse(input);
  if (parsed.success) return ok(parsed.data);
  const summary = parsed.error.issues
    .map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`)
    .join('; ');
  return err(ErrorCodes.VALIDATION, `Datos inválidos — ${summary}`);
}
