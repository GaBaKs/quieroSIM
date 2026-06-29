'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Loader2, Clock, Ban, CheckCircle2 } from 'lucide-react';
import { registerAgency, type MyAgency } from '@/server/actions/wholesale';

/** Portal mayorista (lado agencia). M1: registro + estado. Catálogo/compra/inventario llegan en M2-M4. */
export default function WholesalePortal({ agency }: { agency: MyAgency | null }) {
  const router = useRouter();

  if (!agency) return <RegisterForm onDone={() => router.refresh()} />;
  if (agency.status === 'pending')
    return <Notice tone="amber" icon={<Clock className="h-7 w-7" />} title="Solicitud en revisión" text="Tu solicitud de agencia mayorista está siendo revisada. Te avisamos cuando se apruebe." />;
  if (agency.status === 'suspended')
    return <Notice tone="zinc" icon={<Ban className="h-7 w-7" />} title="Cuenta suspendida" text="Tu cuenta de agencia está suspendida temporalmente. Escribinos para reactivarla." />;

  // approved (M1: placeholder hasta el catálogo)
  return (
    <div className="rounded-2xl border border-[#9933c1]/20 bg-[#9933c1]/[0.04] p-6 space-y-2">
      <div className="flex items-center gap-2 text-[#7100a5] dark:text-[#b3ff6b]">
        <CheckCircle2 className="h-6 w-6" />
        <h3 className="font-black text-lg">{agency.companyName} · aprobada</h3>
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        Tu agencia está activa. El <strong>catálogo mayorista</strong>, la <strong>compra en lote</strong> y el <strong>inventario</strong> se habilitan en los próximos pasos.
      </p>
      {agency.customMarginPct !== null && <p className="text-xs text-zinc-400">Tu margen propio: {agency.customMarginPct}%</p>}
    </div>
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
