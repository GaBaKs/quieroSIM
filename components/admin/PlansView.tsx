'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Pencil, X } from 'lucide-react';
import { usd } from './format';
import { updatePlanPricing, setPlanStatus, type AdminPlanRow } from '@/server/actions/admin-plans';

export default function PlansView({ plans, isSuperAdmin }: { plans: AdminPlanRow[]; isSuperAdmin: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<AdminPlanRow | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const toggleStatus = async (plan: AdminPlanRow) => {
    setTogglingId(plan.id);
    const next = plan.status === 'active' ? 'inactive' : 'active';
    await setPlanStatus({ planId: plan.id, status: next });
    setTogglingId(null);
    router.refresh();
  };

  return (
    <>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[820px]">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/30">
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Plan</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Costo (EUR)</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Margen</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Precio final</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Estado</th>
                {isSuperAdmin && <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
              {plans.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-zinc-900 dark:text-zinc-100">{p.name}</div>
                    <div className="text-xs text-zinc-400">{p.countryRegion ?? '—'} · {p.dataAmount ?? '—'} · {p.durationDays ?? '—'}d</div>
                  </td>
                  <td className="py-3 px-4 text-sm text-zinc-600 dark:text-zinc-300">{p.costEur !== null ? `€${p.costEur}` : '—'}</td>
                  <td className="py-3 px-4 text-sm text-zinc-600 dark:text-zinc-300">
                    {p.useFixedPrice ? <span className="text-zinc-400 italic">fijo</span> : p.marginPct !== null ? `${p.marginPct}%` : '—'}
                  </td>
                  <td className="py-3 px-4 text-sm font-black text-zinc-900 dark:text-white">{p.priceFinal !== null ? `${usd(p.priceFinal)}` : '—'}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                      p.status === 'active'
                        ? 'bg-[#b3ff6b]/30 text-green-900 dark:bg-[#b3ff6b]/20 dark:text-[#b3ff6b]'
                        : 'bg-zinc-100 text-zinc-500 dark:bg-white/10 dark:text-zinc-400'
                    }`}>
                      {p.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  {isSuperAdmin && (
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditing(p)}
                          className="flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-white/10 px-2.5 py-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:border-[#9933c1]/50 transition cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Precio
                        </button>
                        <button
                          onClick={() => toggleStatus(p)}
                          disabled={togglingId === p.id}
                          className="rounded-lg border border-zinc-200 dark:border-white/10 px-2.5 py-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:border-[#9933c1]/50 transition disabled:opacity-50 cursor-pointer min-w-[78px]"
                        >
                          {togglingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" /> : p.status === 'active' ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && <PriceEditor plan={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); router.refresh(); }} />}
    </>
  );
}

function PriceEditor({ plan, onClose, onSaved }: { plan: AdminPlanRow; onClose: () => void; onSaved: () => void }) {
  const [useFixed, setUseFixed] = useState(plan.useFixedPrice);
  const [margin, setMargin] = useState(String(plan.marginPct ?? 100));
  const [fixed, setFixed] = useState(String(plan.priceFixed ?? plan.priceFinal ?? ''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useFixed
    ? Number(fixed) || 0
    : plan.costEur !== null
      ? plan.costEur * (1 + (Number(margin) || 0) / 100)
      : 0;

  const save = async () => {
    setBusy(true);
    setError(null);
    const r = await updatePlanPricing({
      planId: plan.id,
      useFixedPrice: useFixed,
      marginPct: useFixed ? undefined : Number(margin),
      priceFixed: useFixed ? Number(fixed) : undefined,
    });
    setBusy(false);
    if (r.ok) onSaved();
    else setError(r.error.message);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => !busy && onClose()}>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={() => !busy && onClose()} className="absolute right-3 top-3 rounded-full p-1 text-zinc-400 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
          <h3 className="font-bold text-lg text-zinc-900 dark:text-white pr-6">{plan.name}</h3>
          <p className="text-xs text-zinc-400 mt-1">Costo del proveedor: {plan.costEur !== null ? `€${plan.costEur}` : '—'}</p>

          <div className="mt-5 space-y-4">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={useFixed} onChange={(e) => setUseFixed(e.target.checked)} className="h-4 w-4 rounded accent-[#9933c1]" />
              <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Usar precio fijo (ignora el margen)</span>
            </label>

            {useFixed ? (
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5">Precio fijo (USD)</label>
                <input type="number" min="0" step="0.01" value={fixed} onChange={(e) => setFixed(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/50 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1]" />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5">Margen (%)</label>
                <input type="number" min="0" step="1" value={margin} onChange={(e) => setMargin(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/50 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1]" />
              </div>
            )}

            <div className="rounded-xl bg-zinc-50 dark:bg-black/30 border border-zinc-100 dark:border-white/5 p-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-zinc-400">Precio final estimado</span>
              <span className="text-lg font-black text-[#9933c1] dark:text-[#b3ff6b]">{usd(Math.round(preview * 100) / 100)}</span>
            </div>

            {error && <p className="text-sm font-medium text-red-500 bg-red-50 dark:bg-red-400/10 rounded-lg p-2.5">{error}</p>}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button onClick={() => !busy && onClose()} disabled={busy} className="rounded-xl px-4 py-2 text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 transition disabled:opacity-50 cursor-pointer">Cancelar</button>
            <button onClick={save} disabled={busy} className="flex items-center gap-2 rounded-xl bg-[#9933c1] hover:bg-[#7100a5] px-4 py-2 text-sm font-black text-white transition disabled:opacity-60 cursor-pointer">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
