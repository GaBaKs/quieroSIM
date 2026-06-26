'use client';

import { useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import QuieroButton from '@/components/ui/QuieroButton';
import { Mail } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import Turnstile from '@/components/Turnstile';

/** Recuperación de contraseña del usuario final. */
export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/update-password`,
      captchaToken,
    });
    // Siempre confirmar (no revelar si el email existe o no).
    setSent(true);
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl p-8 border border-slate-200">
        <div className="flex justify-center mb-8">
          <Logo isDark={false} />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">{t('auth.forgotTitle')}</h1>
          <p className="text-sm text-slate-500">{t('auth.forgotSubtitle')}</p>
        </div>

        {sent ? (
          <p className="text-sm text-center font-medium text-slate-700">{t('auth.sentDesc')}</p>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('auth.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#9933c1] focus:border-transparent transition-all"
                placeholder={t('auth.placeholderEmail')}
                required
              />
            </div>
            <Turnstile onToken={setCaptchaToken} />
            <QuieroButton
              variant="primary"
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 text-base flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />
              {submitting ? t('auth.sending') : t('auth.sendLink')}
            </QuieroButton>
          </form>
        )}

        <div className="mt-8 text-center">
          <Link href="/login" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
            &larr; {t('auth.backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  );
}
