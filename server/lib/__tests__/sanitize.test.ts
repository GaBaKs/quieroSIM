import { describe, expect, it } from 'vitest';
import { sanitizePostgrestSearch } from '../sanitize';

describe('sanitizePostgrestSearch', () => {
  it('deja pasar email y nombre normales', () => {
    expect(sanitizePostgrestSearch('viajero@test.com')).toBe('viajero@test.com');
    expect(sanitizePostgrestSearch('Juan Pérez')).toBe('Juan Pérez');
  });

  it('neutraliza los caracteres significativos de PostgREST/LIKE', () => {
    // Intento de inyección de filtro: cerrar el ilike y agregar condiciones.
    const evil = 'a%,id.eq.00000000-0000-0000-0000-000000000000),or=(role.eq.admin';
    const out = sanitizePostgrestSearch(evil);
    expect(out).not.toMatch(/[,()*:%\\]/);
  });

  it('colapsa espacios y recorta a 120', () => {
    expect(sanitizePostgrestSearch('  a   b  ')).toBe('a b');
    expect(sanitizePostgrestSearch('x'.repeat(200)).length).toBe(120);
  });
});
