'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

/**
 * Widget de Cloudflare Turnstile (CAPTCHA, Fase 12). Renderiza el desafío y
 * devuelve el token vía `onToken`. En modo "Managed" suele ser invisible (se
 * resuelve solo). Si `NEXT_PUBLIC_TURNSTILE_SITE_KEY` no está seteada, no
 * renderiza nada (no rompe el formulario).
 *
 * El token se pasa a `signInWithPassword`/`signUp`/`resetPasswordForEmail` en
 * `options.captchaToken`; Supabase Auth lo verifica server-side contra Cloudflare.
 */
declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
      reset: (id?: string) => void;
    };
  }
}

const SCRIPT_ID = 'cf-turnstile-script';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export interface TurnstileHandle {
  /** Reinicia el widget y descarta el token actual. Los tokens de Turnstile son
   *  de un solo uso: tras un intento fallido hay que resetear para obtener uno nuevo. */
  reset: () => void;
}

const Turnstile = forwardRef<TurnstileHandle, { onToken: (token: string) => void }>(function Turnstile(
  { onToken },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.reset(widgetIdRef.current);
        } catch {
          /* noop */
        }
      }
      onToken('');
    },
  }));

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!siteKey) return;
    let cancelled = false;

    function renderWidget() {
      if (cancelled || !window.turnstile || !containerRef.current || widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => onToken(token),
        'expired-callback': () => onToken(''),
        'error-callback': () => onToken(''),
      });
    }

    if (window.turnstile) {
      renderWidget();
    } else if (!document.getElementById(SCRIPT_ID)) {
      const s = document.createElement('script');
      s.id = SCRIPT_ID;
      s.src = SCRIPT_SRC;
      s.async = true;
      s.defer = true;
      s.onload = renderWidget;
      document.head.appendChild(s);
    } else {
      const poll = setInterval(() => {
        if (window.turnstile) {
          clearInterval(poll);
          renderWidget();
        }
      }, 200);
      return () => clearInterval(poll);
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* noop */
        }
        widgetIdRef.current = null;
      }
    };
  }, [onToken]);

  return <div ref={containerRef} className="flex justify-center" />;
});

export default Turnstile;
