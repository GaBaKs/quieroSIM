import { describe, expect, it, vi } from 'vitest';
import { createResendClient } from '../resend.ts';

describe('resend client', () => {
  it('arma el request correcto (URL, Bearer, payload, idempotencia)', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchFn = vi.fn(async (url: unknown, init?: RequestInit) => {
      calls.push({ url: String(url), init: init! });
      return new Response(JSON.stringify({ id: 'email_123' }), { status: 200 });
    }) as unknown as typeof fetch;

    const client = createResendClient({
      apiKey: 're_test_api_key_123456',
      from: 'QuieroSIM <hola@quierosim.com>',
      fetchFn,
    });

    const r = await client.sendEmail({
      to: 'viajero@test.com',
      subject: 'Tu eSIM está lista',
      html: '<p>QR adjunto</p>',
      idempotencyKey: 'qr_delivery:abc',
    });

    expect(r).toEqual({ ok: true, data: { id: 'email_123' } });
    expect(calls[0].url).toBe('https://api.resend.com/emails');
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.authorization).toBe('Bearer re_test_api_key_123456');
    expect(headers['idempotency-key']).toBe('qr_delivery:abc');
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      from: 'QuieroSIM <hola@quierosim.com>',
      to: ['viajero@test.com'],
      subject: 'Tu eSIM está lista',
      html: '<p>QR adjunto</p>',
    });
  });

  it('error de la API → Result de error sin filtrar la API key', async () => {
    const fetchFn = vi.fn(async () =>
      new Response(JSON.stringify({ message: 'Invalid key re_test_api_key_123456' }), { status: 401 }),
    ) as unknown as typeof fetch;

    const client = createResendClient({ apiKey: 're_test_api_key_123456', from: 'x@y.com', fetchFn });
    const r = await client.sendEmail({ to: 'a@b.com', subject: 's', html: '<p/>' });

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('EMAIL_SEND_FAILED');
    expect(r.error.message).toContain('401');
    expect(r.error.message).not.toContain('re_test_api_key_123456');
  });

  it('excepción de red → Result de error', async () => {
    const fetchFn = vi.fn(async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;

    const client = createResendClient({ apiKey: 're_x', from: 'x@y.com', fetchFn });
    const r = await client.sendEmail({ to: 'a@b.com', subject: 's', html: '<p/>' });
    expect(r.ok).toBe(false);
  });
});
