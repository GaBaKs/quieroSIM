'use client';

import { BarChart3, TrendingUp, Users, ShoppingCart, Activity } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

export default function AdminDashboardPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const kpis = [
    { name: 'Ventas del día', value: '$1,200', change: '+12%', icon: ShoppingCart, trend: 'up' },
    { name: 'Ventas del mes', value: '$24,500', change: '+5%', icon: BarChart3, trend: 'up' },
    { name: 'Total Órdenes', value: '142', change: '+18%', icon: TrendingUp, trend: 'up' },
    { name: 'Ingresos Totales', value: '$142,000', change: '+2%', icon: Users, trend: 'up' },
  ];

  const topPlans = [
    { id: 1, name: 'Europa 50GB', region: 'Europa', sales: 450, revenue: '$13,500' },
    { id: 2, name: 'Global 10GB', region: 'Global', sales: 320, revenue: '$11,200' },
    { id: 3, name: 'USA Ilimitado', region: 'Estados Unidos', sales: 280, revenue: '$9,800' },
    { id: 4, name: 'Latam 5GB', region: 'Latinoamérica', sales: 150, revenue: '$3,000' },
    { id: 5, name: 'Japón 10GB', region: 'Asia', sales: 90, revenue: '$1,800' },
  ];

  const systemStatus = [
    { service: 'YeSim API', status: 'operational' },
    { service: 'Stripe', status: 'operational' },
    { service: 'WhatsApp API', status: 'operational' },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white mb-2 transition-colors">Dashboard</h1>
        <p className="text-zinc-500 dark:text-zinc-400 transition-colors">Resumen del estado del negocio en tiempo real.</p>
      </div>

      {mounted && (
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {kpis.map((kpi) => (
            <motion.div 
              variants={item}
              key={kpi.name} 
              className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-white/10 relative overflow-hidden group hover:border-[#9933c1]/50 dark:hover:border-[#9933c1]/50 transition-colors shadow-sm dark:shadow-none"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors">{kpi.name}</h3>
                <div className="p-2 bg-black/5 dark:bg-white/5 rounded-lg group-hover:bg-[#9933c1]/10 dark:group-hover:bg-[#9933c1]/20 transition-colors">
                  <kpi.icon className="h-5 w-5 text-zinc-400 group-hover:text-[#9933c1] transition-colors" />
                </div>
              </div>
              <p className="text-3xl font-black text-zinc-900 dark:text-white transition-colors">{kpi.value}</p>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-xs font-black text-[#9933c1] dark:text-[#18181b] bg-[#9933c1]/10 dark:bg-[#b3ff6b] px-2 py-0.5 rounded uppercase tracking-widest transition-colors">
                  {kpi.change}
                </span>
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-500">vs período anterior</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        
        {/* Gráfico de Ventas */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="col-span-1 lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-white/10 shadow-sm dark:shadow-none transition-colors"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Ventas (Últimos 30 días)</h2>
            <select className="bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-white/10 text-sm rounded-lg px-3 py-1.5 text-zinc-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-[#9933c1] transition-all">
              <option>Últimos 30 días</option>
              <option>Últimos 7 días</option>
            </select>
          </div>
          
          <div className="relative h-64 w-full flex items-end">
            <svg viewBox="0 0 800 200" className="w-full h-full preserve-aspect-ratio-none">
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9933c1" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#9933c1" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path 
                d="M0,200 L0,150 C50,150 80,100 150,110 C220,120 250,50 320,60 C390,70 420,130 500,120 C580,110 620,30 700,40 C750,45 780,90 800,80 L800,200 Z" 
                fill="url(#gradient)"
              />
              <path 
                d="M0,150 C50,150 80,100 150,110 C220,120 250,50 320,60 C390,70 420,130 500,120 C580,110 620,30 700,40 C750,45 780,90 800,80" 
                fill="none" 
                stroke="#9933c1" 
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <g className="stroke-zinc-200 dark:stroke-white/5" strokeWidth="1" strokeDasharray="4 4">
                <line x1="0" y1="50" x2="800" y2="50" />
                <line x1="0" y1="100" x2="800" y2="100" />
                <line x1="0" y1="150" x2="800" y2="150" />
              </g>
            </svg>
          </div>
        </motion.div>

        {/* Estado del sistema */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-white/10 shadow-sm dark:shadow-none transition-colors"
        >
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-zinc-500" />
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Estado del Sistema</h2>
          </div>
          
          <div className="space-y-4">
            {systemStatus.map((sys) => (
              <div key={sys.service} className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-black/30 border border-zinc-100 dark:border-white/5 transition-colors">
                <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{sys.service}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#9933c1] dark:text-[#b3ff6b] tracking-wider uppercase">Operativo</span>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#9933c1] dark:bg-[#b3ff6b] animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

      </div>

      {/* Planes Más Vendidos */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-white/10 shadow-sm dark:shadow-none transition-colors mt-8 overflow-hidden"
      >
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-6">Planes más vendidos</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-white/10">
                <th className="pb-3 text-xs font-bold text-zinc-500 uppercase tracking-wider px-4">Ranking</th>
                <th className="pb-3 text-xs font-bold text-zinc-500 uppercase tracking-wider px-4">Plan</th>
                <th className="pb-3 text-xs font-bold text-zinc-500 uppercase tracking-wider px-4">Región</th>
                <th className="pb-3 text-xs font-bold text-zinc-500 uppercase tracking-wider px-4">Unidades</th>
                <th className="pb-3 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right px-4">Ingresos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
              {topPlans.map((plan, i) => (
                <tr key={plan.id} className="hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors group">
                  <td className="py-4 px-4">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#9933c1]/10 text-[#9933c1] dark:bg-[#b3ff6b]/20 dark:text-[#b3ff6b] text-xs font-black group-hover:scale-110 transition-transform">
                      {i + 1}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-bold text-zinc-900 dark:text-zinc-100">{plan.name}</td>
                  <td className="py-4 px-4 text-sm text-zinc-500 dark:text-zinc-400">{plan.region}</td>
                  <td className="py-4 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">{plan.sales}</td>
                  <td className="py-4 px-4 text-sm font-black text-zinc-900 dark:text-white text-right">{plan.revenue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
