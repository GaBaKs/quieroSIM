import { describe, expect, it } from 'vitest';
import { scrub } from '../logger';

describe('scrub — el logger jamás registra secretos ni PII (Plan Backend §2.9)', () => {
  it('redacta claves sensibles por nombre', () => {
    const out = scrub({
      token: 'abc123',
      qrcode: 'LPA:1$smdp.io$K2-XYZ',
      esim_passport: 'https://pass.yesim.app/x',
      email: 'cliente@mail.com',
      phone_whatsapp: '+5491155555555',
      full_name: 'Juan Pérez',
      card_number: '4242424242424242',
      iccid: '8934567890123456789',
      orderId: 'ord_123', // no sensible: se conserva
      amount: 25,
    }) as Record<string, unknown>;

    expect(out.token).toBe('[REDACTED]');
    expect(out.qrcode).toBe('[REDACTED]');
    expect(out.esim_passport).toBe('[REDACTED]');
    expect(out.email).toBe('[REDACTED]');
    expect(out.phone_whatsapp).toBe('[REDACTED]');
    expect(out.full_name).toBe('[REDACTED]');
    expect(out.card_number).toBe('[REDACTED]');
    expect(out.iccid).toBe('[REDACTED]');
    expect(out.orderId).toBe('ord_123');
    expect(out.amount).toBe(25);
  });

  it('redacta el token de YeSim dentro de URLs (va en query string)', () => {
    const out = scrub('GET https://partners-api.yesim.biz/plans?token=super-secreto-123&lang=es');
    expect(out).not.toContain('super-secreto-123');
    expect(out).toContain('token=[REDACTED]');
  });

  it('redacta strings LPA, claves Stripe y JWT en texto libre', () => {
    const out = scrub({
      note: 'qr LPA:1$smdp.io$K2-ABCDEF y clave sk_test_abcDEF123 y jwt eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.abc-def_ghi',
    }) as Record<string, unknown>;
    const note = String(out.note);
    expect(note).not.toContain('K2-ABCDEF');
    expect(note).not.toContain('sk_test_abcDEF123');
    expect(note).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
  });

  it('redacta emails sueltos en strings', () => {
    const out = scrub('fallo el envío a viajero@gmail.com');
    expect(out).not.toContain('viajero@gmail.com');
  });

  it('recorre objetos anidados y arrays', () => {
    const out = scrub({ orders: [{ id: 1, guest_email: 'x@y.com' }] }) as {
      orders: Array<Record<string, unknown>>;
    };
    expect(out.orders[0].guest_email).toBe('[REDACTED]');
    expect(out.orders[0].id).toBe(1);
  });

  it('maneja Errors sin filtrar el mensaje crudo sensible', () => {
    const out = scrub(new Error('timeout llamando ?token=tok-real-999')) as Record<string, string>;
    expect(out.message).not.toContain('tok-real-999');
  });
});
