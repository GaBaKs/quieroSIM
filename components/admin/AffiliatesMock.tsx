'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, X, Link as LinkIcon, Ticket, ArrowUpRight, TrendingUp, DollarSign, Search, List, LayoutGrid, Plus } from 'lucide-react';
import { usd, shortDate, dateTime } from './format';

interface AffiliateMock {
  id: string;
  name: string;
  email: string;
  channel: string;
  audience: number;
  status: 'pending' | 'active' | 'suspended';
  sales: number;
  pendingCommission: number;
  paidCommission: number;
  level: 1 | 2;
  refLink: string;
  couponCode: string;
  createdAt: string;
}

const initialMockAffiliates: AffiliateMock[] = [
  { id: 'aff_01', name: 'Viajes con Ana', email: 'ana@viajes.com', channel: 'Instagram (@viajes_ana)', audience: 125000, status: 'active', sales: 142, pendingCommission: 450.50, paidCommission: 2100.00, level: 2, refLink: 'https://quierosim.com/ref/ana', couponCode: 'ANA10', createdAt: '2025-01-15T10:00:00Z' },
  { id: 'aff_02', name: 'Nomad Tech', email: 'contact@nomadtech.io', channel: 'YouTube (NomadTech)', audience: 350000, status: 'active', sales: 85, pendingCommission: 125.00, paidCommission: 850.00, level: 1, refLink: 'https://quierosim.com/ref/nomadtech', couponCode: 'NOMAD', createdAt: '2025-02-10T14:30:00Z' },
  { id: 'aff_03', name: 'Trotamundos CL', email: 'hola@trotamundos.cl', channel: 'TikTok (@trotamundos.cl)', audience: 45000, status: 'pending', sales: 0, pendingCommission: 0, paidCommission: 0, level: 1, refLink: '—', couponCode: '—', createdAt: '2025-03-01T09:15:00Z' },
  { id: 'aff_04', name: 'Travel Deals AR', email: 'info@traveldeals.com.ar', channel: 'X / Twitter (@traveldeals_ar)', audience: 12000, status: 'suspended', sales: 4, pendingCommission: 0, paidCommission: 45.00, level: 1, refLink: 'https://quierosim.com/ref/tdar', couponCode: 'TDAR5', createdAt: '2024-11-20T16:45:00Z' },
];

const mockSales = [
  { id: 'ord_9182', date: '2025-03-01T10:20:00Z', plan: 'USA 10GB 30D', amount: 25.00, commission: 5.00, status: 'paid' },
  { id: 'ord_9183', date: '2025-03-02T15:45:00Z', plan: 'Europa 5GB 15D', amount: 15.00, commission: 3.00, status: 'pending' },
  { id: 'ord_9184', date: '2025-03-03T09:10:00Z', plan: 'Global 20GB 30D', amount: 45.00, commission: 9.00, status: 'pending' },
];

