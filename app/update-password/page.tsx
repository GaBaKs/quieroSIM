'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/ui/Logo';
import QuieroButton from '@/components/ui/QuieroButton';
import { KeyRound } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { AuthError } from '@supabase/supabase-js';

/**
 * Traduce el error de `updateUser` a una clave i18n concreta. Supabase devuelve
 * 422 cuando la contraseña no pasa validación (débil o igual a la anterior) —
 * NO es un problema del link. Solo los errores de sesión ausente piden reabrir.
 */
function messageKeyFor(err: AuthError): string {
  if (err.code === 'same_password') return 'auth.errorSamePassword';
  if (err.code === 'weak_password' || err.status === 422) return 'auth.errorPasswordWeak';
  if (err.code === 'session_not_found' || err.status === 401 || err.status === 403)
    return 'auth.errorSessionExpired';
  return 'auth.errorUpdate';
}

/** Nueva contraseña del usuario final (llega con sesión desde el link de recovery). */
export default function UpdatePasswordPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
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
    // Confirmamos que el link de recovery dejó sesión activa antes de actualizar.
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setSubmitting(false);
      setError(t('auth.errorSessionExpired'));
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setSubmitting(false);
      setError(t(messageKeyFor(updateError)));
      return;
    }
    router.replace('/account');
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl p-8 border border-slate-200">
        <div className="flex justify-center mb-8">
          <Logo isDark={false} />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">{t('auth.updateTitle')}</h1>
          <p className="text-sm text-slate-500">{t('auth.updateSubtitle')}</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('auth.newPassword')}</label>
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

          <QuieroButton
            variant="primary"
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 text-base flex items-center justify-center gap-2"
          >
            <KeyRound className="w-4 h-4" />
            {submitting ? t('auth.saving') : t('auth.saveBtn')}
          </QuieroButton>
        </form>
      </div>
    </div>
  );
}
