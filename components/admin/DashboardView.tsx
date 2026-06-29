'use client';

import Link from 'next/link';
import { BarChart3, ShoppingCart, TrendingUp, Wallet, Activity, AlertTriangle } from 'lucide-react';
import { motion, Variants } from 'motion/react';
import { useMounted } from '@/hooks/use-mounted';
import { usd } from './format';
import type { DashboardMetrics, TopPlan, SalesPoint, SystemHealth, HealthStatus } from '@/server/actions/admin-dashboard';

const container: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

const HEALTH_UI: Record<HealthStatus, { label: string; dot: string; text: string }> = {
  ok: { label: 'Operativo', dot: 'bg-[#b3ff6b]', text: 'text-[#9933c1] dark:text-[#b3ff6b]' },
  down: { label: 'Caído', dot: 'bg-red-500', text: 'text-red-500' },
  not_configured: { label: 'Sin configurar', dot: 'bg-zinc-400', text: 'text-zinc-400' },
};

function SalesChart({ series }: { series: SalesPoint[] }) {
  const max = Math.max(1, ...series.map((p) => p.total));
  const w = 800;
  const h = 200;
  const pts = series.map((p, i) => {
    const x = series.length > 1 ? (i / (series.length - 1)) * w : 0;
    const y = h - (p.total / max) * (h - 20) - 10;
    return { x, y };
  });
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9933c1" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#9933c1" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <g className="stroke-zinc-200 dark:stroke-white/5" strokeWidth="1" strokeDasharray="4 4">
        <line x1="0" y1="50" x2={w} y2="50" />
        <line x1="0" y1="100" x2={w} y2="100" />
        <line x1="0" y1="150" x2={w} y2="150" />
      </g>
      <path d={area} fill="url(#salesGrad)" />
      <path d={line} fill="none" stroke="#9933c1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function DashboardView({
  metrics,
  topPlans,
  series,
  health,
}: {
  metrics: DashboardMetrics;
  topPlans: TopPlan[];
  series: SalesPoint[];
  health: SystemHealth | null;
}) {
  const mounted = useMounted();

  const kpis = [
    { name: 'Ventas del día', value: usd(metrics.salesToday), icon: ShoppingCart },
    { name: 'Ventas del mes', value: usd(metrics.salesMonth), icon: BarChart3 },
    { name: 'Órdenes totales', value: String(metrics.ordersTotal), icon: TrendingUp },
    { name: 'Ingresos totales', value: usd(metrics.revenueTotal), icon: Wallet },
  ];

  const services: Array<{ name: string; key: keyof SystemHealth }> = [
    { name: 'Stripe', key: 'stripe' },

    { name: 'Resend (email)', key: 'resend' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white mb-2">Dashboard</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Resumen del estado del negocio en tiempo real.</p>
      </div>

      {/* Aviso de órdenes en revisión */}
      {metrics.pendingReview > 0 && (
        <Link
          href="/admin/orders?status=failed_needs_review"
          className="flex items-center gap-3 rounded-2xl border border-amber-200 dark:border-amber-400/20 bg-amber-50 dark:bg-amber-400/10 px-5 py-4 hover:border-amber-300 transition"
        >
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
            {metrics.pendingReview} {metrics.pendingReview === 1 ? 'orden necesita' : 'órdenes necesitan'} revisión manual →
          </p>
        </Link>
      )}

      {mounted && (
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <motion.div
              variants={item}
              key={kpi.name}
              className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-white/10 group hover:border-[#9933c1]/50 transition-colors shadow-sm dark:shadow-none"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400">{kpi.name}</h3>
                <div className="p-2 bg-black/5 dark:bg-white/5 rounded-lg group-hover:bg-[#9933c1]/10 transition-colors">
                  <kpi.icon className="h-5 w-5 text-zinc-400 group-hover:text-[#9933c1] transition-colors" />
                </div>
              </div>
              <p className="text-3xl font-black text-zinc-900 dark:text-white">{kpi.value}</p>
            </motion.div>
          ))}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Gráfico de ventas real */}
        <div className="col-span-1 lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-white/10 shadow-sm dark:shadow-none">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-6">Ventas (últimos 30 días)</h2>
          <div className="relative h-64 w-full flex items-end">
            <SalesChart series={series} />
          </div>
        </div>

        {/* Estado del sistema real */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-white/10 shadow-sm dark:shadow-none">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-zinc-500" />
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Estado del Sistema</h2>
          </div>
          <div className="space-y-4">
            {services.map((svc) => {
              const status: HealthStatus = health ? health[svc.key] : 'down';
              const ui = HEALTH_UI[status];
              return (
                <div key={svc.key} className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-black/30 border border-zinc-100 dark:border-white/5">
                  <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{svc.name}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold tracking-wider uppercase ${ui.text}`}>{ui.label}</span>
                    <div className={`w-2.5 h-2.5 rounded-full ${ui.dot} ${status === 'ok' ? 'animate-pulse' : ''}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Planes más vendidos real */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-white/10 shadow-sm dark:shadow-none overflow-hidden">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-6">Planes más vendidos</h2>
        {topPlans.length === 0 ? (
          <p className="text-sm text-zinc-400 py-6 text-center">Todavía no hay ventas registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[520px]">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-white/10">
                  <th className="pb-3 text-xs font-bold text-zinc-500 uppercase tracking-wider px-4">#</th>
                  <th className="pb-3 text-xs font-bold text-zinc-500 uppercase tracking-wider px-4">Plan</th>
                  <th className="pb-3 text-xs font-bold text-zinc-500 uppercase tracking-wider px-4">Unidades</th>
                  <th className="pb-3 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right px-4">Ingresos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                {topPlans.map((plan, i) => (
                  <tr key={plan.planId} className="hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors group">
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#9933c1]/10 text-[#9933c1] dark:bg-[#b3ff6b]/20 dark:text-[#b3ff6b] text-xs font-black">{i + 1}</span>
                    </td>
                    <td className="py-4 px-4 font-bold text-zinc-900 dark:text-zinc-100">{plan.name}</td>
                    <td className="py-4 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">{plan.units}</td>
                    <td className="py-4 px-4 text-sm font-black text-zinc-900 dark:text-white text-right">{usd(plan.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
