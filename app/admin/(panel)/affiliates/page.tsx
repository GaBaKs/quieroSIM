import AffiliatesMock from '@/components/admin/AffiliatesMock';
import { getAuthContext } from '@/server/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminAffiliatesPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/admin/login');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white mb-2">Afiliados</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Gestión del programa de referidos, niveles y comisiones.</p>
      </div>

      <AffiliatesMock isSuperAdmin={ctx.adminSubRole === 'super_admin'} />
    </div>
  );
}
