'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Plus, Pencil, X } from 'lucide-react';
import { usd, shortDate } from './format';
import {
  createCoupon, updateCoupon, setCouponActive,
  type AdminCouponRow, type CouponInput,
} from '@/server/actions/admin-coupons';

type PlanOpt = { id: string; name: string };

function couponState(c: AdminCouponRow): { label: string; cls: string } {
  if (!c.isActive) return { label: 'Inactivo', cls: 'bg-zinc-100 text-zinc-500 dark:bg-white/10 dark:text-zinc-400' };
  if (c.expiresAt && new Date(c.expiresAt) < new Date()) return { label: 'Vencido', cls: 'bg-red-50 text-red-600 dark:bg-red-400/15 dark:text-red-300' };
  if (c.maxUsesGlobal !== null && c.uses >= c.maxUsesGlobal) return { label: 'Agotado', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300' };
  if (c.singleUseGlobal && c.uses >= 1) return { label: 'Usado', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300' };
  return { label: 'Activo', cls: 'bg-[#b3ff6b]/30 text-green-900 dark:bg-[#b3ff6b]/20 dark:text-[#b3ff6b]' };
}

export default function CouponsView({ coupons, plans }: { coupons: AdminCouponRow[]; plans: PlanOpt[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<AdminCouponRow | 'new' | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const toggle = async (c: AdminCouponRow) => {
    setTogglingId(c.id);
    await setCouponActive({ id: c.id, isActive: !c.isActive });
    setTogglingId(null);
    router.refresh();
  };

  return (
    <>
      <button
        onClick={() => setEditing('new')}
        className="flex items-center gap-1.5 rounded-xl bg-[#9933c1] hover:bg-[#7100a5] px-4 py-2 text-sm font-bold text-white transition cursor-pointer"
      >
        <Plus className="h-4 w-4" /> Nuevo cupón
      </button>

      {coupons.length === 0 ? (
        <p className="text-sm text-zinc-400 py-10 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10">
          Todavía no hay cupones. Creá el primero.
        </p>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[820px]">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/30">
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Código</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Descuento</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Usos</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Vence</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Estado</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                {coupons.map((c) => {
                  const st = couponState(c);
                  return (
                    <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{c.code}</span>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          {c.singleUsePerAccount ? '1×cuenta · ' : ''}{c.nonStackable ? 'no acumulable' : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm font-bold text-zinc-700 dark:text-zinc-300">
                        {c.discountType === 'percentage' ? `${c.discountValue}%` : usd(c.discountValue)}
                        {c.minPurchase ? <span className="block text-[11px] font-normal text-zinc-400">mín. {usd(c.minPurchase)}</span> : null}
                      </td>
                      <td className="py-3 px-4 text-sm text-zinc-600 dark:text-zinc-300">
                        {c.uses}{c.maxUsesGlobal !== null ? ` / ${c.maxUsesGlobal}` : c.singleUseGlobal ? ' / 1' : ''}
                        {c.totalDiscount > 0 ? <span className="block text-[11px] text-zinc-400">{usd(c.totalDiscount)} dto.</span> : null}
                      </td>
                      <td className="py-3 px-4 text-sm text-zinc-500">{c.expiresAt ? shortDate(c.expiresAt) : '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${st.cls}`}>{st.label}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setEditing(c)} className="flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-white/10 px-2.5 py-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:border-[#9933c1]/50 transition cursor-pointer">
                            <Pencil className="h-3.5 w-3.5" /> Editar
                          </button>
                          <button onClick={() => toggle(c)} disabled={togglingId === c.id} className="rounded-lg border border-zinc-200 dark:border-white/10 px-2.5 py-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:border-[#9933c1]/50 transition disabled:opacity-50 cursor-pointer min-w-[78px]">
                            {togglingId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" /> : c.isActive ? 'Desactivar' : 'Activar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <CouponEditor
          coupon={editing === 'new' ? null : editing}
          plans={plans}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); router.refresh(); }}
        />
      )}
    </>
  );
}

function isoOrNull(v: string): string | null {
  return v ? new Date(v).toISOString() : null;
}
function toDateInput(iso: string | null): string {
  return iso ? new Date(iso).toISOString().slice(0, 10) : '';
}

function CouponEditor({ coupon, plans, onClose, onSaved }: { coupon: AdminCouponRow | null; plans: PlanOpt[]; onClose: () => void; onSaved: () => void }) {
  const [code, setCode] = useState(coupon?.code ?? '');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(coupon?.discountType ?? 'percentage');
  const [discountValue, setDiscountValue] = useState(String(coupon?.discountValue ?? 10));
  const [minPurchase, setMinPurchase] = useState(coupon?.minPurchase != null ? String(coupon.minPurchase) : '');
  const [expiresAt, setExpiresAt] = useState(toDateInput(coupon?.expiresAt ?? null));
  const [maxUses, setMaxUses] = useState(coupon?.maxUsesGlobal != null ? String(coupon.maxUsesGlobal) : '');
  const [singlePerAccount, setSinglePerAccount] = useState(coupon?.singleUsePerAccount ?? false);
  const [singleGlobal, setSingleGlobal] = useState(coupon?.singleUseGlobal ?? false);
  const [nonStackable, setNonStackable] = useState(coupon?.nonStackable ?? false);
  const [planIds, setPlanIds] = useState<string[]>(coupon?.applicablePlanIds ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePlan = (id: string) => setPlanIds((cur) => (cur.includes(id) ? cur.filter((p) => p !== id) : [...cur, id]));

  const save = async () => {
    setBusy(true);
    setError(null);
    const payload: CouponInput = {
      code,
      discountType,
      discountValue: Number(discountValue),
      minPurchase: minPurchase ? Number(minPurchase) : null,
      applicablePlanIds: planIds,
      expiresAt: expiresAt ? isoOrNull(expiresAt) : null,
      maxUsesGlobal: maxUses ? Number(maxUses) : null,
      singleUsePerAccount: singlePerAccount,
      singleUseGlobal: singleGlobal,
      nonStackable,
    };
    const result = coupon ? await updateCoupon({ ...payload, id: coupon.id }) : await createCoupon(payload);
    setBusy(false);
    if (result.ok) onSaved();
    else setError(result.error.message);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => !busy && onClose()}>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
          className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={() => !busy && onClose()} className="absolute right-3 top-3 rounded-full p-1 text-zinc-400 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
          <h3 className="font-bold text-lg text-zinc-900 dark:text-white pr-6 mb-5">{coupon ? 'Editar cupón' : 'Nuevo cupón'}</h3>

          <div className="space-y-4">
            <Field label="Código">
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="VERANO20"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/50 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#9933c1]" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo">
                <select value={discountType} onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/50 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1]">
                  <option value="percentage">Porcentaje (%)</option>
                  <option value="fixed">Monto fijo (USD)</option>
                </select>
              </Field>
              <Field label={discountType === 'percentage' ? 'Porcentaje' : 'Monto (USD)'}>
                <input type="number" min="0" step="0.01" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/50 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1]" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Compra mínima (USD, opc.)">
                <input type="number" min="0" step="0.01" value={minPurchase} onChange={(e) => setMinPurchase(e.target.value)} placeholder="—"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/50 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1]" />
              </Field>
              <Field label="Vence (opc.)">
                <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/50 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1]" />
              </Field>
            </div>

            <Field label="Límite de usos global (opc.)">
              <input type="number" min="1" step="1" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="Sin límite"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/50 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1]" />
            </Field>

            <div className="space-y-2">
              <span className="block text-xs font-bold text-zinc-500">Reglas de uso</span>
              <Check2 label="Un solo uso por cuenta/email" checked={singlePerAccount} onChange={setSinglePerAccount} />
              <Check2 label="Un solo uso global (1 redención total)" checked={singleGlobal} onChange={setSingleGlobal} />
              <Check2 label="No acumulable con otros cupones" checked={nonStackable} onChange={setNonStackable} />
            </div>

            <Field label="Planes aplicables (vacío = todos)">
              <div className="max-h-32 overflow-y-auto rounded-xl border border-zinc-200 dark:border-white/10 p-2 space-y-1">
                {plans.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer px-1 py-0.5">
                    <input type="checkbox" checked={planIds.includes(p.id)} onChange={() => togglePlan(p.id)} className="h-4 w-4 rounded accent-[#9933c1]" />
                    {p.name}
                  </label>
                ))}
              </div>
            </Field>

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-zinc-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Check2({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded accent-[#9933c1]" />
      <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
    </label>
  );
}
