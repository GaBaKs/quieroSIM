'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * Botón "Continuar con Google" (OAuth). El provider ya está habilitado en
 * Supabase Auth. Redirige a /auth/confirm (que intercambia el code) y de ahí a
 * `next`. OAuth no usa CAPTCHA, así que no toca Turnstile.
 */
export default function GoogleButton({
  next = '/account',
  label = 'Continuar con Google',
}: {
  next?: string;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}` },
    });
    if (error) setLoading(false); // si OAuth arranca bien, el navegador ya redirige
  };

  return (
    <button
      type="button"
      onClick={handleGoogle}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-white/5 text-sm font-bold text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors disabled:opacity-60 cursor-pointer"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
        <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
        <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
        <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
      </svg>
      {loading ? 'Redirigiendo…' : label}
    </button>
  );
}
