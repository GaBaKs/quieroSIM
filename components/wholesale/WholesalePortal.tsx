'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Loader2, Clock, Ban, ShoppingCart, Package, FileText } from 'lucide-react';
import { registerAgency, type MyAgency, type WholesalePlan } from '@/server/actions/wholesale';
import WholesaleShop from '@/components/wholesale/WholesaleShop';
import WholesaleInventory from '@/components/wholesale/WholesaleInventory';
import WholesaleBatches from '@/components/wholesale/WholesaleBatches';

/** Portal mayorista (lado agencia). Registro/estado + tienda (catálogo + compra en lote) e inventario si aprobada. */
export default function WholesalePortal({ agency, catalog }: { agency: MyAgency | null; catalog: WholesalePlan[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<'shop' | 'inventory' | 'batches'>('shop');

  if (!agency) return <RegisterForm onDone={() => router.refresh()} />;
  if (agency.status === 'pending')
    return <Notice tone="amber" icon={<Clock className="h-7 w-7" />} title="Solicitud en revisión" text="Tu solicitud de agencia mayorista está siendo revisada. Te avisamos cuando se apruebe." />;
  if (agency.status === 'suspended')
    return <Notice tone="zinc" icon={<Ban className="h-7 w-7" />} title="Cuenta suspendida" text="Tu cuenta de agencia está suspendida temporalmente. Escribinos para reactivarla." />;

  // approved → tienda + inventario
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        <strong className="text-zinc-700 dark:text-zinc-200">{agency.companyName}</strong> · precios mayoristas{agency.customMarginPct !== null ? ` (margen ${agency.customMarginPct}%)` : ''}
      </p>
      <div className="flex gap-2 flex-wrap">
        <Tab active={tab === 'shop'} onClick={() => setTab('shop')} icon={<ShoppingCart className="h-4 w-4" />} label="Comprar" />
        <Tab active={tab === 'inventory'} onClick={() => setTab('inventory')} icon={<Package className="h-4 w-4" />} label="Mi inventario" />
        <Tab active={tab === 'batches'} onClick={() => setTab('batches')} icon={<FileText className="h-4 w-4" />} label="Mis lotes" />
      </div>
      {tab === 'shop' && <WholesaleShop catalog={catalog} />}
      {tab === 'inventory' && <WholesaleInventory agencyId={agency.id} />}
      {tab === 'batches' && <WholesaleBatches />}
    </div>
  );
}

function Tab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition cursor-pointer ${active ? 'bg-[#9933c1] text-white' : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-300'}`}>
      {icon} {label}
    </button>
  );
}

function RegisterForm({ onDone }: { onDone: () => void }) {
  const [companyName, setCompanyName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (companyName.trim().length < 2) { setError('Ingresá el nombre de tu empresa.'); return; }
    setBusy(true); setError(null);
    const res = await registerAgency({
      companyName: companyName.trim(),
      taxId: taxId.trim() || undefined,
      billingAddress: billingAddress.trim() || undefined,
    });
    setBusy(false);
    if (res.ok) onDone();
    else setError(res.error.message);
  };

  const inputCls = 'w-full px-3 py-2.5 text-sm bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9933c1]/30';
  const labelCls = 'block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1.5';

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5 text-[#9933c1] dark:text-[#b3ff6b]" />
        <h3 className="font-black text-lg text-zinc-900 dark:text-white">Registrá tu agencia</h3>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Comprá eSIMs en lote a precio mayorista y gestioná tu inventario. Tras registrarte, un admin aprueba tu cuenta.</p>
      <div>
        <label className={labelCls}>Nombre de la empresa *</label>
        <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Viajes Globales S.A." className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>CUIT / Tax ID (opcional)</label>
        <input value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="30-12345678-9" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Dirección de facturación (opcional)</label>
        <input value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} placeholder="Av. Siempre Viva 123, Buenos Aires" className={inputCls} />
      </div>
      {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-400/10 rounded-lg p-2.5">{error}</p>}
      <button onClick={submit} disabled={busy} className="w-full rounded-xl bg-[#9933c1] hover:bg-[#7100a5] text-white font-bold py-3 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Building2 className="h-5 w-5" />} Solicitar acceso mayorista
      </button>
    </div>
  );
}

function Notice({ tone, icon, title, text }: { tone: 'amber' | 'zinc'; icon: React.ReactNode; title: string; text: string }) {
  const cls = tone === 'amber'
    ? 'border-amber-200 bg-amber-50 dark:bg-amber-400/10 dark:border-amber-400/20 text-amber-700 dark:text-amber-300'
    : 'border-zinc-200 bg-zinc-50 dark:bg-white/5 dark:border-white/10 text-zinc-500';
  return (
    <div className={`rounded-2xl border p-6 ${cls}`}>
      <div className="flex items-center gap-3 mb-1">{icon}<h3 className="font-black text-lg text-zinc-900 dark:text-white">{title}</h3></div>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">{text}</p>
    </div>
  );
}
