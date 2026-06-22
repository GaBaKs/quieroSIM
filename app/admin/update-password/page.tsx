'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/ui/Logo';
import QuieroButton from '@/components/ui/QuieroButton';
import { KeyRound } from 'lucide-react';
import { useTheme } from '@/components/admin/ThemeProvider';
import { useMounted } from '@/hooks/use-mounted';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { AuthError } from '@supabase/supabase-js';

/** Mensaje según el error real de `updateUser` (422 = contraseña inválida, no link). */
function messageFor(err: AuthError): string {
  if (err.code === 'same_password') return 'La nueva contraseña tiene que ser distinta a la anterior.';
  if (err.code === 'weak_password' || err.status === 422)
    return 'La contraseña no cumple los requisitos: al menos 8 caracteres, con mayúsculas, minúsculas y números.';
  if (err.code === 'session_not_found' || err.status === 401 || err.status === 403)
    return 'El link de recuperación venció o ya se usó. Pedí uno nuevo desde "Recuperar contraseña".';
  return 'No se pudo actualizar la contraseña. Abrí el link del email de nuevo.';
}

export default function UpdatePasswordPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const mounted = useMounted();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setSubmitting(true);
    const supabase = createSupabaseBrowserClient();
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setSubmitting(false);
      setError('El link de recuperación venció o ya se usó. Pedí uno nuevo desde "Recuperar contraseña".');
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setSubmitting(false);
      setError(messageFor(updateError));
      return;
    }
    router.replace('/admin');
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-gradient-to-b dark:from-[#18181b] dark:to-black px-4 transition-colors duration-300">
      <div className="max-w-md w-full bg-white/80 dark:bg-zinc-900/50 backdrop-blur-xl rounded-3xl shadow-xl p-8 border border-zinc-200 dark:border-white/10 transition-colors duration-300">
        <div className="flex justify-center mb-10">
          <Logo isDark={mounted ? theme === 'dark' : true} />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white mb-2 tracking-tight">Nueva contraseña</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Definí la contraseña nueva de tu cuenta.</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">Contraseña nueva</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-black/50 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1] focus:border-transparent transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">Repetir contraseña</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-black/50 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1] focus:border-transparent transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="text-sm font-medium text-red-500 dark:text-red-400" role="alert">
              {error}
            </p>
          )}

          <QuieroButton
            variant="secondary"
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 text-base flex items-center justify-center gap-2"
          >
            <KeyRound className="w-4 h-4" />
            {submitting ? 'Guardando…' : 'Guardar contraseña'}
          </QuieroButton>
        </form>
      </div>
    </div>
  );
}
