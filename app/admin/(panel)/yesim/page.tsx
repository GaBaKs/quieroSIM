import YesimPanel from '@/components/admin/YesimPanel';
import { getAuthContext } from '@/server/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminYesimPage() {
  const ctx = await getAuthContext();
  
  // Solo super_admin tiene acceso
  if (!ctx || ctx.adminSubRole !== 'super_admin') {
    redirect('/admin');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white mb-2">Integración YeSIM</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Estado de la API, saldo prepago y métricas de consumo de eSIMs.</p>
      </div>

      <YesimPanel />
    </div>
  );
}
