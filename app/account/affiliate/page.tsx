import { Metadata } from 'next';
import AffiliateDashboard from '@/components/account/AffiliateDashboard';
import { getMyAffiliate } from '@/server/actions/affiliates';

export const metadata: Metadata = {
  title: 'Programa de Afiliados | Mi Cuenta',
};

export default async function AffiliatePage() {
  const result = await getMyAffiliate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Programa de Afiliados</h1>
        <p className="text-slate-500 dark:text-zinc-400 mt-1">Ganá comisión por cada venta que traigas con tu link o cupón.</p>
      </div>

      {!result.ok ? (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-400/10 rounded-xl p-4">{result.error.message}</p>
      ) : (
        <AffiliateDashboard affiliate={result.data} />
      )}
    </div>
  );
}