function AffiliateBadge({ status }: { status: AffiliateMock['status'] }) {
  if (status === 'active') return <span className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide bg-[#b3ff6b]/30 text-green-900 dark:bg-[#b3ff6b]/20 dark:text-[#b3ff6b]">Activo</span>;
  if (status === 'suspended') return <span className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide bg-red-50 text-red-600 dark:bg-red-400/15 dark:text-red-300">Suspendido</span>;
  return <span className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300">Pendiente</span>;
}

export default function AffiliatesMock({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [affiliates, setAffiliates] = useState<AffiliateMock[]>(initialMockAffiliates);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AffiliateMock | null>(null);
  const [isEditingNew, setIsEditingNew] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      setViewMode('grid');
    }
  }, []);

  const filtered = affiliates.filter((a) => {
    if (filter !== 'all' && a.status !== filter) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleAction = (action: string) => {
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      alert(`Acción simulada: ${action}`);
    }, 600);
  };

  return (
    <>
      {/* Tools */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button
          onClick={() => setIsEditingNew(true)}
          className="flex items-center gap-1.5 rounded-xl bg-[#9933c1] hover:bg-[#7100a5] px-4 py-2 text-sm font-bold text-white transition cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" /> Nuevo afiliado
        </button>

        <div className="flex flex-1 items-center gap-3 w-full">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 py-2 pl-9 pr-4 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1]"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1]"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="pending">Pendientes</option>
            <option value="suspended">Suspendidos</option>
          </select>
        </div>

        <div className="flex bg-zinc-100 dark:bg-black/30 rounded-xl p-1 shrink-0 border border-zinc-200 dark:border-white/10 ml-auto sm:ml-0">
          <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-white dark:bg-zinc-800 shadow-sm text-[#9933c1] dark:text-[#b3ff6b]' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}>
            <List className="h-4 w-4" />
          </button>
          <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-white dark:bg-zinc-800 shadow-sm text-[#9933c1] dark:text-[#b3ff6b]' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}>
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <p className="text-sm text-zinc-400 py-10 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10">
          No hay afiliados que coincidan con la búsqueda.
        </p>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 overflow-hidden">
          {viewMode === 'list' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/30">
                    <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Afiliado</th>
                    <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Canal</th>
                    <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Audiencia</th>
                    <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Ventas</th>
                    <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Comisión Pend.</th>
                    <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Comisión Pag.</th>
                    <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                  {filtered.map((a) => (
                    <tr key={a.id} onClick={() => setSelected(a)} className="hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors cursor-pointer">
                      <td className="py-3 px-4">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                          {a.name}
                          {a.level === 2 && <span className="bg-[#9933c1] text-white text-[9px] px-1.5 py-0.5 rounded-md uppercase font-black">Niv.2</span>}
                        </div>
                        <div className="text-xs text-zinc-500">{a.email}</div>
                      </td>
                      <td className="py-3 px-4 text-sm text-zinc-700 dark:text-zinc-300">{a.channel}</td>
                      <td className="py-3 px-4 text-sm text-zinc-700 dark:text-zinc-300">{new Intl.NumberFormat('es-AR').format(a.audience)}</td>
                      <td className="py-3 px-4 text-sm text-zinc-700 dark:text-zinc-300">{a.sales}</td>
                      <td className="py-3 px-4 text-sm font-bold text-amber-600 dark:text-amber-400">{usd(a.pendingCommission)}</td>
                      <td className="py-3 px-4 text-sm font-bold text-green-700 dark:text-[#b3ff6b]">{usd(a.paidCommission)}</td>
                      <td className="py-3 px-4"><AffiliateBadge status={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((a) => (
                <div key={a.id} onClick={() => setSelected(a)} className="border border-zinc-200 dark:border-white/10 rounded-xl p-5 flex flex-col gap-3 bg-zinc-50 dark:bg-black/20 hover:border-[#9933c1]/30 hover:bg-zinc-100 dark:hover:bg-white/5 transition-all cursor-pointer shadow-sm hover:shadow-md">
                  <div className="flex justify-between items-start gap-2">
                    <AffiliateBadge status={a.status} />
                    {a.level === 2 && <span className="bg-[#9933c1] text-white text-[9px] px-1.5 py-0.5 rounded-md uppercase font-black">Niv. 2</span>}
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">{a.name}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5 truncate">{a.channel}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm border-t border-zinc-200 dark:border-white/10 pt-3 mt-auto">
                    <div>
                      <span className="block text-[10px] uppercase text-zinc-400 font-bold">Ventas</span>
                      <span className="font-bold text-zinc-900 dark:text-white">{a.sales}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase text-zinc-400 font-bold">Por Pagar</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">{usd(a.pendingCommission)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Detail */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => !busy && setSelected(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => !busy && setSelected(null)} className="absolute right-4 top-4 rounded-full p-1.5 text-zinc-400 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition">
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 mb-6 pr-8">
                <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">{selected.name}</h2>
                <AffiliateBadge status={selected.status} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Info Panel */}
                <div className="space-y-4">
                  <div className="bg-zinc-50 dark:bg-black/30 rounded-xl p-4 border border-zinc-200 dark:border-white/10">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">Información del Perfil</h3>
                    <dl className="space-y-2 text-sm">
                      <div><dt className="text-zinc-500 inline">Email: </dt><dd className="inline font-bold text-zinc-900 dark:text-zinc-100">{selected.email}</dd></div>
                      <div><dt className="text-zinc-500 inline">Canal: </dt><dd className="inline font-bold text-zinc-900 dark:text-zinc-100">{selected.channel}</dd></div>
                      <div><dt className="text-zinc-500 inline">Audiencia: </dt><dd className="inline font-bold text-zinc-900 dark:text-zinc-100">{new Intl.NumberFormat('es-AR').format(selected.audience)}</dd></div>
                      <div><dt className="text-zinc-500 inline">Solicitud: </dt><dd className="inline font-bold text-zinc-900 dark:text-zinc-100">{shortDate(selected.createdAt)}</dd></div>
                      <div><dt className="text-zinc-500 inline">Nivel asignado: </dt><dd className="inline font-bold text-zinc-900 dark:text-zinc-100">Nivel {selected.level}</dd></div>
                    </dl>
                  </div>
                  
                  {/* Links Panel */}
                  <div className="bg-zinc-50 dark:bg-black/30 rounded-xl p-4 border border-zinc-200 dark:border-white/10">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">Recursos Compartidos</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <LinkIcon className="h-4 w-4 text-[#9933c1] dark:text-[#b3ff6b]" />
                        <span className="text-sm font-mono text-zinc-900 dark:text-zinc-100">{selected.refLink}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-[#9933c1] dark:text-[#b3ff6b]" />
                        <span className="text-sm font-mono text-zinc-900 dark:text-zinc-100">{selected.couponCode}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Metrics Panel */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-50 dark:bg-black/30 rounded-xl p-4 border border-zinc-200 dark:border-white/10">
                      <div className="flex items-center gap-2 text-zinc-500 mb-1">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase">Ventas Ref.</span>
                      </div>
                      <span className="text-2xl font-black text-zinc-900 dark:text-white">{selected.sales}</span>
                    </div>
                    <div className="bg-zinc-50 dark:bg-black/30 rounded-xl p-4 border border-zinc-200 dark:border-white/10">
                      <div className="flex items-center gap-2 text-amber-500 mb-1">
                        <DollarSign className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase">Por Pagar</span>
                      </div>
                      <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{usd(selected.pendingCommission)}</span>
                    </div>
                  </div>

                  <div className="bg-zinc-50 dark:bg-black/30 rounded-xl p-4 border border-zinc-200 dark:border-white/10 h-full">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">Últimas Ventas Referidas (Mock)</h3>
                    {selected.status === 'pending' || selected.sales === 0 ? (
                      <p className="text-sm text-zinc-400 italic">No hay ventas registradas aún.</p>
                    ) : (
                      <ul className="space-y-3">
                        {mockSales.map(s => (
                          <li key={s.id} className="flex justify-between items-center text-sm border-b border-zinc-200 dark:border-white/5 pb-2 last:border-0 last:pb-0">
                            <div>
                              <div className="font-bold text-zinc-900 dark:text-zinc-100">{s.plan}</div>
                              <div className="text-xs text-zinc-500">{shortDate(s.date)} · #{s.id.split('_')[1]}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-[#9933c1] dark:text-[#b3ff6b]">+{usd(s.commission)}</div>
                              <div className="text-[10px] uppercase font-bold text-zinc-400">{s.status === 'paid' ? 'Pagada' : 'Acumulada'}</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-white/10">
                {selected.status === 'pending' && (
                  <button onClick={() => handleAction('Aprobar Afiliado')} disabled={busy} className="flex items-center gap-1.5 rounded-xl bg-[#9933c1] hover:bg-[#7100a5] px-4 py-2 text-sm font-bold text-white transition disabled:opacity-50 cursor-pointer">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aprobar Solicitud'}
                  </button>
                )}
                {selected.status === 'active' && (
                  <>
                    <button onClick={() => handleAction('Marcar comisión como pagada')} disabled={busy || selected.pendingCommission === 0} className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-amber-950 px-4 py-2 text-sm font-bold transition disabled:opacity-50 cursor-pointer">
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Liquidar Comisión'}
                    </button>
                    <button onClick={() => handleAction('Suspender Afiliado')} disabled={busy} className="flex items-center gap-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10 px-4 py-2 text-sm font-bold transition disabled:opacity-50 cursor-pointer">
                      Suspender
                    </button>
                  </>
                )}
                {selected.status === 'suspended' && (
                  <button onClick={() => handleAction('Reactivar Afiliado')} disabled={busy} className="flex items-center gap-1.5 rounded-xl border border-[#b3ff6b]/50 text-green-700 hover:bg-[#b3ff6b]/10 dark:text-[#b3ff6b] dark:hover:bg-[#b3ff6b]/20 px-4 py-2 text-sm font-bold transition disabled:opacity-50 cursor-pointer">
                    Reactivar
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Editor Modal para Nuevo Afiliado */}
      <AnimatePresence>
        {isEditingNew && (
          <AffiliateEditor
            onClose={() => setIsEditingNew(false)}
            onSaved={(newAff) => {
              setAffiliates([newAff, ...affiliates]);
              setIsEditingNew(false);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function AffiliateEditor({ onClose, onSaved }: { onClose: () => void; onSaved: (a: AffiliateMock) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [channel, setChannel] = useState('');
  const [audience, setAudience] = useState('');
  const [busy, setBusy] = useState(false);

  const save = () => {
    if (!name || !email) return;
    setBusy(true);
    setTimeout(() => {
      onSaved({
        id: `aff_${Math.random().toString(36).substr(2, 9)}`,
        name,
        email,
        channel: channel || 'No especificado',
        audience: parseInt(audience) || 0,
        status: 'pending', // Siempre entra pendiente de aprobación
        sales: 0,
        pendingCommission: 0,
        paidCommission: 0,
        level: 1,
        refLink: '—',
        couponCode: '—',
        createdAt: new Date().toISOString(),
      });
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => !busy && onClose()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
        className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={() => !busy && onClose()} className="absolute right-4 top-4 rounded-full p-1.5 text-zinc-400 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition">
          <X className="h-5 w-5" />
        </button>
        <h3 className="font-bold text-lg text-zinc-900 dark:text-white pr-6 mb-5">Invitar Afiliado</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 mb-1.5">Nombre completo o Marca</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Viajes con Ana"
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/50 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1]" />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 mb-1.5">Email de contacto</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ana@ejemplo.com"
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/50 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1.5">Canal principal (opc.)</label>
              <input value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="Instagram, YouTube..."
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/50 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1]" />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1.5">Audiencia (opc.)</label>
              <input type="number" min="0" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="10000"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/50 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1]" />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-white/10">
          <button onClick={() => !busy && onClose()} disabled={busy} className="rounded-xl px-4 py-2 text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 transition disabled:opacity-50 cursor-pointer">Cancelar</button>
          <button onClick={save} disabled={busy || !name || !email} className="flex items-center gap-2 rounded-xl bg-[#9933c1] hover:bg-[#7100a5] px-4 py-2 text-sm font-black text-white transition disabled:opacity-60 cursor-pointer">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
