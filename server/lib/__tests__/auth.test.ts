import { describe, expect, it } from 'vitest';
import { buildAuthContext } from '../auth';
import type { Tables } from '../../types/database';

const user = { id: 'u-1', email: 'a@b.com' };
const profile = { id: 'u-1', email: 'a@b.com', full_name: 'Ana' } as Tables<'user_profile'>;

describe('buildAuthContext', () => {
  it('mapea roles cuando la relación viene como objeto', () => {
    const ctx = buildAuthContext(user, profile, [{ role: { name: 'customer' } }, { role: { name: 'admin' } }], null);
    expect(ctx.roles).toEqual(['customer', 'admin']);
    expect(ctx.adminSubRole).toBeNull();
    expect(ctx.profile?.full_name).toBe('Ana');
  });

  it('mapea roles cuando la relación viene como array (forma alternativa de PostgREST)', () => {
    const ctx = buildAuthContext(user, profile, [{ role: [{ name: 'customer' }] }], null);
    expect(ctx.roles).toEqual(['customer']);
  });

  it('ignora filas con role null y tolera roleRows null', () => {
    expect(buildAuthContext(user, profile, [{ role: null }], null).roles).toEqual([]);
    expect(buildAuthContext(user, profile, null, null).roles).toEqual([]);
  });

  it('resuelve el sub-rol admin válido y rechaza valores desconocidos', () => {
    expect(buildAuthContext(user, profile, [], { sub_role: 'super_admin' }).adminSubRole).toBe('super_admin');
    expect(buildAuthContext(user, profile, [], { sub_role: 'support_agent' }).adminSubRole).toBe('support_agent');
    expect(buildAuthContext(user, profile, [], { sub_role: 'otro' }).adminSubRole).toBeNull();
  });
});
