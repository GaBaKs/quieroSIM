'use client';

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  Download,
  Calendar,
  Filter,
  Users,
  RefreshCw,
  FileText,
} from 'lucide-react';
import QuieroButton from '@/components/ui/QuieroButton';
import { usd } from '@/components/admin/format';

// ─── Mock data ──────────────────────────────────────────────────────────────

const MOCK_SALES_BY_MONTH = [
  { month: 'Ene', sales: 145, revenue: 4350 },
  { month: 'Feb', sales: 178, revenue: 5340 },
  { month: 'Mar', sales: 210, revenue: 6300 },
  { month: 'Abr', sales: 192, revenue: 5760 },
  { month: 'May', sales: 265, revenue: 7950 },
  { month: 'Jun', sales: 310, revenue: 9300 },
];

const MOCK_SALES_BY_COUNTRY = [
  { country: 'Estados Unidos', sales: 320, revenue: 9600, pct: 28 },
  { country: 'Europa Regional', sales: 280, revenue: 11200, pct: 24 },
  { country: 'Brasil', sales: 150, revenue: 3750, pct: 13 },
  { country: 'Japón', sales: 120, revenue: 4800, pct: 10 },
  { country: 'México', sales: 95, revenue: 2375, pct: 8 },
  { country: 'Otros', sales: 185, revenue: 5275, pct: 17 },
];

const MOCK_FINANCE_MONTHS = [
  { month: 'Enero', income: 4350, cost: 2610, margin: 1740 },
  { month: 'Febrero', income: 5340, cost: 3204, margin: 2136 },
  { month: 'Marzo', income: 6300, cost: 3780, margin: 2520 },
  { month: 'Abril', income: 5760, cost: 3456, margin: 2304 },
  { month: 'Mayo', income: 7950, cost: 4770, margin: 3180 },
  { month: 'Junio', income: 9300, cost: 5580, margin: 3720 },
];

const MOCK_AFFILIATE_REPORT = [
  { name: 'Diego Fernández', sales: 215, commission: 4887.80, conversion: 3.2 },
  { name: 'Martina López', sales: 87, commission: 2124.50, conversion: 2.8 },
  { name: 'Valentina Ruiz', sales: 43, commission: 757.30, conversion: 1.9 },
];

const MOCK_REFUNDS = [
  { id: 'REF-001', order: 'ORD-9c3d', customer: 'ana@hotmail.com', amount: 19.99, reason: 'Plan no utilizado — viaje cancelado', agent: 'Soporte 1', date: '2026-06-16T16:00:00Z' },
  { id: 'REF-002', order: 'ORD-3b0c', customer: 'elena@gmail.com', amount: 17.99, reason: 'eSIM no compatible con dispositivo', agent: 'Soporte 1', date: '2026-06-10T12:00:00Z' },
  { id: 'REF-003', order: 'ORD-1a2b', customer: 'carlos@gmail.com', amount: 34.99, reason: 'Error en la activación — fallo proveedor', agent: 'Admin', date: '2026-05-28T14:00:00Z' },
];

// ─── Component ──────────────────────────────────────────────────────────────

type Tab = 'sales' | 'finance' | 'affiliates' | 'refunds';

