'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/ui/Logo';
import QuieroButton from '@/components/ui/QuieroButton';
import { KeyRound } from 'lucide-react';
import { useTheme } from '@/components/admin/ThemeProvider';
import { useMounted } from '@/hooks/use-mounted';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

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
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setSubmitting(false);
      setError('No se pudo actualizar la contraseña. Abrí el link del email de nuevo.');
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
