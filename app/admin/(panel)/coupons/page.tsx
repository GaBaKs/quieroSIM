import { getCoupons } from '@/server/actions/admin-coupons';
import { getPlansAdmin } from '@/server/actions/admin-plans';
import CouponsView from '@/components/admin/CouponsView';

/** Gestión de cupones (Etapa 8A). Server component. */
export default async function AdminCouponsPage() {
  const [couponsRes, plansRes] = await Promise.all([getCoupons(), getPlansAdmin()]);
  const plans = plansRes.ok ? plansRes.data.map((p) => ({ id: p.id, name: p.name })) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white mb-2">Cupones</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Descuentos promocionales: creación, condiciones y uso.</p>
      </div>

      {!couponsRes.ok ? (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-400/10 rounded-xl p-4">{couponsRes.error.message}</p>
      ) : (
        <CouponsView coupons={couponsRes.data} plans={plans} />
      )}
    </div>
  );
}