export default function ReportsView() {
  const [tab, setTab] = useState<Tab>('sales');

  const totalRevenue = MOCK_FINANCE_MONTHS.reduce((s, m) => s + m.income, 0);
  const totalCost = MOCK_FINANCE_MONTHS.reduce((s, m) => s + m.cost, 0);
  const totalMargin = MOCK_FINANCE_MONTHS.reduce((s, m) => s + m.margin, 0);
  const totalSales = MOCK_SALES_BY_MONTH.reduce((s, m) => s + m.sales, 0);

  const maxRevenue = Math.max(...MOCK_SALES_BY_MONTH.map((m) => m.revenue));

  const tabs: { label: string; value: Tab; icon: typeof BarChart3 }[] = [
    { label: 'Ventas', value: 'sales', icon: BarChart3 },
    { label: 'Finanzas', value: 'finance', icon: DollarSign },
    { label: 'Afiliados', value: 'affiliates', icon: Users },
    { label: 'Reembolsos', value: 'refunds', icon: RefreshCw },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Ingresos totales', value: usd(totalRevenue), icon: DollarSign, color: 'text-[#b3ff6b]' },
          { label: 'Costo de ventas', value: usd(totalCost), icon: TrendingUp, color: 'text-orange-400' },
          { label: 'Margen bruto', value: usd(totalMargin), icon: BarChart3, color: 'text-[#9933c1]' },
          { label: 'Total ventas', value: String(totalSales), icon: FileText, color: 'text-blue-400' },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 p-5 flex items-start gap-4">
            <div className={`p-2.5 rounded-xl bg-black/5 dark:bg-white/5 ${kpi.color}`}><kpi.icon className="h-5 w-5" /></div>
            <div>
              <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{kpi.label}</p>
              <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight mt-0.5">{kpi.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-white/10 pb-0 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.value} onClick={() => setTab(t.value)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 -mb-px transition-colors cursor-pointer whitespace-nowrap ${
              tab === t.value ? 'border-[#9933c1] text-[#9933c1] dark:text-[#b3ff6b] dark:border-[#b3ff6b]' : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}><t.icon className="h-4 w-4" /> {t.label}</button>
        ))}
      </div>

      {/* Sales Tab */}
      {tab === 'sales' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Resumen de ventas 2026 — datos mock</p>
            <QuieroButton variant="secondary" className="text-xs py-2 px-3 flex items-center gap-1.5"><Download className="h-3.5 w-3.5" /> Exportar CSV</QuieroButton>
          </div>

          {/* Bar Chart */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 p-6">
            <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider mb-4">Ingresos por mes</h3>
            <div className="flex items-end gap-3 h-48">
              {MOCK_SALES_BY_MONTH.map((m, i) => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-[10px] font-bold text-zinc-500">{usd(m.revenue)}</span>
                  <motion.div initial={{ height: 0 }} animate={{ height: `${(m.revenue / maxRevenue) * 100}%` }} transition={{ delay: i * 0.08, duration: 0.5 }}
                    className="w-full bg-gradient-to-t from-[#9933c1] to-[#9933c1]/60 rounded-t-lg min-h-[4px]" />
                  <span className="text-xs font-bold text-zinc-500">{m.month}</span>
                </div>
              ))}
            </div>
          </div>

          {/* By Country */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 overflow-hidden">
            <table className="w-full text-left">
              <thead><tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/30">
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">País/Región</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Ventas</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Ingresos</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">%</th>
              </tr></thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                {MOCK_SALES_BY_COUNTRY.map((c) => (
                  <tr key={c.country} className="hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 text-sm font-bold text-zinc-900 dark:text-white">{c.country}</td>
                    <td className="py-3 px-4 text-sm text-zinc-700 dark:text-zinc-300 text-right">{c.sales}</td>
                    <td className="py-3 px-4 text-sm font-bold text-[#b3ff6b] text-right">{usd(c.revenue)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-16 h-2 bg-zinc-100 dark:bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-[#9933c1] rounded-full" style={{ width: `${c.pct}%` }} />
                        </div>
                        <span className="text-xs font-bold text-zinc-500">{c.pct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Finance Tab */}
      {tab === 'finance' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Informe financiero anual 2026 — datos mock para declaración fiscal LLC</p>
            <div className="flex gap-2">
              <QuieroButton variant="secondary" className="text-xs py-2 px-3 flex items-center gap-1.5"><Download className="h-3.5 w-3.5" /> CSV</QuieroButton>
              <QuieroButton variant="secondary" className="text-xs py-2 px-3 flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> PDF</QuieroButton>
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 overflow-hidden">
            <table className="w-full text-left">
              <thead><tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/30">
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Mes</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Ingresos</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Costo ventas</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Margen bruto</th>
              </tr></thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                {MOCK_FINANCE_MONTHS.map((m) => (
                  <tr key={m.month} className="hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 text-sm font-bold text-zinc-900 dark:text-white">{m.month}</td>
                    <td className="py-3 px-4 text-sm font-bold text-[#b3ff6b] text-right">{usd(m.income)}</td>
                    <td className="py-3 px-4 text-sm text-red-500 text-right">{usd(m.cost)}</td>
                    <td className="py-3 px-4 text-sm font-bold text-zinc-900 dark:text-white text-right">{usd(m.margin)}</td>
                  </tr>
                ))}
                <tr className="bg-zinc-50 dark:bg-black/30 font-black">
                  <td className="py-3 px-4 text-sm text-zinc-900 dark:text-white">TOTAL</td>
                  <td className="py-3 px-4 text-sm text-[#b3ff6b] text-right">{usd(totalRevenue)}</td>
                  <td className="py-3 px-4 text-sm text-red-500 text-right">{usd(totalCost)}</td>
                  <td className="py-3 px-4 text-sm text-zinc-900 dark:text-white text-right">{usd(totalMargin)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Affiliates Tab */}
      {tab === 'affiliates' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[500px]">
            <thead><tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/30">
              <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Afiliado</th>
              <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Ventas</th>
              <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Comisión total</th>
              <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Conversión %</th>
            </tr></thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
              {MOCK_AFFILIATE_REPORT.map((a) => (
                <tr key={a.name} className="hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 text-sm font-bold text-zinc-900 dark:text-white">{a.name}</td>
                  <td className="py-3 px-4 text-sm text-zinc-700 dark:text-zinc-300 text-right">{a.sales}</td>
                  <td className="py-3 px-4 text-sm font-bold text-[#b3ff6b] text-right">{usd(a.commission)}</td>
                  <td className="py-3 px-4 text-sm font-bold text-[#9933c1] dark:text-[#b3ff6b] text-right">{a.conversion}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Refunds Tab */}
      {tab === 'refunds' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
            <thead><tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/30">
              <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">ID</th>
              <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Cliente</th>
              <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Motivo</th>
              <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Monto</th>
              <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Agente</th>
            </tr></thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
              {MOCK_REFUNDS.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 font-bold text-sm text-[#9933c1] dark:text-[#b3ff6b]">{r.id}</td>
                  <td className="py-3 px-4 text-sm text-zinc-700 dark:text-zinc-300">{r.customer}</td>
                  <td className="py-3 px-4 text-sm text-zinc-500 max-w-[250px] truncate">{r.reason}</td>
                  <td className="py-3 px-4 text-sm font-bold text-red-500 text-right">{usd(r.amount)}</td>
                  <td className="py-3 px-4 text-sm text-zinc-700 dark:text-zinc-300">{r.agent}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
