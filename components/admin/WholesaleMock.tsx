'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Building2, Search, Filter, Settings, X, FileText, Smartphone, DollarSign, Package } from 'lucide-react';
import QuieroButton from '@/components/ui/QuieroButton';

type AgencyStatus = 'pending' | 'approved' | 'suspended';

interface Agency {
  id: string;
  name: string;
  email: string;
  status: AgencyStatus;
  totalOrders: number;
  totalAmount: number;
  customMargin: number;
}

const mockAgencies: Agency[] = [
  { id: 'AG-1001', name: 'Viajes Globales S.A.', email: 'admin@viajesglobales.com', status: 'approved', totalOrders: 14, totalAmount: 3450, customMargin: 15 },
  { id: 'AG-1002', name: 'Turismo Express', email: 'contacto@turismoexp.net', status: 'pending', totalOrders: 0, totalAmount: 0, customMargin: 20 },
  { id: 'AG-1003', name: 'Mundo Aventura', email: 'hola@mundoaventura.cl', status: 'suspended', totalOrders: 2, totalAmount: 450, customMargin: 20 },
  { id: 'AG-1004', name: 'Agencia de Viajes Sol', email: 'ventas@viajessol.es', status: 'approved', totalOrders: 42, totalAmount: 12500, customMargin: 12 },
];

export default function WholesaleMock() {
  const [filter, setFilter] = useState<AgencyStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);

  const filtered = mockAgencies.filter(a => {
    if (filter !== 'all' && a.status !== filter) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getStatusBadge = (status: AgencyStatus) => {
    switch (status) {
      case 'approved': return <span className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide bg-[#b3ff6b]/30 text-green-900 dark:bg-[#b3ff6b]/20 dark:text-[#b3ff6b]">Aprobado</span>;
      case 'pending': return <span className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">Pendiente</span>;
      case 'suspended': return <span className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">Suspendido</span>;
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-zinc-200 dark:border-white/10 flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#9933c1] dark:text-white"
            />
          </div>
          <div className="flex gap-2">
            <select 
              value={filter}
              onChange={e => setFilter(e.target.value as any)}
              className="px-4 py-2 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#9933c1] dark:text-white"
            >
              <option value="all">Todos los estados</option>
              <option value="approved">Aprobados</option>
              <option value="pending">Pendientes</option>
              <option value="suspended">Suspendidos</option>
            </select>
            <QuieroButton variant="primary" className="px-4 py-2 whitespace-nowrap">
              <span className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4" /> Invitar Agencia</span>
            </QuieroButton>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/30">
                <th className="py-3 px-5 text-xs font-bold text-zinc-500 uppercase tracking-wider">Empresa</th>
                <th className="py-3 px-5 text-xs font-bold text-zinc-500 uppercase tracking-wider">Estado</th>
                <th className="py-3 px-5 text-xs font-bold text-zinc-500 uppercase tracking-wider">Órdenes</th>
                <th className="py-3 px-5 text-xs font-bold text-zinc-500 uppercase tracking-wider">Monto Total</th>
                <th className="py-3 px-5 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
              {filtered.map(agency => (
                <tr key={agency.id} className="hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setSelectedAgency(agency)}>
                  <td className="py-3 px-5">
                    <p className="font-bold text-zinc-900 dark:text-white">{agency.name}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{agency.email}</p>
                  </td>
                  <td className="py-3 px-5">{getStatusBadge(agency.status)}</td>
                  <td className="py-3 px-5 text-sm font-mono text-zinc-700 dark:text-zinc-300">{agency.totalOrders} lotes</td>
                  <td className="py-3 px-5 text-sm font-bold text-zinc-900 dark:text-white">${agency.totalAmount.toLocaleString()}</td>
                  <td className="py-3 px-5 text-right">
                    <button className="text-sm font-bold text-[#9933c1] dark:text-[#b3ff6b] hover:underline">Ver detalle</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-500">No se encontraron agencias.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedAgency && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedAgency(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-white/10 flex flex-col">
              
              {/* Header */}
              <div className="p-6 sm:p-8 border-b border-zinc-200 dark:border-white/10 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white">{selectedAgency.name}</h2>
                    {getStatusBadge(selectedAgency.status)}
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400">{selectedAgency.email} • ID: {selectedAgency.id}</p>
                </div>
                <button onClick={() => setSelectedAgency(null)} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-full bg-zinc-100 dark:bg-white/5 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Col 1: Config */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-zinc-50 dark:bg-black/20 p-5 rounded-2xl border border-zinc-200 dark:border-white/10">
                    <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-white mb-4">
                      <Settings className="h-4 w-4 text-[#9933c1] dark:text-[#b3ff6b]" /> Configuración
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Margen Mayorista (%)</label>
                        <input type="number" defaultValue={selectedAgency.customMargin} className="w-full px-3 py-2 bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-lg text-sm focus:ring-2 focus:ring-[#9933c1] dark:text-white" />
                        <p className="text-[10px] text-zinc-400 mt-1">Sobreescribe el margen por defecto (20%)</p>
                      </div>
                      <div className="pt-2 flex flex-col gap-2">
                        {selectedAgency.status === 'pending' && <QuieroButton variant="primary" className="px-4 py-2 text-sm w-full">Aprobar Agencia</QuieroButton>}
                        {selectedAgency.status === 'approved' && <button className="px-4 py-2 text-sm font-bold text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors w-full">Suspender</button>}
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-50 dark:bg-black/20 p-5 rounded-2xl border border-zinc-200 dark:border-white/10">
                    <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-white mb-4">
                      <DollarSign className="h-4 w-4 text-[#9933c1] dark:text-[#b3ff6b]" /> Resumen Financiero
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Lotes comprados</span>
                        <span className="font-bold dark:text-white">{selectedAgency.totalOrders}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Monto total</span>
                        <span className="font-bold dark:text-white">${selectedAgency.totalAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Col 2: Lotes */}
                <div className="lg:col-span-2 space-y-4">
                  <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Package className="h-5 w-5 text-[#9933c1] dark:text-[#b3ff6b]" /> Últimos Lotes Comprados
                  </h3>
                  
                  {selectedAgency.totalOrders > 0 ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-xs font-bold text-[#9933c1] dark:text-[#b3ff6b]">LOTE-{9000 + i}</span>
                              <span className="text-xs text-zinc-500">• 12 Mar 2026</span>
                            </div>
                            <p className="font-bold text-sm text-zinc-900 dark:text-white">50x eSIM Europa 10GB</p>
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs font-bold">
                            <div className="flex flex-col items-center">
                              <span className="text-zinc-400 uppercase tracking-wider text-[9px]">Sin Asignar</span>
                              <span className="text-lg text-zinc-900 dark:text-white">12</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-amber-500 uppercase tracking-wider text-[9px]">Asignadas</span>
                              <span className="text-lg text-amber-500">8</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-green-500 uppercase tracking-wider text-[9px]">Activadas</span>
                              <span className="text-lg text-green-500">30</span>
                            </div>
                          </div>
                          
                          <button className="text-[#9933c1] dark:text-[#b3ff6b] p-2 hover:bg-[#9933c1]/10 dark:hover:bg-[#b3ff6b]/10 rounded-lg transition-colors">
                            <FileText className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-zinc-50 dark:bg-black/20 rounded-2xl border border-zinc-200 dark:border-white/10">
                      <Package className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
                      <p className="text-sm text-zinc-500">Esta agencia aún no ha comprado ningún lote de eSIMs.</p>
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
