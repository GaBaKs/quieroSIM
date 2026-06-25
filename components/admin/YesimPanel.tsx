'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Wallet, CreditCard, Activity, ArrowUpRight, Zap, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function YesimPanel() {
  const [balance, setBalance] = useState(1250.45);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      // Simulate slight balance change for effect
      setBalance(1250.45 - (Math.random() * 5));
      setIsRefreshing(false);
    }, 800);
  };

  const handleCharge = () => {
    alert("Iniciando flujo de carga de saldo (Mock)");
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Main Balance Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-zinc-900 border-2 border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Wallet className="w-32 h-32 text-[#9933c1]" />
          </div>
          
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <Wallet className="w-4 h-4 text-[#9933c1]" />
              Saldo Actual YeSIM
            </h3>
            <button 
              onClick={handleRefresh}
              className={cn("text-zinc-400 hover:text-black dark:hover:text-white transition-colors", isRefreshing && "animate-spin text-[#9933c1]")}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          
          <div className="relative z-10">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black tracking-tight">${balance.toFixed(2)}</span>
              <span className="text-sm font-bold text-zinc-400">EUR</span>
            </div>
            
            <p className="text-xs text-emerald-500 font-medium mt-2 flex items-center gap-1">
              <Activity className="w-3 h-3" />
              Estado operativo: Conectado
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-black/5 dark:border-white/5 relative z-10">
            <button
              onClick={handleCharge}
              className="w-full flex items-center justify-center gap-2 bg-[#9933c1] hover:bg-[#8029a1] text-white py-2.5 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-[#9933c1]/20"
            >
              <CreditCard className="w-4 h-4" />
              Cargar Saldo
            </button>
          </div>
        </motion.div>

        {/* eSIMs Generated Metric */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-sm flex flex-col justify-between"
        >
          <div>
            <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-500" />
              eSIMs Generadas (Mes)
            </h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black tracking-tight">842</span>
            </div>
            <p className="text-xs text-zinc-500 font-medium mt-2">
              <span className="text-emerald-500 font-bold inline-flex items-center">
                <ArrowUpRight className="w-3 h-3 mr-0.5" /> +12%
              </span> vs mes anterior
            </p>
          </div>
        </motion.div>

        {/* API Latency / Usage Metric */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-sm flex flex-col justify-between"
        >
          <div>
            <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              Latencia API Promedio
            </h3>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black tracking-tight">234</span>
              <span className="text-sm font-bold text-zinc-400">ms</span>
            </div>
            <p className="text-xs text-zinc-500 font-medium mt-2">
              99.9% Uptime en las últimas 24hs
            </p>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
