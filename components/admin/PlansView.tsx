'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Pencil, RotateCcw, Star, X, LayoutGrid, List } from 'lucide-react';
import { usd } from './format';
import { updatePlanPricing, setPlanStatus, setPlanRecommended, clearFixedPrice, type AdminPlanRow } from '@/server/actions/admin-plans';

export default function PlansView({ plans, isSuperAdmin, eurUsdRate, roundPsychological }: { plans: AdminPlanRow[]; isSuperAdmin: boolean; eurUsdRate: number; roundPsychological: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<AdminPlanRow | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [recId, setRecId] = useState<string | null>(null);
  const [clearId, setClearId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [onlyRec, setOnlyRec] = useState(false);
  const [onlyFixed, setOnlyFixed] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      setViewMode('grid');
    }
  }, []);

  // Nombre del país en español por ISO (el catálogo de YeSim viene en inglés),
  // para poder buscar "estados unidos" y que matchee "United States".
  const esNameByIso = useMemo(() => {
    const dn = new Intl.DisplayNames(['es'], { type: 'region' });
    const m: Record<string, string> = {};
    for (const p of plans) {
      const iso = p.isoCountry;
      if (iso && !iso.includes(',') && iso.length === 2 && !m[iso]) {
        try { m[iso] = dn.of(iso) ?? ''; } catch { /* iso desconocido */ }
      }
    }
    return m;
  }, [plans]);

  // Nombre del plan con el país en español ("United States 5GB" → "Estados Unidos 5GB").
  const displayName = (p: AdminPlanRow) => {
    const es = p.isoCountry ? esNameByIso[p.isoCountry] : undefined;
    if (es && p.countryRegion && p.name.startsWith(p.countryRegion)) {
      return es + p.name.slice(p.countryRegion.length);
    }
    return p.name;
  };

  // País para el subtítulo. Los packs regionales traen la lista completa de
  // países (muy larga, rompe la fila) → mostramos "N países" en su lugar.
  const countryLabel = (p: AdminPlanRow) => {
    if (p.isoCountry && esNameByIso[p.isoCountry]) return esNameByIso[p.isoCountry];
    if (p.countryRegion && p.countryRegion.includes(',')) return `${p.countryRegion.split(',').length} países`;
    return p.countryRegion || '—';
  };

  // GB, o "Ilimitado" cuando el data no es numérico (planes unlim).
  const dataLabel = (p: AdminPlanRow) => {
    const n = Number(p.dataAmount);
    return p.dataAmount && !Number.isNaN(n) ? `${n} GB` : 'Ilimitado';
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return plans.filter((p) => {
      if (onlyRec && !p.isRecommended) return false;
      if (onlyFixed && !p.useFixedPrice && !p.useCustomMargin) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.countryRegion ?? '').toLowerCase().includes(q) ||
        (p.isoCountry ?? '').toLowerCase().includes(q) ||
        (p.isoCountry && esNameByIso[p.isoCountry]?.toLowerCase().includes(q)) ||
        false
      );
    });
  }, [plans, query, onlyRec, onlyFixed, esNameByIso]);
  const CAP = 200;
  const shown = filtered.slice(0, CAP);

  const toggleStatus = async (plan: AdminPlanRow) => {
    setTogglingId(plan.id);
    const next = plan.status === 'active' ? 'inactive' : 'active';
    await setPlanStatus({ planId: plan.id, status: next });
    setTogglingId(null);
    router.refresh();
  };

  const toggleRecommended = async (plan: AdminPlanRow) => {
    setRecId(plan.id);
    await setPlanRecommended({ planId: plan.id, value: !plan.isRecommended });
    setRecId(null);
    router.refresh();
  };

  const clearAuto = async (plan: AdminPlanRow) => {
    setClearId(plan.id);
    await clearFixedPrice({ planId: plan.id });
    setClearId(null);
    router.refresh();
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por país o nombre del plan…"
          className="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#9933c1]"
        />
        <label className="flex items-center gap-2 text-sm font-bold text-zinc-600 dark:text-zinc-300 cursor-pointer select-none whitespace-nowrap">
          <input type="checkbox" checked={onlyRec} onChange={(e) => setOnlyRec(e.target.checked)} className="h-4 w-4 rounded accent-[#9933c1]" />
          Solo recomendados
        </label>
        <label className="flex items-center gap-2 text-sm font-bold text-zinc-600 dark:text-zinc-300 cursor-pointer select-none whitespace-nowrap">
          <input type="checkbox" checked={onlyFixed} onChange={(e) => setOnlyFixed(e.target.checked)} className="h-4 w-4 rounded accent-amber-500" />
          Solo modificados
        </label>
        
        <div className="flex bg-zinc-100 dark:bg-black/30 rounded-xl p-1 ml-auto shrink-0 border border-zinc-200 dark:border-white/10">
          <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-white dark:bg-zinc-800 shadow-sm text-[#9933c1] dark:text-[#b3ff6b]' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}>
            <List className="h-4 w-4" />
          </button>
          <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-white dark:bg-zinc-800 shadow-sm text-[#9933c1] dark:text-[#b3ff6b]' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}>
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>

        <span className="text-xs text-zinc-400 whitespace-nowrap hidden sm:inline-block">{filtered.length} de {plans.length}</span>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 overflow-hidden">
        {viewMode === 'list' ? (
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
              {shown.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      {p.isRecommended && <Star className="h-3.5 w-3.5 fill-[#9933c1] text-[#9933c1] shrink-0" />}
                      {displayName(p)}
                    </div>
                    <div className="text-xs text-zinc-400 truncate max-w-[220px] sm:max-w-[320px]">{countryLabel(p)} · {dataLabel(p)} · {p.durationDays ?? '—'}d</div>
                  </td>
                  <td className="py-3 px-4 text-sm text-zinc-600 dark:text-zinc-300">{p.costEur !== null ? `€${p.costEur}` : '—'}</td>
                  <td className="py-3 px-4 text-sm text-zinc-600 dark:text-zinc-300">
                    {p.useFixedPrice ? <span className="text-zinc-400 italic">fijo</span> : p.marginPct !== null ? `${p.marginPct}%` : '—'}
                  </td>
                  <td className="py-3 px-4 text-sm font-black text-zinc-900 dark:text-white">
                    <span className="inline-flex items-center gap-1.5">
                      {p.priceFinal !== null ? usd(p.priceFinal) : '—'}
                      {p.useFixedPrice ? (
                        <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300" title="Precio fijo manual (no sigue la política)">Fijo</span>
                      ) : p.useCustomMargin ? (
                        <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300" title="Margen personalizado (no sigue la política de tramos)">Margen</span>
                      ) : null}
                    </span>
                  </td>
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
                          onClick={() => toggleRecommended(p)}
                          disabled={recId === p.id}
                          title={p.isRecommended ? 'Quitar recomendado' : 'Marcar como recomendado'}
                          className="flex items-center justify-center rounded-lg border border-zinc-200 dark:border-white/10 px-2 py-1.5 hover:border-[#9933c1]/50 transition disabled:opacity-50 cursor-pointer"
                        >
                          {recId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Star className={`h-3.5 w-3.5 ${p.isRecommended ? 'fill-[#9933c1] text-[#9933c1]' : 'text-zinc-400'}`} />}
                        </button>
                        <button
                          onClick={() => setEditing(p)}
                          className="flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-white/10 px-2.5 py-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:border-[#9933c1]/50 transition cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Precio
                        </button>
                        {(p.useFixedPrice || p.useCustomMargin) && (
                          <button
                            onClick={() => clearAuto(p)}
                            disabled={clearId === p.id}
                            title="Volver al precio automático (política de tramos)"
                            className="flex items-center gap-1 rounded-lg border border-amber-300 dark:border-amber-400/30 px-2.5 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-400/10 transition disabled:opacity-50 cursor-pointer"
                          >
                            {clearId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} Auto
                          </button>
                        )}
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
        ) : (
          <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {shown.map((p) => (
              <div key={p.id} className="border border-zinc-200 dark:border-white/10 rounded-xl p-4 flex flex-col bg-zinc-50 dark:bg-black/20 hover:border-[#9933c1]/30 transition-colors">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 line-clamp-2">
                    {displayName(p)}
                  </div>
                  {isSuperAdmin && (
                    <button onClick={() => toggleRecommended(p)} disabled={recId === p.id} className="shrink-0 p-1.5 -mr-1.5 -mt-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50 transition cursor-pointer">
                      {recId === p.id ? <Loader2 className="h-4 w-4 animate-spin text-zinc-400" /> : <Star className={`h-4 w-4 ${p.isRecommended ? 'fill-[#9933c1] text-[#9933c1]' : 'text-zinc-300 dark:text-zinc-600 hover:text-zinc-500'}`} />}
                    </button>
                  )}
                </div>
                <div className="text-xs text-zinc-500 mb-3">
                  {countryLabel(p)} · {dataLabel(p)} · {p.durationDays ?? '—'}d
                </div>
                <div className="flex items-center gap-2 mb-4 mt-auto">
                  <span className="text-sm font-black text-zinc-900 dark:text-white">{p.priceFinal !== null ? usd(p.priceFinal) : '—'}</span>
                  {p.useFixedPrice && <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">Fijo</span>}
                  {p.useCustomMargin && <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300">Margen</span>}
                </div>
                <div className="flex items-center justify-between border-t border-zinc-200 dark:border-white/10 pt-3">
                  {isSuperAdmin ? (
                    <>
                      <button onClick={() => setEditing(p)} className="flex items-center gap-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:text-[#9933c1] dark:hover:text-[#b3ff6b] transition cursor-pointer">
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </button>
                      <button onClick={() => toggleStatus(p)} disabled={togglingId === p.id} className={`flex items-center justify-center text-xs font-bold px-3 py-1.5 rounded-lg border transition disabled:opacity-50 cursor-pointer min-w-[85px] ${p.status === 'active' ? 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10' : 'border-[#b3ff6b]/50 text-green-700 hover:bg-[#b3ff6b]/10 dark:text-[#b3ff6b] dark:hover:bg-[#b3ff6b]/20'}`}>
                        {togglingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : p.status === 'active' ? 'Desactivar' : 'Activar'}
                      </button>
                    </>
                  ) : (
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${p.status === 'active' ? 'bg-[#b3ff6b]/30 text-green-900 dark:bg-[#b3ff6b]/20 dark:text-[#b3ff6b]' : 'bg-zinc-100 text-zinc-500 dark:bg-white/10 dark:text-zinc-400'}`}>
                      {p.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {shown.length === 0 && (
              <div className="col-span-full py-8 text-center text-zinc-500 text-sm">No se encontraron planes para esta búsqueda.</div>
            )}
          </div>
        )}
      </div>

      {filtered.length > CAP && (
        <p className="text-xs text-zinc-400">Mostrando los primeros {CAP} de {filtered.length}. Refiná la búsqueda para ver más.</p>
      )}

      {editing && <PriceEditor plan={editing} eurUsdRate={eurUsdRate} roundPsychological={roundPsychological} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); router.refresh(); }} />}
    </>
  );
}

const editorInput =
  'w-full px-3 py-2 rounded-xl bg-white dark:bg-black/50 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1]';

function PriceEditor({ plan, eurUsdRate, roundPsychological, onClose, onSaved }: {
  plan: AdminPlanRow;
  eurUsdRate: number;
  roundPsychological: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const initialMode: 'auto' | 'margin' | 'fixed' = plan.useFixedPrice ? 'fixed' : plan.useCustomMargin ? 'margin' : 'auto';
  const [mode, setMode] = useState<'auto' | 'margin' | 'fixed'>(initialMode);
  const [margin, setMargin] = useState(String(plan.marginPct ?? 100));
  const [fixed, setFixed] = useState(String(plan.priceFixed ?? plan.priceFinal ?? ''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const round = (x: number) =>
    roundPsychological ? Math.floor(x) + (x - Math.floor(x) <= 0.49 ? 0.49 : 0.99) : Math.round(x * 100) / 100;
  const preview =
    mode === 'fixed'
      ? Number(fixed) || 0
      : mode === 'margin' && plan.costEur !== null
        ? round(plan.costEur * (1 + (Number(margin) || 0) / 100) * eurUsdRate)
        : plan.priceFinal ?? 0; // auto: el actual (se recalcula con la política al guardar)

  const save = async () => {
    setBusy(true);
    setError(null);
    const r = await updatePlanPricing({
      planId: plan.id,
      mode,
      marginPct: mode === 'margin' ? Number(margin) : undefined,
      priceFixed: mode === 'fixed' ? Number(fixed) : undefined,
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
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1.5">Cómo se calcula el precio</label>
              <div className="grid grid-cols-3 gap-2">
                {([['auto', 'Automático'], ['margin', 'Margen %'], ['fixed', 'Precio fijo']] as const).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setMode(v)}
                    className={`rounded-xl border px-2 py-2 text-xs font-bold transition cursor-pointer ${
                      mode === v
                        ? 'border-[#9933c1] bg-[#9933c1]/10 text-[#9933c1] dark:text-[#b3ff6b]'
                        : 'border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-300 hover:border-[#9933c1]/40'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {mode === 'auto' && (
              <p className="text-xs text-zinc-400">Usa la política de tramos (Configuración → Política de precios). El precio se recalcula al guardar.</p>
            )}
            {mode === 'margin' && (
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5">Margen (%) — solo para este plan</label>
                <input type="number" min="0" step="1" value={margin} onChange={(e) => setMargin(e.target.value)} className={editorInput} />
              </div>
            )}
            {mode === 'fixed' && (
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5">Precio fijo (USD)</label>
                <input type="number" min="0" step="0.01" value={fixed} onChange={(e) => setFixed(e.target.value)} className={editorInput} />
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
