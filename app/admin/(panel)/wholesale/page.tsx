import { Metadata } from 'next';
import AgenciesView from '@/components/admin/AgenciesView';
import { getAgenciesAdmin } from '@/server/actions/admin-wholesale';

export const metadata: Metadata = {
  title: 'Mayoristas | Admin Panel',
};

export default async function WholesalePage() {
  const res = await getAgenciesAdmin();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white mb-2">Agencias Mayoristas</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Alta, aprobación y margen propio de las agencias.</p>
      </div>

      {res.ok ? (
        <AgenciesView agencies={res.data} />
      ) : (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-400/10 rounded-xl p-4">{res.error.message}</p>
      )}
    </div>
  );
}
