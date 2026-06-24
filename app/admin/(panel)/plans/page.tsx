import { getPlansAdmin } from '@/server/actions/admin-plans';
import { getPricingPolicy } from '@/server/actions/admin-settings';
import { getAuthContext } from '@/server/lib/auth';
import PlansView from '@/components/admin/PlansView';

/** Gestión de planes y precios. Server component. */
export default async function AdminPlansPage() {
  const [result, ctx, policyRes] = await Promise.all([getPlansAdmin(), getAuthContext(), getPricingPolicy()]);
  const isSuperAdmin = ctx?.adminSubRole === 'super_admin';
  const policy = policyRes.ok ? policyRes.data : { eurUsdRate: 1.135, roundPsychological: true, groups: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white mb-2">Planes y precios</h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          {isSuperAdmin
            ? 'Ajustá margen, precio fijo y disponibilidad de cada plan.'
            : 'Vista del catálogo. La edición de precios es solo para super administradores.'}
        </p>
      </div>

      {!result.ok ? (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-400/10 rounded-xl p-4">{result.error.message}</p>
      ) : (
        <PlansView plans={result.data} isSuperAdmin={isSuperAdmin} eurUsdRate={policy.eurUsdRate} roundPsychological={policy.roundPsychological} />
      )}
    </div>
  );
}
