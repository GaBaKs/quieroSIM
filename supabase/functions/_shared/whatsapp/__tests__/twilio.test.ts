import { describe, expect, it, vi } from 'vitest';
import { createTwilioClient, normalizeE164 } from '../twilio.ts';

describe('twilio client', () => {
  it('arma el request correcto (URL, Basic auth, form, prefijo whatsapp:, media)', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchFn = vi.fn(async (url: unknown, init?: RequestInit) => {
      calls.push({ url: String(url), init: init! });
      return new Response(JSON.stringify({ sid: 'SM123' }), { status: 201 });
    }) as unknown as typeof fetch;

    const client = createTwilioClient({
      accountSid: 'AC_test_sid',
      authToken: 'tok_secret_123',
      from: '+14155238886',
      fetchFn,
    });

    const r = await client.sendWhatsapp({ to: '+5491150000000', body: 'Hola', mediaUrl: 'https://x/qr.png' });
    expect(r).toEqual({ ok: true, data: { sid: 'SM123' } });

    expect(calls[0].url).toBe('https://api.twilio.com/2010-04-01/Accounts/AC_test_sid/Messages.json');
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.authorization).toBe(`Basic ${btoa('AC_test_sid:tok_secret_123')}`);
    expect(headers['content-type']).toBe('application/x-www-form-urlencoded');

    const form = new URLSearchParams(String(calls[0].init.body));
    expect(form.get('From')).toBe('whatsapp:+14155238886');
    expect(form.get('To')).toBe('whatsapp:+5491150000000');
    expect(form.get('Body')).toBe('Hola');
    expect(form.get('MediaUrl')).toBe('https://x/qr.png');
  });

  it('sin mediaUrl no manda el campo MediaUrl', async () => {
    let body = '';
    const fetchFn = vi.fn(async (_u: unknown, init?: RequestInit) => {
      body = String(init!.body);
      return new Response(JSON.stringify({ sid: 'SM1' }), { status: 201 });
    }) as unknown as typeof fetch;
    const client = createTwilioClient({ accountSid: 'AC', authToken: 't', from: '+1', fetchFn });
    await client.sendWhatsapp({ to: '+5491150000000', body: 'x' });
    expect(new URLSearchParams(body).has('MediaUrl')).toBe(false);
  });

  it('error de la API → Result de error con el status', async () => {
    const fetchFn = vi.fn(async () =>
      new Response(JSON.stringify({ message: 'bad number', code: 21211 }), { status: 400 }),
    ) as unknown as typeof fetch;
    const client = createTwilioClient({ accountSid: 'AC', authToken: 't', from: '+1', fetchFn });
    const r = await client.sendWhatsapp({ to: '+5491150000000', body: 'x' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('WHATSAPP_SEND_FAILED');
    expect(r.error.message).toContain('400');
  });

  it('excepción de red → Result de error', async () => {
    const fetchFn = vi.fn(async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;
    const client = createTwilioClient({ accountSid: 'AC', authToken: 't', from: '+1', fetchFn });
    const r = await client.sendWhatsapp({ to: '+5491150000000', body: 'x' });
    expect(r.ok).toBe(false);
  });
});

describe('normalizeE164', () => {
  it('normaliza números válidos y rechaza basura', () => {
    expect(normalizeE164('+54 911 5000-0000')).toBe('+5491150000000');
    expect(normalizeE164('14155238886')).toBe('+14155238886');
    expect(normalizeE164('123')).toBeNull(); // muy corto
    expect(normalizeE164('')).toBeNull();
    expect(normalizeE164(null)).toBeNull();
    expect(normalizeE164(undefined)).toBeNull();
  });
});
