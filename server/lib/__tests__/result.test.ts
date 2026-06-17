import { describe, expect, it } from 'vitest';
import { err, ok } from '../../types/result';
import { AppError, ErrorCodes, toErrorResult } from '../errors';

describe('Result<T>', () => {
  it('ok envuelve los datos', () => {
    const r = ok({ id: 1 });
    expect(r).toEqual({ ok: true, data: { id: 1 } });
  });

  it('err envuelve código y mensaje', () => {
    const r = err(ErrorCodes.NOT_FOUND, 'No existe');
    expect(r).toEqual({ ok: false, error: { code: 'NOT_FOUND', message: 'No existe' } });
  });
});

describe('toErrorResult', () => {
  it('convierte AppError preservando código y mensaje', () => {
    const r = toErrorResult(new AppError(ErrorCodes.FORBIDDEN, 'Sin permiso'));
    expect(r).toEqual({ ok: false, error: { code: 'FORBIDDEN', message: 'Sin permiso' } });
  });

  it('nunca filtra el mensaje crudo de un error desconocido', () => {
    const r = toErrorResult(new Error('ECONNREFUSED 10.0.0.1:5432 password=hunter2'));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('INTERNAL');
      expect(r.error.message).not.toContain('hunter2');
      expect(r.error.message).not.toContain('ECONNREFUSED');
    }
  });
});
