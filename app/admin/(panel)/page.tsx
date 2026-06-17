import { getDashboardMetrics, getTopPlans, getSalesSeries, getSystemHealth } from '@/server/actions/admin-dashboard';
import DashboardView from '@/components/admin/DashboardView';

/**
 * Dashboard admin con datos reales (server component). Las métricas salen de
 * RPCs con guard is_admin; la salud, de la Edge Function admin-health. El guard
 * de sesión+rol ya lo hace app/admin/(panel)/layout.tsx.
 */
export default async function AdminDashboardPage() {
  const [metricsRes, topRes, seriesRes, healthRes] = await Promise.all([
    getDashboardMetrics(),
    getTopPlans(5),
    getSalesSeries(30),
    getSystemHealth(),
  ]);

  const metrics = metricsRes.ok
    ? metricsRes.data
    : { salesToday: 0, salesMonth: 0, revenueTotal: 0, ordersTotal: 0, ordersToday: 0, pendingReview: 0 };

  return (
    <DashboardView
      metrics={metrics}
      topPlans={topRes.ok ? topRes.data : []}
      series={seriesRes.ok ? seriesRes.data : []}
      health={healthRes.ok ? healthRes.data : null}
    />
  );
}
