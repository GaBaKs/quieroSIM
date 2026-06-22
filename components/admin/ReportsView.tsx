'use client';

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { BarChart3, DollarSign, TrendingUp, Download, Users, RefreshCw, FileText } from 'lucide-react';
import QuieroButton from '@/components/ui/QuieroButton';
import { usd } from '@/components/admin/format';
import ComingSoon from '@/components/admin/ComingSoon';
import type { SalesReport, FinancePoint, RefundRow } from '@/server/actions/admin-reports';

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
function monthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  const idx = Number(m) - 1;
  return MONTHS_ES[idx] ? `${MONTHS_ES[idx]} ${y}` : ym;
}

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n');
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type Tab = 'sales' | 'finance' | 'affiliates' | 'refunds';

const card = 'bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10';
const th = 'py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider';

export default function ReportsView({
  sales,
  finance,
  refunds,
}: {
  sales: SalesReport;
  finance: FinancePoint[];
  refunds: RefundRow[];
}) {
  const [tab, setTab] = useState<Tab>('sales');

  const totals = useMemo(() => {
    const income = finance.reduce((s, f) => s + f.income, 0);
    const refundsTotal = finance.reduce((s, f) => s + f.refunds, 0);
    const net = finance.reduce((s, f) => s + f.net, 0);
    const units = sales.byMonth.reduce((s, m) => s + m.units, 0);
    return { income, refundsTotal, net, units };
  }, [finance, sales]);

  const maxRevenue = Math.max(1, ...sales.byMonth.map((m) => m.revenue));
  const countryTotal = Math.max(1, sales.byCountry.reduce((s, c) => s + c.revenue, 0));

  const tabs: { label: string; value: Tab; icon: typeof BarChart3 }[] = [
    { label: 'Ventas', value: 'sales', icon: BarChart3 },
    { label: 'Finanzas', value: 'finance', icon: DollarSign },
    { label: 'Reembolsos', value: 'refunds', icon: RefreshCw },
    { label: 'Afiliados', value: 'affiliates', icon: Users },
  ];

  const kpis = [
    { label: 'Ingresos', value: usd(totals.income), icon: DollarSign, color: 'text-[#b3ff6b]' },
    { label: 'Reembolsos', value: usd(totals.refundsTotal), icon: RefreshCw, color: 'text-red-400' },
    { label: 'Neto', value: usd(totals.net), icon: BarChart3, color: 'text-[#9933c1]' },
    { label: 'Ventas', value: String(totals.units), icon: FileText, color: 'text-blue-400' },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className={`${card} p-5 flex items-start gap-4`}>
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
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Ventas pagadas/emitidas (últimos 6 meses).</p>
            <QuieroButton variant="secondary" className="text-xs py-2 px-3 flex items-center gap-1.5"
              onClick={() => downloadCsv('ventas-por-mes.csv', ['Mes', 'Unidades', 'Ingresos'], sales.byMonth.map((m) => [m.month, m.units, m.revenue]))}>
              <Download className="h-3.5 w-3.5" /> Exportar CSV
            </QuieroButton>
          </div>

          {sales.byMonth.length === 0 ? (
            <div className={`${card} p-10 text-center text-sm text-zinc-500`}>Todavía no hay ventas en el período.</div>
          ) : (
            <div className={`${card} p-6`}>
              <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider mb-4">Ingresos por mes</h3>
              <div className="flex items-end gap-3 h-48">
                {sales.byMonth.map((m, i) => (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-[10px] font-bold text-zinc-500">{usd(m.revenue)}</span>
                    <motion.div initial={{ height: 0 }} animate={{ height: `${(m.revenue / maxRevenue) * 100}%` }} transition={{ delay: i * 0.08, duration: 0.5 }}
                      className="w-full bg-gradient-to-t from-[#9933c1] to-[#9933c1]/60 rounded-t-lg min-h-[4px]" />
                    <span className="text-xs font-bold text-zinc-500">{monthLabel(m.month)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sales.byCountry.length > 0 && (
            <div className={`${card} overflow-hidden`}>
              <table className="w-full text-left">
                <thead><tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/30">
                  <th className={th}>País</th><th className={`${th} text-right`}>Ventas</th><th className={`${th} text-right`}>Ingresos</th><th className={`${th} text-right`}>%</th>
                </tr></thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                  {sales.byCountry.map((c) => (
                    <tr key={c.country} className="hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 text-sm font-bold text-zinc-900 dark:text-white">{c.country}</td>
                      <td className="py-3 px-4 text-sm text-zinc-700 dark:text-zinc-300 text-right">{c.units}</td>
                      <td className="py-3 px-4 text-sm font-bold text-[#b3ff6b] text-right">{usd(c.revenue)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <div className="w-16 h-2 bg-zinc-100 dark:bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-[#9933c1] rounded-full" style={{ width: `${Math.round((c.revenue / countryTotal) * 100)}%` }} />
                          </div>
                          <span className="text-xs font-bold text-zinc-500">{Math.round((c.revenue / countryTotal) * 100)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Finance Tab */}
      {tab === 'finance' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Ingresos, reembolsos y neto por mes (valores exactos).</p>
            <QuieroButton variant="secondary" className="text-xs py-2 px-3 flex items-center gap-1.5"
              onClick={() => downloadCsv('finanzas.csv', ['Mes', 'Ingresos', 'Reembolsos', 'Neto'], finance.map((f) => [f.month, f.income, f.refunds, f.net]))}>
              <Download className="h-3.5 w-3.5" /> Exportar CSV
            </QuieroButton>
          </div>
          {finance.length === 0 ? (
            <div className={`${card} p-10 text-center text-sm text-zinc-500`}>Todavía no hay movimientos en el período.</div>
          ) : (
            <div className={`${card} overflow-hidden`}>
              <table className="w-full text-left">
                <thead><tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/30">
                  <th className={th}>Mes</th><th className={`${th} text-right`}>Ingresos</th><th className={`${th} text-right`}>Reembolsos</th><th className={`${th} text-right`}>Neto</th>
                </tr></thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                  {finance.map((f) => (
                    <tr key={f.month} className="hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 text-sm font-bold text-zinc-900 dark:text-white">{monthLabel(f.month)}</td>
                      <td className="py-3 px-4 text-sm font-bold text-[#b3ff6b] text-right">{usd(f.income)}</td>
                      <td className="py-3 px-4 text-sm text-red-500 text-right">{f.refunds > 0 ? `-${usd(f.refunds)}` : usd(0)}</td>
                      <td className="py-3 px-4 text-sm font-bold text-zinc-900 dark:text-white text-right">{usd(f.net)}</td>
                    </tr>
                  ))}
                  <tr className="bg-zinc-50 dark:bg-black/30 font-black">
                    <td className="py-3 px-4 text-sm text-zinc-900 dark:text-white">TOTAL</td>
                    <td className="py-3 px-4 text-sm text-[#b3ff6b] text-right">{usd(totals.income)}</td>
                    <td className="py-3 px-4 text-sm text-red-500 text-right">{totals.refundsTotal > 0 ? `-${usd(totals.refundsTotal)}` : usd(0)}</td>
                    <td className="py-3 px-4 text-sm text-zinc-900 dark:text-white text-right">{usd(totals.net)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Refunds Tab */}
      {tab === 'refunds' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Reembolsos procesados.</p>
            <QuieroButton variant="secondary" className="text-xs py-2 px-3 flex items-center gap-1.5"
              onClick={() => downloadCsv('reembolsos.csv', ['Orden', 'Cliente', 'Monto', 'Fecha', 'Admin'],
                refunds.map((r) => [r.orderId.slice(0, 8).toUpperCase(), r.customer, r.amount, new Date(r.refundedAt).toISOString(), r.adminEmail]))}>
              <Download className="h-3.5 w-3.5" /> Exportar CSV
            </QuieroButton>
          </div>
          {refunds.length === 0 ? (
            <div className={`${card} p-10 text-center text-sm text-zinc-500`}>No hay reembolsos registrados.</div>
          ) : (
            <div className={`${card} overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[640px]">
                  <thead><tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/30">
                    <th className={th}>Orden</th><th className={th}>Cliente</th><th className={`${th} text-right`}>Monto</th><th className={th}>Fecha</th><th className={th}>Admin</th>
                  </tr></thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                    {refunds.map((r) => (
                      <tr key={r.orderId} className="hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 font-bold text-sm text-[#9933c1] dark:text-[#b3ff6b]">#{r.orderId.slice(0, 8).toUpperCase()}</td>
                        <td className="py-3 px-4 text-sm text-zinc-700 dark:text-zinc-300">{r.customer}</td>
                        <td className="py-3 px-4 text-sm font-bold text-red-500 text-right">-{usd(r.amount)}</td>
                        <td className="py-3 px-4 text-sm text-zinc-500">{new Date(r.refundedAt).toLocaleDateString('es-AR')}</td>
                        <td className="py-3 px-4 text-sm text-zinc-700 dark:text-zinc-300">{r.adminEmail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Affiliates Tab — módulo no construido (Fase 7, standby) */}
      {tab === 'affiliates' && (
        <ComingSoon title="Reporte de afiliados" description="El módulo de afiliados todavía no está disponible. Cuando se active, vas a ver acá las ventas y comisiones por afiliado." />
      )}
    </div>
  );
}
