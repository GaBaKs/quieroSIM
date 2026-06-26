import AffiliatesView from '@/components/admin/AffiliatesView';
import AffiliatesMock from '@/components/admin/AffiliatesMock';
import { getAffiliatesAdmin } from '@/server/actions/admin-affiliates';
import { getAuthContext } from '@/server/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminAffiliatesPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/admin/login');
  const isSuperAdmin = ctx.adminSubRole === 'super_admin';

  // El listado con finanzas es solo super_admin; el resto ve la vista informativa.
  const result = isSuperAdmin ? await getAffiliatesAdmin() : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white mb-2">Afiliados</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Gestión del programa de referidos, niveles y comisiones.</p>
      </div>

      {!isSuperAdmin ? (
        <AffiliatesMock isSuperAdmin={false} />
      ) : result && !result.ok ? (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-400/10 rounded-xl p-4">{result.error.message}</p>
      ) : (
        <AffiliatesView affiliates={result && result.ok ? result.data : []} />
      )}
    </div>
  );
}
