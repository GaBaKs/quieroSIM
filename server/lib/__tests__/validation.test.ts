import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { parseInput } from '../validation';

const schema = z.object({
  email: z.string().email(),
  planId: z.string().min(1),
});

describe('parseInput', () => {
  it('devuelve ok con datos válidos', () => {
    const r = parseInput(schema, { email: 'a@b.com', planId: 'abc' });
    expect(r).toEqual({ ok: true, data: { email: 'a@b.com', planId: 'abc' } });
  });

  it('devuelve VALIDATION con el campo que falló', () => {
    const r = parseInput(schema, { email: 'no-es-email', planId: '' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('VALIDATION');
      expect(r.error.message).toContain('email');
      expect(r.error.message).toContain('planId');
    }
  });
});
