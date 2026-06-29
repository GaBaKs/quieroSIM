'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, RefreshCw, Plus, Trash2, X, Star, DollarSign } from 'lucide-react';
import QuieroButton from '@/components/ui/QuieroButton';
import {
  updatePricingGlobals,
  saveGroup,
  createGroup,
  deleteGroup,
  saveGroupCompetitorRows,
  saveGroupMarginRanges,
  addCountryToGroup,
  removeCountryFromGroup,
  recalcPrices,
  type PricingPolicy,
  type PricingGroup,
} from '@/server/actions/admin-settings';

const inputCls =
  'px-3 py-2 text-sm bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-lg text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#9933c1]/30 focus:border-[#9933c1] transition-all';
const labelCls = 'block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1.5';
const card = 'bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 p-6 space-y-5';

const esRegion = typeof Intl !== 'undefined' && 'DisplayNames' in Intl ? new Intl.DisplayNames(['es'], { type: 'region' }) : null;
function countryName(iso: string): string {
  try {
    return esRegion?.of(iso.toUpperCase()) ?? iso;
  } catch {
    return iso;
  }
}
function flagEmoji(iso: string): string {
  if (iso.length !== 2) return '🏳️';
  return String.fromCodePoint(...[...iso.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)));
}

export default function PricingPolicyEditor({ policy }: { policy: PricingPolicy }) {
  const router = useRouter();

  // ── Globales (FX + redondeo + margen mayorista) ──
  const [fx, setFx] = useState(String(policy.eurUsdRate));
  const [round, setRound] = useState(policy.roundPsychological);
  const [wMargin, setWMargin] = useState(String(policy.wholesaleMarginPct));
  const [gBusy, setGBusy] = useState(false);
  const [gMsg, setGMsg] = useState<string | null>(null);

  const saveGlobals = async () => {
    setGBusy(true);
    setGMsg(null);
    const res = await updatePricingGlobals({ eurUsdRate: Number(fx), roundPsychological: round, wholesaleMarginPct: Number(wMargin) });
    setGBusy(false);
    setGMsg(res.ok ? 'Guardado ✓ — recalculá para aplicar' : res.error.message);
    if (res.ok) router.refresh();
  };

  // ── Recalcular ──
  const [recalcBusy, setRecalcBusy] = useState(false);
  const [recalcMsg, setRecalcMsg] = useState<string | null>(null);
  const handleRecalc = async () => {
    setRecalcBusy(true);
    setRecalcMsg(null);
    const res = await recalcPrices();
    setRecalcBusy(false);
    setRecalcMsg(res.ok ? `Recalculados ${res.data.updated} planes ✓` : res.error.message);
    if (res.ok) router.refresh();
  };

  // ── Grupo seleccionado + crear ──
  const [selId, setSelId] = useState(policy.groups[0]?.id ?? '');
  const selected = policy.groups.find((g) => g.id === selId) ?? policy.groups[0];
  const [newName, setNewName] = useState('');
  const [createBusy, setCreateBusy] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim() || createBusy) return;
    setCreateBusy(true);
    const res = await createGroup({ name: newName.trim() });
    setCreateBusy(false);
    if (res.ok) {
      setNewName('');
      setSelId(res.data.id);
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Globales */}
      <div className={`${card} max-w-xl`}>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Precio automático = <strong>MAX(competencia × (1 − descuento%), costo × (1 + piso%))</strong>, redondeado. Si un grupo no usa la
          tabla o no tiene piso, manda el otro; si faltan ambos, usa los rangos de margen.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className={labelCls}>Tipo de cambio EUR → USD</label>
            <input type="number" step="0.001" value={fx} onChange={(e) => setFx(e.target.value)} className={`${inputCls} w-40`} />
          </div>
          <div>
            <label className={labelCls}>Margen mayorista global (%)</label>
            <input type="number" step="1" min="0" value={wMargin} onChange={(e) => setWMargin(e.target.value)} className={`${inputCls} w-40`} />
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer select-none pb-2.5">
            <input type="checkbox" checked={round} onChange={(e) => setRound(e.target.checked)} className="h-4 w-4 rounded accent-[#9933c1]" />
            <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Redondeo psicológico (.49 / .99)</span>
          </label>
        </div>
        <p className="text-xs text-zinc-400">
          El margen mayorista global es el precio base de las agencias (sobre el costo). Cada plan puede pisarlo con margen propio o
          precio fijo en <strong>Planes y precios → Mayorista</strong>; cada agencia puede tener su margen negociado.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <QuieroButton variant="primary" className="py-2.5 px-5 text-sm flex items-center gap-2" onClick={saveGlobals}>
            <Save className="h-4 w-4" /> {gBusy ? 'Guardando…' : 'Guardar globales'}
          </QuieroButton>
          {gMsg && <span className="text-sm text-zinc-600 dark:text-zinc-300">{gMsg}</span>}
          <button onClick={handleRecalc} disabled={recalcBusy} className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-white/10 px-5 py-2.5 text-sm font-bold text-zinc-700 dark:text-zinc-200 hover:border-[#9933c1]/50 transition disabled:opacity-60 cursor-pointer">
            <RefreshCw className={`h-4 w-4 ${recalcBusy ? 'animate-spin' : ''}`} /> Recalcular todos los precios
          </button>
          {recalcMsg && <span className="text-sm font-bold text-[#9933c1] dark:text-[#b3ff6b]">{recalcMsg}</span>}
        </div>
      </div>

      {/* Selector de grupo + crear */}
      <div className="flex flex-wrap items-center gap-2">
        {policy.groups.map((g) => (
          <button
            key={g.id}
            onClick={() => setSelId(g.id)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition cursor-pointer ${
              selected?.id === g.id
                ? 'bg-[#9933c1] text-white'
                : 'bg-zinc-100 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-white/10'
            }`}
          >
            {g.name} {g.isDefault && <span className="opacity-60">· default</span>}
            <span className="ml-1.5 opacity-60">({g.members.length})</span>
          </button>
        ))}
        <div className="flex items-center gap-1.5">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nuevo grupo…" className={`${inputCls} w-36`} />
          <button onClick={handleCreate} disabled={createBusy || !newName.trim()} className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-white/10 px-3 py-2 text-sm font-bold text-zinc-700 dark:text-zinc-200 hover:border-[#9933c1]/50 transition disabled:opacity-50 cursor-pointer">
            <Plus className="h-4 w-4" /> Crear
          </button>
        </div>
      </div>

      {selected && <GroupEditor key={selected.id} group={selected} onChanged={() => router.refresh()} />}
    </div>
  );
}

function GroupEditor({ group, onChanged }: { group: PricingGroup; onChanged: () => void }) {
  // Config del grupo
  const [floor, setFloor] = useState(group.floorMarkupPct === null ? '' : String(group.floorMarkupPct));
  const [disc, setDisc] = useState(group.competitorDiscountPct === null ? '' : String(group.competitorDiscountPct));
  const [useTable, setUseTable] = useState(group.useCompetitorTable);
  const [feature, setFeature] = useState(group.featureUnlimited);
  const [cfgBusy, setCfgBusy] = useState(false);
  const [cfgMsg, setCfgMsg] = useState<string | null>(null);

  const saveCfg = async () => {
    setCfgBusy(true);
    setCfgMsg(null);
    const res = await saveGroup({
      id: group.id,
      floorMarkupPct: floor.trim() === '' ? null : Number(floor),
      competitorDiscountPct: disc.trim() === '' ? null : Number(disc),
      useCompetitorTable: useTable,
      featureUnlimited: feature,
    });
    setCfgBusy(false);
    setCfgMsg(res.ok ? 'Guardado ✓ — recordá recalcular.' : res.error.message);
    if (res.ok) onChanged();
  };

  const handleDelete = async () => {
    if (!confirm(`¿Borrar el grupo "${group.name}"? Sus países vuelven al default.`)) return;
    const res = await deleteGroup({ id: group.id });
    if (res.ok) onChanged();
  };

  // Tabla de competencia
  const [comp, setComp] = useState(group.competitorRows.map((r) => ({ ...r, val: r.competitorUsd === null ? '' : String(r.competitorUsd) })));
  const [compBusy, setCompBusy] = useState(false);
  const [compMsg, setCompMsg] = useState<string | null>(null);
  const setComvalue = (id: string, v: string) => setComp((arr) => arr.map((r) => (r.id === id ? { ...r, val: v } : r)));
  const saveComp = async () => {
    setCompBusy(true);
    setCompMsg(null);
    const res = await saveGroupCompetitorRows({ groupId: group.id, rows: comp.map((r) => ({ id: r.id, competitorUsd: r.val.trim() === '' ? null : Number(r.val) })) });
    setCompBusy(false);
    setCompMsg(res.ok ? 'Guardado ✓ — recordá recalcular.' : res.error.message);
    if (res.ok) onChanged();
  };

  // Rangos de margen
  const [ranges, setRanges] = useState(
    group.marginRanges.map((r) => ({ min: String(r.minCostEur), max: r.maxCostEur === null ? '' : String(r.maxCostEur), margin: String(r.marginPct) })),
  );
  const [rangeBusy, setRangeBusy] = useState(false);
  const [rangeMsg, setRangeMsg] = useState<string | null>(null);
  const addRange = () => setRanges((a) => [...a, { min: '0', max: '', margin: '40' }]);
  const setRange = (i: number, k: 'min' | 'max' | 'margin', v: string) => setRanges((a) => a.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const delRange = (i: number) => setRanges((a) => a.filter((_, j) => j !== i));
  const saveRanges = async () => {
    setRangeBusy(true);
    setRangeMsg(null);
    const res = await saveGroupMarginRanges({
      groupId: group.id,
      ranges: ranges.map((r) => ({ minCostEur: Number(r.min || 0), maxCostEur: r.max.trim() === '' ? null : Number(r.max), marginPct: Number(r.margin || 0) })),
    });
    setRangeBusy(false);
    setRangeMsg(res.ok ? 'Guardado ✓ — recordá recalcular.' : res.error.message);
    if (res.ok) onChanged();
  };

  // Países
  const [newIso, setNewIso] = useState('');
  const addCountry = async () => {
    const iso = newIso.trim().toUpperCase();
    if (iso.length !== 2) return;
    const res = await addCountryToGroup({ groupId: group.id, iso });
    if (res.ok) {
      setNewIso('');
      onChanged();
    }
  };
  const removeCountry = async (iso: string) => {
    const res = await removeCountryFromGroup({ iso });
    if (res.ok) onChanged();
  };

  return (
    <div className="space-y-5">
      {/* Config del grupo */}
      <div className={`${card} max-w-2xl`}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-zinc-900 dark:text-white">{group.name}</h3>
          {!group.isDefault && (
            <button onClick={handleDelete} className="inline-flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-700 cursor-pointer">
              <Trash2 className="h-3.5 w-3.5" /> Borrar grupo
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className={labelCls}>Piso markup (%)</label>
            <input type="number" step="1" placeholder="vacío = sin piso" value={floor} onChange={(e) => setFloor(e.target.value)} className={`${inputCls} w-full`} />
          </div>
          <div>
            <label className={labelCls}>Descuento competencia (%)</label>
            <input type="number" step="1" value={disc} onChange={(e) => setDisc(e.target.value)} className={`${inputCls} w-full`} />
          </div>
        </div>
        <div className="flex flex-wrap gap-5">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={useTable} onChange={(e) => setUseTable(e.target.checked)} className="h-4 w-4 rounded accent-[#9933c1]" />
            <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Aplicar tabla de competencia</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={feature} onChange={(e) => setFeature(e.target.checked)} className="h-4 w-4 rounded accent-[#9933c1]" />
            <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1"><Star className="h-3.5 w-3.5" /> Ilimitados = estrella</span>
          </label>
        </div>
        <div className="flex items-center gap-3">
          <QuieroButton variant="primary" className="py-2.5 px-5 text-sm flex items-center gap-2" onClick={saveCfg}>
            <Save className="h-4 w-4" /> {cfgBusy ? 'Guardando…' : 'Guardar grupo'}
          </QuieroButton>
          {cfgMsg && <span className="text-sm text-zinc-600 dark:text-zinc-300">{cfgMsg}</span>}
        </div>
      </div>

      {/* Tabla de competencia */}
      <div className={`${card} max-w-2xl ${useTable ? '' : 'opacity-60'}`}>
        <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
          <DollarSign className="h-4 w-4" /> Precio de competencia (USD) por arquetipo
          {!useTable && <span className="text-xs font-normal text-amber-500">— tabla desactivada para este grupo</span>}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {comp.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">{r.label}</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-zinc-400">US$</span>
                <input type="number" step="0.01" placeholder="—" value={r.val} onChange={(e) => setComvalue(r.id, e.target.value)} className={`${inputCls} w-24`} />
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <QuieroButton variant="primary" className="py-2.5 px-5 text-sm flex items-center gap-2" onClick={saveComp}>
            <Save className="h-4 w-4" /> {compBusy ? 'Guardando…' : 'Guardar competencia'}
          </QuieroButton>
          {compMsg && <span className="text-sm text-zinc-600 dark:text-zinc-300">{compMsg}</span>}
        </div>
      </div>

      {/* Rangos de margen */}
      <div className={`${card} max-w-2xl`}>
        <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Rangos de margen por costo € (red de seguridad)</h4>
        <p className="text-xs text-zinc-400">Se usan solo si el plan no tiene competencia ni piso. Vacío en máx = sin tope.</p>
        <div className="space-y-2">
          {ranges.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">€</span>
              <input type="number" step="0.01" value={r.min} onChange={(e) => setRange(i, 'min', e.target.value)} className={`${inputCls} w-24`} placeholder="min" />
              <span className="text-xs text-zinc-400">a €</span>
              <input type="number" step="0.01" value={r.max} onChange={(e) => setRange(i, 'max', e.target.value)} className={`${inputCls} w-24`} placeholder="sin tope" />
              <span className="text-xs text-zinc-400">→ +</span>
              <input type="number" step="1" value={r.margin} onChange={(e) => setRange(i, 'margin', e.target.value)} className={`${inputCls} w-20`} placeholder="%" />
              <span className="text-xs text-zinc-400">%</span>
              <button onClick={() => delRange(i)} className="text-red-400 hover:text-red-600 cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
          ))}
          {ranges.length === 0 && <p className="text-xs text-zinc-400">Sin rangos cargados.</p>}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={addRange} className="inline-flex items-center gap-1 text-sm font-bold text-[#9933c1] dark:text-[#b3ff6b] cursor-pointer"><Plus className="h-4 w-4" /> Agregar rango</button>
          <QuieroButton variant="primary" className="py-2.5 px-5 text-sm flex items-center gap-2" onClick={saveRanges}>
            <Save className="h-4 w-4" /> {rangeBusy ? 'Guardando…' : 'Guardar rangos'}
          </QuieroButton>
          {rangeMsg && <span className="text-sm text-zinc-600 dark:text-zinc-300">{rangeMsg}</span>}
        </div>
      </div>

      {/* Países del grupo */}
      <div className={`${card} max-w-2xl`}>
        <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
          Países en este grupo {group.isDefault && <span className="text-xs font-normal text-zinc-400">— (default: cubre todos los no asignados)</span>}
        </h4>
        {!group.isDefault && (
          <>
            <div className="flex flex-wrap gap-2">
              {group.members.length === 0 && <span className="text-xs text-zinc-400">Sin países asignados.</span>}
              {group.members.map((iso) => (
                <span key={iso} className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 dark:bg-white/5 pl-2.5 pr-1.5 py-1 text-xs font-bold text-zinc-700 dark:text-zinc-200">
                  {flagEmoji(iso)} {countryName(iso)}
                  <button onClick={() => removeCountry(iso)} className="text-zinc-400 hover:text-red-500 cursor-pointer"><X className="h-3.5 w-3.5" /></button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input value={newIso} onChange={(e) => setNewIso(e.target.value)} placeholder="ISO2 (ej. PE)" maxLength={2} className={`${inputCls} w-28 uppercase`} />
              <button onClick={addCountry} disabled={newIso.trim().length !== 2} className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-white/10 px-3 py-2 text-sm font-bold text-zinc-700 dark:text-zinc-200 hover:border-[#9933c1]/50 transition disabled:opacity-50 cursor-pointer">
                <Plus className="h-4 w-4" /> Agregar país
              </button>
              {newIso.trim().length === 2 && <span className="text-xs text-zinc-500">{flagEmoji(newIso)} {countryName(newIso)}</span>}
            </div>
          </>
        )}
        {group.isDefault && <p className="text-xs text-zinc-400">El grupo default aplica a todos los países que no estén en otro grupo.</p>}
      </div>
    </div>
  );
}
