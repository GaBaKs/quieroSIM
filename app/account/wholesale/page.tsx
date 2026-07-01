import { Metadata } from 'next';
import { getMyAgency, getWholesaleCatalog } from '@/server/actions/wholesale';
import WholesalePortal from '@/components/wholesale/WholesalePortal';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Portal Mayorista | QuieroSIM',
};

export default async function AccountWholesalePage() {
  const [agencyRes, catalogRes] = await Promise.all([
    getMyAgency(),
    getWholesaleCatalog()
  ]);

  const agency = agencyRes.ok ? agencyRes.data : null;
  const catalog = catalogRes.ok ? catalogRes.data : [];

  // Proteccion: Si no esta logueado o no tiene perfil de agencia aprobado, lo mandamos al index de cuenta
  if (!agency || agency.status !== 'approved') {
    redirect('/account');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Portal Mayorista</h1>
        <p className="text-slate-500 dark:text-zinc-400 mt-1">
          Comprá en lote a precios especiales y gestioná tu inventario.
        </p>
      </div>

      <WholesalePortal agency={agency} catalog={catalog} />
    </div>
  );
}
