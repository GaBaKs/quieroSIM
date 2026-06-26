'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Check, Pause, Play, X, Copy, Link2, Ticket } from 'lucide-react';
import { setAffiliateStatus, type AdminAffiliateRow } from '@/server/actions/admin-affiliates';

const usd = (n: number) => `$${n.toFixed(2)}`;

const STATUS: Record<AdminAffiliateRow['status'], { label: string; cls: string }> = {
  pending: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300' },
  approved: { label: 'Activo', cls: 'bg-[#b3ff6b]/30 text-green-900 dark:bg-[#b3ff6b]/20 dark:text-[#b3ff6b]' },
  suspended: { label: 'Suspendido', cls: 'bg-zinc-200 text-zinc-600 dark:bg-white/10 dark:text-zinc-300' },
  rejected: { label: 'Rechazado', cls: 'bg-red-50 text-red-600 dark:bg-red-400/15 dark:text-red-300' },
};

export default function AffiliatesView({ affiliates }: { affiliates: AdminAffiliateRow[] }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | AdminAffiliateRow['status']>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const act = async (affiliateId: string, status: AdminAffiliateRow['status']) => {
    setBusyId(affiliateId);
    const res = await setAffiliateStatus({ affiliateId, status });
    setBusyId(null);
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
                        <div className="space-y-1">
                          <button onClick={() => refUrl && copy(refUrl, `l${a.id}`)} className="flex items-center gap-1 text-[11px] font-bold text-[#9933c1] dark:text-[#b3ff6b] hover:underline cursor-pointer">
                            <Link2 className="h-3 w-3" /> {copied === `l${a.id}` ? 'Copiado ✓' : 'Link'}
                          </button>
                          <button onClick={() => a.couponCode && copy(a.couponCode, `c${a.id}`)} className="flex items-center gap-1 text-[11px] font-mono text-zinc-600 dark:text-zinc-300 hover:underline cursor-pointer">
                            <Ticket className="h-3 w-3" /> {copied === `c${a.id}` ? 'Copiado ✓' : a.couponCode}
                          </button>
                        </div>
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
