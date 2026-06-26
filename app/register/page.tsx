'use client';

import { Suspense, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import QuieroButton from '@/components/ui/QuieroButton';
import { MailCheck, UserPlus } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import Turnstile, { type TurnstileHandle } from '@/components/Turnstile';
import GoogleButton from '@/components/GoogleButton';

/**
 * Registro del usuario final (RF-AUTH-01: email+contraseña con verificación
 * obligatoria; Google OAuth se suma cuando haya credenciales). Llega también
 * desde el éxito del checkout con ?email= prellenado (RF-CHK-02) — al
 * confirmar el email, claim_my_orders() le vincula esas compras.
 */
function RegisterForm() {
  const searchParams = useSearchParams();
  const { t, lang } = useLanguage();

  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const turnstileRef = useRef<TurnstileHandle>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError(t('auth.errorPasswordShort'));
      return;
    }
    if (password !== confirm) {
      setError(t('auth.errorPasswordMismatch'));
      return;
    }
    setSubmitting(true);
    const supabase = createSupabaseBrowserClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=/account`,
        data: { lang },
        captchaToken,
      },
    });
    setSubmitting(false);
    if (signUpError) {
      // Token de Turnstile gastado en este intento → reset para el próximo.
      turnstileRef.current?.reset();
      setError(t('auth.errorInvalid'));
      return;
    }
    // Email ya registrado: Supabase devuelve un user "fantasma" sin identities.
    if (data.user && data.user.identities?.length === 0) {
      turnstileRef.current?.reset();
      setError(t('auth.errorEmailTaken'));
      return;
    }
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#9933c1] rounded-full blur-[100px] opacity-10 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#b3ff6b] rounded-full blur-[100px] opacity-20 pointer-events-none" />

      <div className="max-w-md w-full bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl p-8 border border-slate-200 relative z-10">
        <div className="flex justify-center mb-8">
          <Logo isDark={false} />
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#b3ff6b]/30">
              <MailCheck className="h-7 w-7 text-slate-900" />
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">{t('auth.checkInboxTitle')}</h1>
            <p className="text-sm text-slate-500">{t('auth.checkInboxDesc')}</p>
            <Link href="/login" className="inline-block text-sm font-bold text-[#9933c1] hover:underline">
              {t('auth.backToLogin')}
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">{t('auth.registerTitle')}</h1>
              <p className="text-sm text-slate-500">{t('auth.registerSubtitle')}</p>
            </div>

            <form className="space-y-5" onSubmit={handleRegister}>
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
                  autoComplete="new-password"
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9933c1] focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('auth.repeatPassword')}</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9933c1] focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <p className="text-sm font-medium text-red-500" role="alert">
                  {error}
                </p>
              )}

              <Turnstile ref={turnstileRef} onToken={setCaptchaToken} />

              <div className="pt-4">
                <QuieroButton
                  variant="primary"
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 text-base flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  {submitting ? t('auth.registering') : t('auth.registerBtn')}
                </QuieroButton>
              </div>
            </form>

            <div className="flex items-center gap-3 my-6">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs text-slate-400">o</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <GoogleButton next="/account" />

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-500">
                {t('auth.haveAccount')}{' '}
                <Link href="/login" className="font-bold text-[#9933c1] hover:underline">
                  {t('auth.loginLink')}
                </Link>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
