'use client';

import { Suspense, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import QuieroButton from '@/components/ui/QuieroButton';
import { Lock } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { claimMyOrders } from '@/server/actions/esims';
import Turnstile, { type TurnstileHandle } from '@/components/Turnstile';
import GoogleButton from '@/components/GoogleButton';

/** Login del usuario final (RF-AUTH-01) — Google OAuth se suma cuando haya credenciales. */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const turnstileRef = useRef<TurnstileHandle>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get('error') === 'invalid_link' ? t('auth.errorInvalidLink') : null,
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const supabase = createSupabaseBrowserClient();
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken },
    });
    if (signInError || !authData.user) {
      setSubmitting(false);
      // El token de Turnstile es de un solo uso: lo gastó este intento, así que
      // reseteamos el widget para que el próximo intento mande uno nuevo.
      turnstileRef.current?.reset();
      const msg = (signInError?.message ?? '').toLowerCase();
      if (signInError?.message === 'Email not confirmed') setError(t('auth.errorUnconfirmed'));
      else if (msg.includes('captcha')) setError(t('auth.errorCaptcha'));
      else if (signInError?.status === 429 || msg.includes('rate limit')) setError(t('auth.errorRateLimit'));
      else setError(t('auth.errorInvalid'));
      return;
    }

    // Vincular las compras guest hechas con este email (idempotente).
    await claimMyOrders();

    // Check if the user is an admin
    const { data: adminData } = await supabase
      .from('admin_profile')
      .select('id')
      .eq('user_id', authData.user.id)
      .single();

    if (adminData) {
      router.replace('/admin');
    } else {
      router.replace('/account');
    }
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#9933c1] rounded-full blur-[100px] opacity-10 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#b3ff6b] rounded-full blur-[100px] opacity-20 pointer-events-none" />

      <div className="max-w-md w-full bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl p-8 border border-slate-200 relative z-10">
        <div className="flex justify-center mb-8">
          <Logo isDark={false} />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">{t('auth.loginTitle')}</h1>
          <p className="text-sm text-slate-500">{t('auth.loginSubtitle')}</p>
        </div>

        <form className="space-y-5" onSubmit={handleLogin}>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('auth.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#9933c1] focus:border-transparent transition-all"
              placeholder="tunombre@viaje.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('auth.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#9933c1] focus:border-transparent transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="text-sm font-medium text-red-500" role="alert">
              {error}
            </p>
          )}

          <Turnstile ref={turnstileRef} onToken={setCaptchaToken} theme="light" />

          <div className="pt-4">
            <QuieroButton
              variant="primary"
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 text-base flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              {submitting ? t('auth.loggingIn') : t('auth.loginBtn')}
            </QuieroButton>
          </div>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs text-slate-400">o</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>
        <GoogleButton next="/account" />

        <div className="mt-6 text-center space-y-3">
          <Link href="/login/forgot" className="block text-sm font-medium text-slate-500 hover:text-[#9933c1] transition-colors">
            {t('auth.forgot')}
          </Link>
          <p className="text-sm text-slate-500">
            {t('auth.noAccount')}{' '}
            <Link href="/register" className="font-bold text-[#9933c1] hover:underline">
              {t('auth.registerLink')}
            </Link>
          </p>
          <Link href="/" className="block text-sm font-medium text-slate-400 hover:text-slate-700 transition-colors">
            &larr; {t('auth.backHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
