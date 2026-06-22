import { getSalesReport, getFinanceReport, getRefundsReport } from '@/server/actions/admin-reports';
import ReportsView from '@/components/admin/ReportsView';

/** Reportes y finanzas (Fase 11 parcial). Server component — datos REALES. */
export default async function AdminReportsPage() {
  const [salesRes, financeRes, refundsRes] = await Promise.all([
    getSalesReport(),
    getFinanceReport(),
    getRefundsReport(),
  ]);

  const firstErr = !salesRes.ok ? salesRes : !financeRes.ok ? financeRes : !refundsRes.ok ? refundsRes : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white mb-2">Reportes</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Ventas, finanzas y reembolsos — datos reales de las órdenes.</p>
      </div>

      {firstErr ? (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-400/10 rounded-xl p-4">{firstErr.error.message}</p>
      ) : (
        <ReportsView
          sales={salesRes.ok ? salesRes.data : { byMonth: [], byCountry: [] }}
          finance={financeRes.ok ? financeRes.data : []}
          refunds={refundsRes.ok ? refundsRes.data : []}
        />
      )}
    </div>
  );
}
