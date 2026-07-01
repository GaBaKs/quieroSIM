'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Loader2, Clock, Ban, ShoppingCart, Package, FileText } from 'lucide-react';
import { type MyAgency, type WholesalePlan } from '@/server/actions/wholesale';
import WholesaleShop from '@/components/wholesale/WholesaleShop';
import WholesaleInventory from '@/components/wholesale/WholesaleInventory';
import WholesaleBatches from '@/components/wholesale/WholesaleBatches';

/** Portal mayorista (lado agencia). Registro/estado + tienda (catálogo + compra en lote) e inventario si aprobada. */
export default function WholesalePortal({ agency, catalog }: { agency: MyAgency | null; catalog: WholesalePlan[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<'shop' | 'inventory' | 'batches'>('shop');

  if (!agency || agency.status !== 'approved') return null;

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
