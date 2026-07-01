'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Check, Pause, Play, Building2, Users, Pencil, Loader2, X } from 'lucide-react';
import {
  setAgencyStatus, updateAgencyMargin, createAgency, type AdminAgencyRow,
} from '@/server/actions/admin-wholesale';

const STATUS: Record<AdminAgencyRow['status'], { label: string; cls: string }> = {
  pending: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300' },
  approved: { label: 'Aprobada', cls: 'bg-[#b3ff6b]/30 text-green-900 dark:bg-[#b3ff6b]/20 dark:text-[#b3ff6b]' },
  suspended: { label: 'Suspendida', cls: 'bg-zinc-200 text-zinc-600 dark:bg-white/10 dark:text-zinc-300' },
};

export default function AgenciesView({ agencies }: { agencies: AdminAgencyRow[] }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | AdminAgencyRow['status']>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Edición de margen
  const [editId, setEditId] = useState<string | null>(null);
  const [editMargin, setEditMargin] = useState('');
  const [savingMargin, setSavingMargin] = useState(false);

  const act = async (agencyId: string, status: AdminAgencyRow['status']) => {
    setBusyId(agencyId);
    const res = await setAgencyStatus({ agencyId, status });
    setBusyId(null);
    if (res.ok) router.refresh();
    else alert(res.error.message);
  };

  const saveMargin = async (agencyId: string) => {
    setSavingMargin(true);
    const m = editMargin.trim() === '' ? null : Number(editMargin);
    const res = await updateAgencyMargin({ agencyId, margin: m });
    setSavingMargin(false);
    if (res.ok) { setEditId(null); router.refresh(); }
    else alert(res.error.message);
  };

  const activeCount = agencies.filter((a) => a.status === 'approved').length;
  const pendingCount = agencies.filter((a) => a.status === 'pending').length;

  const rows = agencies.filter((a) => {
    if (filter !== 'all' && a.status !== filter) return false;
    if (q.trim()) {
      const s = q.toLowerCase();
      return a.companyName.toLowerCase().includes(s) || a.email.toLowerCase().includes(s) || (a.taxId ?? '').toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-zinc-900 dark:text-white">Agencias</h2>
        <button onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#9933c1] hover:bg-[#7100a5] text-white px-4 py-2 text-sm font-bold cursor-pointer">
          <Building2 className="h-4 w-4" /> Nueva agencia
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Summary icon={<Building2 className="h-4 w-4" />} label="Aprobadas" value={String(activeCount)} sub={pendingCount ? `${pendingCount} por aprobar` : undefined} />
        <Summary icon={<Users className="h-4 w-4" />} label="Total agencias" value={String(agencies.length)} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por empresa, email o CUIT/tax id"
            className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1]/30" />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="px-3 py-2 text-sm bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white">
          <option value="all">Todas</option>
          <option value="pending">Pendientes</option>
          <option value="approved">Aprobadas</option>
          <option value="suspended">Suspendidas</option>
        </select>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[760px]">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/30">
                {['Empresa', 'CUIT / Tax ID', 'Margen propio', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
              {rows.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-sm text-zinc-400">No hay agencias que coincidan.</td></tr>}
              {rows.map((a) => {
                const st = STATUS[a.status];
                return (
                  <tr key={a.id} className="hover:bg-zinc-50 dark:hover:bg-white/5 align-top">
                    <td className="py-3 px-4">
                      <div className="text-sm font-bold text-zinc-900 dark:text-white">{a.companyName}</div>
                      <div className="text-[11px] text-zinc-400">{a.name ? `${a.name} · ` : ''}{a.email}</div>
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-600 dark:text-zinc-300">{a.taxId ?? '—'}</td>
                    <td className="py-3 px-4">
                      {editId === a.id ? (
                        <div className="flex items-center gap-1.5">
                          <input type="number" min="0" max="1000" value={editMargin} onChange={(e) => setEditMargin(e.target.value)} placeholder="global"
                            className="w-20 px-2 py-1 text-xs bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-md dark:text-white focus:outline-none focus:ring-1 focus:ring-[#9933c1]" />
                          <button onClick={() => saveMargin(a.id)} disabled={savingMargin} className="rounded-md bg-[#9933c1] text-white px-2 py-1 text-[11px] font-bold cursor-pointer disabled:opacity-50">{savingMargin ? '…' : '✓'}</button>
                          <button onClick={() => setEditId(null)} className="text-[11px] text-zinc-400 cursor-pointer">✕</button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditId(a.id); setEditMargin(a.customMarginPct === null ? '' : String(a.customMarginPct)); }}
                          className="inline-flex items-center gap-1 text-sm text-zinc-700 dark:text-zinc-200 hover:text-[#9933c1] cursor-pointer">
                          {a.customMarginPct === null ? <span className="text-zinc-400">global</span> : `${a.customMarginPct}%`} <Pencil className="h-3 w-3 text-zinc-400" />
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4"><span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${st.cls}`}>{st.label}</span></td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {a.status === 'pending' && <ActionBtn busy={busyId === a.id} onClick={() => act(a.id, 'approved')} icon={<Check className="h-3.5 w-3.5" />} label="Aprobar" tone="green" />}
                        {a.status === 'approved' && <ActionBtn busy={busyId === a.id} onClick={() => act(a.id, 'suspended')} icon={<Pause className="h-3.5 w-3.5" />} label="Suspender" tone="zinc" />}
                        {a.status === 'suspended' && <ActionBtn busy={busyId === a.id} onClick={() => act(a.id, 'approved')} icon={<Play className="h-3.5 w-3.5" />} label="Reactivar" tone="green" />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <CreateAgencyModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); router.refresh(); }} />
    </div>
  );
}

function Summary({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-4">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-400">{icon} {label}</div>
      <div className="text-2xl font-black text-zinc-900 dark:text-white mt-1">{value}</div>
      {sub ? <div className="text-[11px] text-amber-600 dark:text-amber-400 font-bold mt-0.5">{sub}</div> : null}
    </div>
  );
}

function ActionBtn({ busy, onClick, icon, label, tone }: { busy: boolean; onClick: () => void; icon: React.ReactNode; label: string; tone: 'green' | 'zinc' }) {
  const cls = tone === 'green'
    ? 'text-green-700 dark:text-[#b3ff6b] border-green-200 dark:border-[#b3ff6b]/30 hover:bg-green-50 dark:hover:bg-[#b3ff6b]/10'
    : 'text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/5';
  return (
    <button onClick={onClick} disabled={busy} className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition disabled:opacity-50 cursor-pointer ${cls}`}>
      {icon} {label}
    </button>
  );
}

function CreateAgencyModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [margin, setMargin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true); setError(null);
    const res = await createAgency({
      email: email.trim(), password, companyName: companyName.trim(),
      taxId: taxId.trim() || undefined, margin: margin.trim() ? Number(margin) : undefined,
    });
    setBusy(false);
    if (res.ok) { setEmail(''); setPassword(''); setCompanyName(''); setTaxId(''); setMargin(''); onCreated(); }
    else setError(res.error.message);
  };

  const inputCls = 'w-full px-3 py-2 text-sm bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-xl dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1]/30';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !busy && onClose()} />
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="relative w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 p-6">
            <button onClick={() => !busy && onClose()} className="absolute right-3 top-3 text-zinc-400 cursor-pointer"><X className="h-5 w-5" /></button>
            <h3 className="font-black text-lg text-zinc-900 dark:text-white mb-1">Crear agencia</h3>
            <p className="text-xs text-zinc-400 mb-4">Crea la cuenta y la deja aprobada, lista para comprar.</p>
            <div className="space-y-3">
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Nombre de la empresa" className={inputCls} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email de acceso" className={inputCls} />
              <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña (mín. 8 · may+min+número)" className={inputCls} />
              <div className="flex gap-3">
                <input value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="CUIT / Tax ID (opcional)" className={inputCls} />
                <input type="number" min="0" max="1000" value={margin} onChange={(e) => setMargin(e.target.value)} placeholder="Margen %" className="w-28 px-3 py-2 text-sm bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-xl dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1]/30" />
              </div>
            </div>
            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
            <button onClick={submit} disabled={busy || companyName.trim().length < 2 || password.length < 8} className="mt-5 w-full rounded-xl bg-[#9933c1] hover:bg-[#7100a5] text-white font-bold py-2.5 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />} Crear agencia
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
