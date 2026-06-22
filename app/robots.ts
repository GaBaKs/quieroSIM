import type { MetadataRoute } from 'next';

/**
 * robots.txt (Fase 12 — anti-scraping, parte disuasiva). La landing/catálogo
 * queda indexable (SEO); se bloquean rutas privadas/operativas. El robots solo
 * disuade a crawlers que lo respetan — la mitigación real es rate limiting +
 * CAPTCHA + headers.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/account', '/auth', '/update-password', '/login', '/register'],
      },
    ],
  };
}
