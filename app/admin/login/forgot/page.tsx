'use client';

import { useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import QuieroButton from '@/components/ui/QuieroButton';
import { Mail } from 'lucide-react';
import { useTheme } from '@/components/admin/ThemeProvider';
import { useMounted } from '@/hooks/use-mounted';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import Turnstile from '@/components/Turnstile';

export default function ForgotPasswordPage() {
  const { theme } = useTheme();
  const mounted = useMounted();
  const [email, setEmail] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/admin/update-password`,
      captchaToken,
    });
    // Siempre confirmar (no revelar si el email existe o no).
    setSent(true);
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-gradient-to-b dark:from-[#18181b] dark:to-black px-4 transition-colors duration-300">
      <div className="max-w-md w-full bg-white/80 dark:bg-zinc-900/50 backdrop-blur-xl rounded-3xl shadow-xl p-8 border border-zinc-200 dark:border-white/10 transition-colors duration-300">
        <div className="flex justify-center mb-10">
          <Logo isDark={mounted ? theme === 'dark' : true} />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white mb-2 tracking-tight">Recuperar contraseña</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Te enviamos un link para definir una contraseña nueva.
          </p>
        </div>

        {sent ? (
          <p className="text-sm text-center font-medium text-zinc-700 dark:text-zinc-300">
            Si el email existe, vas a recibir el link de recuperación en unos minutos. Revisá también el spam.
          </p>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-black/50 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#9933c1] focus:border-transparent transition-all"
                placeholder="admin@quierosim.com"
                required
              />
            </div>
            <Turnstile onToken={setCaptchaToken} />
            <QuieroButton
              variant="secondary"
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 text-base flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />
              {submitting ? 'Enviando…' : 'Enviar link'}
            </QuieroButton>
          </form>
        )}

        <div className="mt-8 text-center">
          <Link
            href="/admin/login"
            className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            &larr; Volver al login
          </Link>
        </div>
      </div>
    </div>
  );
}
