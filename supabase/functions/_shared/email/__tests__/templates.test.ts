import { describe, expect, it } from 'vitest';
import { renderQrEmail, QR_CONTENT_ID, type EmailLang } from '../templates.ts';
import { qrPngBase64 } from '../qr-png.ts';

const BASE = {
  planName: 'eSIM Estados Unidos 5GB',
  lpa: 'LPA:1$smdp.io$K2-TEST01-MOCK01',
  iosTapLink: 'https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=x',
  orderShortId: '290E0F9C',
};

describe('renderQrEmail', () => {
  it.each(['ES', 'EN', 'PT'] as EmailLang[])('renderiza en %s con LPA, QR inline y orden', (lang) => {
    const { subject, html } = renderQrEmail({ ...BASE, lang });
    expect(subject).toContain(BASE.planName);
    expect(html).toContain(BASE.lpa);
    expect(html).toContain(`cid:${QR_CONTENT_ID}`);
    expect(html).toContain(BASE.iosTapLink);
    expect(html).toContain('#290E0F9C');
  });

  it('los tres idiomas producen asuntos distintos', () => {
    const subjects = (['ES', 'EN', 'PT'] as EmailLang[]).map((lang) => renderQrEmail({ ...BASE, lang }).subject);
    expect(new Set(subjects).size).toBe(3);
  });

  it('sin iosTapLink no aparece el botón de instalación iOS', () => {
    const { html } = renderQrEmail({ ...BASE, lang: 'ES', iosTapLink: null });
    expect(html).not.toContain('esimsetup.apple.com');
  });

  it('escapa HTML en datos provistos (el LPA podría traer caracteres raros)', () => {
    const { html } = renderQrEmail({ ...BASE, lang: 'ES', planName: '<script>alert(1)</script>' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('idioma desconocido cae a ES', () => {
    const { subject } = renderQrEmail({ ...BASE, lang: 'XX' as EmailLang });
    expect(subject).toBe(renderQrEmail({ ...BASE, lang: 'ES' }).subject);
  });
});

describe('qrPngBase64', () => {
  it('genera un PNG válido en base64 a partir del LPA', async () => {
    const b64 = await qrPngBase64(BASE.lpa);
    // Firma PNG: 89 50 4E 47 → "iVBORw" en base64.
    expect(b64.startsWith('iVBORw')).toBe(true);
    expect(b64.length).toBeGreaterThan(500);
  });
});
