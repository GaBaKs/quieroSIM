'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, X, Loader2 } from 'lucide-react';
import QuieroButton from '@/components/ui/QuieroButton';
import { createUser } from '@/server/actions/admin-users';

/** Crear usuario desde el panel (solo super_admin). Email + contraseña + rol. */
export default function CreateUserDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const close = () => {
    if (busy) return;
    setOpen(false);
    setEmail('');
    setPassword('');
    setRole('customer');
    setError(null);
    setOkMsg(null);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    const res = await createUser({ email, password, role });
    setBusy(false);
    if (res.ok) {
      setOkMsg(`Usuario ${email} creado.`);
      setEmail('');
      setPassword('');
      setRole('customer');
      router.refresh();
    } else {
      setError(res.error.message);
    }
  };

  const inputCls =
    'w-full px-4 py-3 text-sm bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#9933c1]/30 focus:border-[#9933c1] transition-all';
  const labelCls = 'block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1.5';

  return (
    <>
      <QuieroButton
        variant="primary"
        onClick={() => setOpen(true)}
        className="text-sm py-2.5 px-4 flex items-center gap-2"
      >
        <UserPlus className="h-4 w-4" /> Crear usuario
      </QuieroButton>

      <AnimatePresence>
        {open && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={close}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={close}
                className="absolute right-3 top-3 rounded-full p-1 text-zinc-400 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
              <h3 className="font-black text-lg text-zinc-900 dark:text-white pr-6 mb-4">Crear usuario</h3>

              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="usuario@mail.com" />
                </div>
                <div>
                  <label className={labelCls}>Contraseña</label>
                  <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="mín. 8 · may + min + número" />
                </div>
                <div>
                  <label className={labelCls}>Rol</label>
                  <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
                    <option value="customer">Cliente</option>
                    <option value="affiliate">Afiliado</option>
                    <option value="agency">Agencia</option>
                  </select>
                  <p className="text-xs text-zinc-400 mt-1">El rol de administrador se otorga desde Configuración.</p>
                </div>
              </div>

              {error && <p className="mt-3 text-sm font-medium text-red-500 bg-red-50 dark:bg-red-400/10 rounded-lg p-2.5">{error}</p>}
              {okMsg && <p className="mt-3 text-sm font-medium text-green-700 bg-[#b3ff6b]/20 rounded-lg p-2.5">{okMsg}</p>}

              <div className="mt-6 flex justify-end gap-3">
                <button onClick={close} disabled={busy} className="rounded-xl px-4 py-2 text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 transition disabled:opacity-50 cursor-pointer">
                  Cerrar
                </button>
                <QuieroButton variant="primary" onClick={submit} disabled={busy} className="text-sm py-2 px-4 flex items-center gap-2">
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  {busy ? 'Creando…' : 'Crear'}
                </QuieroButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
