'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Check, Pause, Play, X, Link2, Ticket, Users, DollarSign, Banknote, Loader2, Pencil } from 'lucide-react';
import { setAffiliateStatus, markWithdrawalPaid, updateAffiliateCoupon, type AdminAffiliateRow, type PendingWithdrawal } from '@/server/actions/admin-affiliates';
import CreateUserDialog from '@/components/admin/CreateUserDialog';

const usd = (n: number) => `$${n.toFixed(2)}`;

const STATUS: Record<AdminAffiliateRow['status'], { label: string; cls: string }> = {
  pending: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300' },
  approved: { label: 'Activo', cls: 'bg-[#b3ff6b]/30 text-green-900 dark:bg-[#b3ff6b]/20 dark:text-[#b3ff6b]' },
  suspended: { label: 'Suspendido', cls: 'bg-zinc-200 text-zinc-600 dark:bg-white/10 dark:text-zinc-300' },
  rejected: { label: 'Rechazado', cls: 'bg-red-50 text-red-600 dark:bg-red-400/15 dark:text-red-300' },
};

export default function AffiliatesView({ affiliates, withdrawals }: { affiliates: AdminAffiliateRow[]; withdrawals: PendingWithdrawal[] }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | AdminAffiliateRow['status']>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Edición del cupón del afiliado (código + descuento).
  const [editId, setEditId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editDisc, setEditDisc] = useState('');
  const [savingCoupon, setSavingCoupon] = useState(false);

  const startEdit = (a: AdminAffiliateRow) => {
    setEditId(a.id);
    setEditCode(a.couponCode ?? '');
    setEditDisc(String(a.couponDiscountPct ?? 10));
  };
  const saveCoupon = async (affiliateId: string) => {
    setSavingCoupon(true);
    const res = await updateAffiliateCoupon({ affiliateId, code: editCode.trim(), discountPct: Number(editDisc) });
    setSavingCoupon(false);
    if (res.ok) { setEditId(null); router.refresh(); }
    else alert(res.error.message);
  };

  // Resumen (reporte rápido) derivado del listado.
  const activeCount = affiliates.filter((a) => a.status === 'approved').length;
  const pendingApproval = affiliates.filter((a) => a.status === 'pending').length;
  const totalCommissionDue = affiliates.reduce((s, a) => s + a.pendingCommission, 0);
  const totalSales = affiliates.reduce((s, a) => s + a.sales, 0);

  const [payingId, setPayingId] = useState<string | null>(null);

  const act = async (affiliateId: string, status: AdminAffiliateRow['status']) => {
    setBusyId(affiliateId);
    const res = await setAffiliateStatus({ affiliateId, status });
    setBusyId(null);
    if (res.ok) router.refresh();
    else alert(res.error.message);
  };

  const pay = async (id: string) => {
    if (!confirm('¿Confirmás que ya pagaste este retiro por fuera (transferencia/Wise/etc.)?')) return;
    setPayingId(id);
    const res = await markWithdrawalPaid({ withdrawalId: id });
    setPayingId(null);
    if (res.ok) router.refresh();
    else alert(res.error.message);
  };

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard no disponible */
    }
  };

  const rows = affiliates.filter((a) => {
    if (filter !== 'all' && a.status !== filter) return false;
    if (q.trim()) {
      const s = q.toLowerCase();
      return a.name.toLowerCase().includes(s) || a.email.toLowerCase().includes(s) || (a.couponCode ?? '').toLowerCase().includes(s);
    }
    return true;
  });

  const refOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="space-y-4">
      {/* Encabezado: crear afiliado directo */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-zinc-900 dark:text-white">Afiliados</h2>
        <CreateUserDialog defaultRole="affiliate" lockRole triggerLabel="Nuevo afiliado" title="Crear afiliado" />
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Summary icon={<Users className="h-4 w-4" />} label="Activos" value={String(activeCount)} sub={pendingApproval ? `${pendingApproval} por aprobar` : undefined} />
        <Summary icon={<DollarSign className="h-4 w-4" />} label="Comisión por pagar" value={usd(totalCommissionDue)} />
        <Summary icon={<Banknote className="h-4 w-4" />} label="Retiros pendientes" value={String(withdrawals.length)} accent={withdrawals.length > 0} />
        <Summary icon={<Ticket className="h-4 w-4" />} label="Ventas referidas" value={String(totalSales)} />
      </div>

      {/* Retiros pendientes de pago */}
      {withdrawals.length > 0 && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-400/20 bg-amber-50/60 dark:bg-amber-400/[0.06] p-4">
          <h3 className="font-bold text-sm text-amber-900 dark:text-amber-200 mb-2 flex items-center gap-1.5">
            <Banknote className="h-4 w-4" /> Retiros para pagar (por fuera)
          </h3>
          <div className="space-y-1.5">
            {withdrawals.map((w) => (
              <div key={w.id} className="flex items-center justify-between gap-3 rounded-xl bg-white dark:bg-zinc-900 border border-amber-100 dark:border-white/10 px-3 py-2">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-zinc-900 dark:text-white truncate">{w.affiliateName} <span className="font-normal text-zinc-400">· {w.affiliateEmail}</span></div>
                  <div className="text-[11px] text-zinc-400">{w.requestedAt ? new Date(w.requestedAt).toLocaleDateString() : ''}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-black text-zinc-900 dark:text-white">{usd(w.amount)}</span>
                  <button onClick={() => pay(w.id)} disabled={payingId === w.id} className="inline-flex items-center gap-1 rounded-lg bg-[#9933c1] hover:bg-[#7100a5] text-white px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 cursor-pointer">
                    {payingId === w.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Marcar pagado
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, email o cupón"
            className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1]/30"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="px-3 py-2 text-sm bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white"
        >
          <option value="all">Todos</option>
          <option value="pending">Pendientes</option>
          <option value="approved">Activos</option>
          <option value="suspended">Suspendidos</option>
          <option value="rejected">Rechazados</option>
        </select>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[860px]">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/30">
                {['Afiliado', 'Canal', 'Ventas', 'Comisión disp.', 'Pagada', 'Link / Cupón', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
              {rows.length === 0 && (
                <tr><td colSpan={8} className="py-10 text-center text-sm text-zinc-400">No hay afiliados que coincidan.</td></tr>
              )}
              {rows.map((a) => {
                const st = STATUS[a.status];
                const refUrl = a.referralLink ? `${refOrigin}/?aff=${a.referralLink}` : null;
                return (
                  <tr key={a.id} className="hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors align-top">
                    <td className="py-3 px-4">
                      <div className="text-sm font-bold text-zinc-900 dark:text-white">{a.name}</div>
                      <div className="text-[11px] text-zinc-400">{a.email}</div>
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-600 dark:text-zinc-300">
                      {a.channel ?? '—'}
                      {a.audience ? <div className="text-[11px] text-zinc-400">{a.audience.toLocaleString()} audiencia</div> : null}
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-700 dark:text-zinc-200">{a.sales}</td>
                    <td className="py-3 px-4 text-sm font-bold text-zinc-900 dark:text-white">{usd(a.pendingCommission)}</td>
                    <td className="py-3 px-4 text-sm text-zinc-500">{usd(a.paidCommission)}</td>
                    <td className="py-3 px-4">
                      {a.referralLink ? (
                        editId === a.id ? (
                          <div className="space-y-1.5 min-w-[180px]">
                            <input value={editCode} onChange={(e) => setEditCode(e.target.value)} placeholder="CÓDIGO"
                              className="w-full px-2 py-1 text-[11px] font-mono uppercase bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-md text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#9933c1]" />
                            <div className="flex items-center gap-1.5">
                              <input type="number" min="0" max="100" value={editDisc} onChange={(e) => setEditDisc(e.target.value)}
                                className="w-16 px-2 py-1 text-[11px] bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-md text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#9933c1]" />
                              <span className="text-[11px] text-zinc-400">% desc.</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => saveCoupon(a.id)} disabled={savingCoupon} className="inline-flex items-center gap-1 rounded-md bg-[#9933c1] hover:bg-[#7100a5] text-white px-2 py-1 text-[11px] font-bold disabled:opacity-50 cursor-pointer">
                                {savingCoupon ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Guardar
                              </button>
                              <button onClick={() => setEditId(null)} className="rounded-md border border-zinc-200 dark:border-white/10 px-2 py-1 text-[11px] font-bold text-zinc-500 cursor-pointer">Cancelar</button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <button onClick={() => refUrl && copy(refUrl, `l${a.id}`)} className="flex items-center gap-1 text-[11px] font-bold text-[#9933c1] dark:text-[#b3ff6b] hover:underline cursor-pointer">
                              <Link2 className="h-3 w-3" /> {copied === `l${a.id}` ? 'Copiado ✓' : 'Link'}
                            </button>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => a.couponCode && copy(a.couponCode, `c${a.id}`)} className="flex items-center gap-1 text-[11px] font-mono text-zinc-600 dark:text-zinc-300 hover:underline cursor-pointer">
                                <Ticket className="h-3 w-3" /> {copied === `c${a.id}` ? 'Copiado ✓' : a.couponCode}
                              </button>
                              {a.couponDiscountPct !== null && <span className="text-[10px] font-bold text-zinc-400">{a.couponDiscountPct}%</span>}
                              <button onClick={() => startEdit(a)} title="Editar cupón" className="text-zinc-400 hover:text-[#9933c1] cursor-pointer"><Pencil className="h-3 w-3" /></button>
                            </div>
                          </div>
                        )
                      ) : (
                        <span className="text-[11px] text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {a.status === 'pending' && (
                          <>
                            <ActionBtn busy={busyId === a.id} onClick={() => act(a.id, 'approved')} icon={<Check className="h-3.5 w-3.5" />} label="Aprobar" tone="green" />
                            <ActionBtn busy={busyId === a.id} onClick={() => act(a.id, 'rejected')} icon={<X className="h-3.5 w-3.5" />} label="Rechazar" tone="red" />
                          </>
                        )}
                        {a.status === 'approved' && (
                          <ActionBtn busy={busyId === a.id} onClick={() => act(a.id, 'suspended')} icon={<Pause className="h-3.5 w-3.5" />} label="Suspender" tone="zinc" />
                        )}
                        {(a.status === 'suspended' || a.status === 'rejected') && (
                          <ActionBtn busy={busyId === a.id} onClick={() => act(a.id, 'approved')} icon={<Play className="h-3.5 w-3.5" />} label={a.status === 'rejected' ? 'Aprobar' : 'Reactivar'} tone="green" />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Summary({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? 'border-amber-300 bg-amber-50 dark:bg-amber-400/10 dark:border-amber-400/30' : 'border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900'}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-400">{icon} {label}</div>
      <div className="text-2xl font-black text-zinc-900 dark:text-white mt-1">{value}</div>
      {sub ? <div className="text-[11px] text-amber-600 dark:text-amber-400 font-bold mt-0.5">{sub}</div> : null}
    </div>
  );
}

function ActionBtn({ busy, onClick, icon, label, tone }: { busy: boolean; onClick: () => void; icon: React.ReactNode; label: string; tone: 'green' | 'red' | 'zinc' }) {
  const cls =
    tone === 'green'
      ? 'text-green-700 dark:text-[#b3ff6b] border-green-200 dark:border-[#b3ff6b]/30 hover:bg-green-50 dark:hover:bg-[#b3ff6b]/10'
      : tone === 'red'
        ? 'text-red-600 border-red-200 dark:border-red-400/30 hover:bg-red-50 dark:hover:bg-red-400/10'
        : 'text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/5';
  return (
    <button onClick={onClick} disabled={busy} className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition disabled:opacity-50 cursor-pointer ${cls}`}>
      {icon} {label}
    </button>
  );
}
