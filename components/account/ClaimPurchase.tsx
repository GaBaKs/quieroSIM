'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Link2, Loader2 } from 'lucide-react';
import { claimOrder } from '@/server/actions/esims';

/**
 * Vincular una compra hecha sin iniciar sesión (con OTRO email que el de la
 * cuenta). El usuario ingresa el número de orden del comprobante + ese email.
 */
export default function ClaimPurchase() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [orderRef, setOrderRef] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOkMsg(null);
    const res = await claimOrder({ orderRef, email });
    setBusy(false);
    if (res.ok) {
      setOkMsg('¡Listo! Vinculamos tu compra a tu cuenta.');
      setOrderRef('');
      setEmail('');
      router.refresh();
    } else {
      setError(res.error.message);
    }
  };

  const inputCls =
    'w-full px-4 py-2.5 text-sm rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#9933c1] focus:border-transparent transition';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-[#9933c1] transition cursor-pointer"
      >
        <Link2 className="h-4 w-4" /> ¿Compraste sin iniciar sesión? Vinculá tu compra
      </button>

      {open && (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <p className="text-xs text-slate-500">
            Ingresá el <strong>número de orden</strong> y el <strong>email</strong> que usaste en la compra (están en el email de confirmación que te llegó).
          </p>
          <input value={orderRef} onChange={(e) => setOrderRef(e.target.value)} placeholder="Número de orden (ej. A1B2C3D4)" className={inputCls} required />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email de la compra" className={inputCls} required />
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
          {okMsg && <p className="text-sm font-medium text-green-700">{okMsg}</p>}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-[#9933c1] hover:bg-[#7100a5] text-white text-sm font-bold px-4 py-2.5 transition disabled:opacity-60 cursor-pointer"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? 'Vinculando…' : 'Vincular compra'}
          </button>
        </form>
      )}
    </div>
  );
}
