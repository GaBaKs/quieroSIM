'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2,
  Search,
  Package,
  DollarSign,
  TrendingUp,
  Eye,
  X,
  ShieldCheck,
  ShieldOff,
  Boxes,
  FileText,
} from 'lucide-react';
import QuieroButton from '@/components/ui/QuieroButton';
import StatusBadge from '@/components/admin/StatusBadge';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { usd, shortDate } from '@/components/admin/format';

// ─── Mock data ──────────────────────────────────────────────────────────────

type AgencyStatus = 'active' | 'pending' | 'suspended';

interface MockEsimLot {
  iccid: string;
  plan: string;
  status: 'unassigned' | 'assigned' | 'activated';
  assignedTo: string | null;
}

interface MockAgencyOrder {
  id: string;
  date: string;
  qty: number;
  total: number;
  esims: MockEsimLot[];
}

interface MockAgency {
  id: string;
  companyName: string;
  email: string;
  taxId: string;
  billingAddress: string;
  status: AgencyStatus;
  totalOrders: number;
  totalSpent: number;
  wholesaleMargin: number;
  approvedAt: string | null;
  createdAt: string;
  orders: MockAgencyOrder[];
}

const MOCK_AGENCIES: MockAgency[] = [
  {
    id: 'ag-001',
    companyName: 'Viajes Premier SRL',
    email: 'compras@viajespremier.com',
    taxId: '30-71234567-9',
    billingAddress: 'Av. Corrientes 1234, CABA, Argentina',
    status: 'active',
    totalOrders: 28,
    totalSpent: 12450.00,
    wholesaleMargin: 12,
    approvedAt: '2026-01-20T10:00:00Z',
    createdAt: '2026-01-15T08:00:00Z',
    orders: [
      {
        id: 'WO-001', date: '2026-06-15T10:00:00Z', qty: 10, total: 189.90,
        esims: [
          { iccid: '8934...0001', plan: 'Europa 10GB', status: 'activated', assignedTo: 'cliente1@gmail.com' },
          { iccid: '8934...0002', plan: 'Europa 10GB', status: 'assigned', assignedTo: 'cliente2@gmail.com' },
          { iccid: '8934...0003', plan: 'Europa 10GB', status: 'unassigned', assignedTo: null },
        ],
      },
      {
        id: 'WO-002', date: '2026-06-10T14:00:00Z', qty: 5, total: 99.95,
        esims: [
          { iccid: '8934...0004', plan: 'USA 5GB', status: 'activated', assignedTo: 'turista@yahoo.com' },
          { iccid: '8934...0005', plan: 'USA 5GB', status: 'unassigned', assignedTo: null },
        ],
      },
    ],
  },
  {
    id: 'ag-002',
    companyName: 'TurboTravel Agency',
    email: 'ops@turbotravel.com',
    taxId: '20-65432198-7',
    billingAddress: 'Calle Falsa 456, Córdoba, Argentina',
    status: 'active',
    totalOrders: 45,
    totalSpent: 23100.00,
    wholesaleMargin: 15,
    approvedAt: '2025-11-10T12:00:00Z',
    createdAt: '2025-11-05T09:00:00Z',
    orders: [
      {
        id: 'WO-003', date: '2026-06-16T09:00:00Z', qty: 20, total: 399.80,
        esims: [
          { iccid: '8934...0010', plan: 'Brasil 10GB', status: 'unassigned', assignedTo: null },
          { iccid: '8934...0011', plan: 'Brasil 10GB', status: 'unassigned', assignedTo: null },
        ],
      },
    ],
  },
  {
    id: 'ag-003',
    companyName: 'Conecta Global SAS',
    email: 'admin@conectaglobal.co',
    taxId: '900.123.456-7',
    billingAddress: 'Carrera 7 #123, Bogotá, Colombia',
    status: 'pending',
    totalOrders: 0,
    totalSpent: 0,
    wholesaleMargin: 10,
    approvedAt: null,
    createdAt: '2026-06-17T15:00:00Z',
    orders: [],
  },
  {
    id: 'ag-004',
    companyName: 'Explora Tours Ltda',
    email: 'ventas@exploratours.cl',
    taxId: '76.543.210-K',
    billingAddress: 'Av. Providencia 2000, Santiago, Chile',
    status: 'suspended',
    totalOrders: 3,
    totalSpent: 890.00,
    wholesaleMargin: 10,
    approvedAt: '2026-03-01T10:00:00Z',
    createdAt: '2026-02-25T11:00:00Z',
    orders: [],
  },
];

const esimStatusLabel: Record<string, { label: string; cls: string }> = {
  unassigned: { label: 'Sin asignar', cls: 'bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300' },
  assigned: { label: 'Asignada', cls: 'bg-blue-50 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300' },
  activated: { label: 'Activada', cls: 'bg-[#b3ff6b]/30 text-green-900 dark:bg-[#b3ff6b]/20 dark:text-[#b3ff6b]' },
};

export default function WholesaleView() {
  const [filterStatus, setFilterStatus] = useState<'all' | AgencyStatus>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<MockAgency | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ agency: MockAgency; action: 'approve' | 'suspend' } | null>(null);

  const filtered = useMemo(() => {
    return MOCK_AGENCIES.filter((a) => {
      if (filterStatus !== 'all' && a.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return a.companyName.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
      }
      return true;
    });
  }, [filterStatus, search]);

  const totals = useMemo(() => ({
    active: MOCK_AGENCIES.filter((a) => a.status === 'active').length,
    pending: MOCK_AGENCIES.filter((a) => a.status === 'pending').length,
    totalOrders: MOCK_AGENCIES.reduce((s, a) => s + a.totalOrders, 0),
    totalRevenue: MOCK_AGENCIES.reduce((s, a) => s + a.totalSpent, 0),
  }), []);

  const statusFilters: { label: string; value: 'all' | AgencyStatus }[] = [
    { label: 'Todas', value: 'all' },
    { label: 'Aprobadas', value: 'active' },
    { label: 'Pendientes', value: 'pending' },
    { label: 'Suspendidas', value: 'suspended' },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Agencias activas', value: String(totals.active), icon: Building2, color: 'text-[#b3ff6b]' },
          { label: 'Pendientes', value: String(totals.pending), icon: Package, color: 'text-yellow-400' },
          { label: 'Órdenes mayoristas', value: String(totals.totalOrders), icon: Boxes, color: 'text-[#9933c1]' },
          { label: 'Ingresos mayoristas', value: usd(totals.totalRevenue), icon: DollarSign, color: 'text-orange-400' },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 p-5 flex items-start gap-4"
          >
            <div className={`p-2.5 rounded-xl bg-black/5 dark:bg-white/5 ${kpi.color}`}>
              <kpi.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{kpi.label}</p>
              <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight mt-0.5">{kpi.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por empresa o email..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#9933c1]/30 focus:border-[#9933c1] transition-all"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilterStatus(f.value)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                filterStatus === f.value
                  ? 'bg-[#9933c1] text-white border-[#9933c1]'
                  : 'bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/5'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/30">
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Empresa</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Email</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Estado</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Órdenes</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Monto total</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-zinc-400 text-sm">No se encontraron agencias.</td></tr>
              ) : (
                filtered.map((ag) => (
                  <tr key={ag.id} className="hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-bold text-sm text-zinc-900 dark:text-white">{ag.companyName}</p>
                      <p className="text-[11px] text-zinc-400">CUIT: {ag.taxId}</p>
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-700 dark:text-zinc-300">{ag.email}</td>
                    <td className="py-3 px-4"><StatusBadge kind="agency" value={ag.status} /></td>
                    <td className="py-3 px-4 text-sm font-bold text-zinc-900 dark:text-white text-right">{ag.totalOrders}</td>
                    <td className="py-3 px-4 text-sm font-bold text-[#b3ff6b] text-right">{usd(ag.totalSpent)}</td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => setSelected(ag)} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-500 hover:text-[#9933c1] dark:hover:text-[#b3ff6b] transition-colors cursor-pointer">
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Drawer */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/50 dark:bg-black/70 backdrop-blur-sm" onClick={() => setSelected(null)} />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-white/10 shadow-2xl overflow-y-auto"
            >
              <div className="p-6 space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">{selected.companyName}</h2>
                    <p className="text-sm text-zinc-500 mt-0.5">{selected.email}</p>
                  </div>
                  <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-400 transition-colors cursor-pointer"><X className="h-5 w-5" /></button>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge kind="agency" value={selected.status} />
                  <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#9933c1]/10 text-[#9933c1] dark:bg-[#9933c1]/20 dark:text-[#b3ff6b]">
                    Margen {selected.wholesaleMargin}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'CUIT / Tax ID', value: selected.taxId },
                    { label: 'Dirección', value: selected.billingAddress },
                    { label: 'Alta', value: shortDate(selected.createdAt) },
                    { label: 'Aprobación', value: selected.approvedAt ? shortDate(selected.approvedAt) : '—' },
                  ].map((f) => (
                    <div key={f.label} className="bg-zinc-50 dark:bg-white/5 rounded-xl p-3.5 border border-zinc-200 dark:border-white/10">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{f.label}</p>
                      <p className="text-sm font-bold text-zinc-900 dark:text-white">{f.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-zinc-50 dark:bg-white/5 rounded-xl p-3.5 border border-zinc-200 dark:border-white/10 text-center">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Órdenes</p>
                    <p className="text-xl font-black text-zinc-900 dark:text-white">{selected.totalOrders}</p>
                  </div>
                  <div className="bg-zinc-50 dark:bg-white/5 rounded-xl p-3.5 border border-zinc-200 dark:border-white/10 text-center">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Gastado</p>
                    <p className="text-xl font-black text-[#b3ff6b]">{usd(selected.totalSpent)}</p>
                  </div>
                  <div className="bg-zinc-50 dark:bg-white/5 rounded-xl p-3.5 border border-zinc-200 dark:border-white/10 text-center">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Margen</p>
                    <p className="text-xl font-black text-[#9933c1] dark:text-[#b3ff6b]">{selected.wholesaleMargin}%</p>
                  </div>
                </div>

                {/* Orders with eSIM lots */}
                {selected.orders.length > 0 && (
                  <div>
                    <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider mb-3">Compras en lote</h3>
                    <div className="space-y-3">
                      {selected.orders.map((o) => (
                        <div key={o.id} className="bg-zinc-50 dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-white/10 p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-sm text-[#9933c1] dark:text-[#b3ff6b]">#{o.id}</span>
                              <span className="text-xs text-zinc-500">{shortDate(o.date)}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold text-zinc-900 dark:text-white">{o.qty} eSIMs</span>
                              <span className="text-xs text-zinc-500 ml-2">{usd(o.total)}</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {o.esims.map((e) => {
                              const st = esimStatusLabel[e.status];
                              return (
                                <span key={e.iccid} className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold ${st.cls}`}>
                                  {e.iccid} · {st.label}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-2 border-t border-zinc-200 dark:border-white/10">
                  {selected.status === 'pending' && (
                    <QuieroButton variant="primary" className="w-full py-3 text-sm flex items-center justify-center gap-2" onClick={() => setConfirmAction({ agency: selected, action: 'approve' })}>
                      <ShieldCheck className="h-4 w-4" /> Aprobar agencia
                    </QuieroButton>
                  )}
                  {selected.status === 'active' && (
                    <QuieroButton variant="secondary" className="w-full py-3 text-sm flex items-center justify-center gap-2 !bg-red-50 dark:!bg-red-400/10 !text-red-500 !border-red-200 dark:!border-red-400/20" onClick={() => setConfirmAction({ agency: selected, action: 'suspend' })}>
                      <ShieldOff className="h-4 w-4" /> Suspender agencia
                    </QuieroButton>
                  )}
                  {selected.status === 'suspended' && (
                    <QuieroButton variant="primary" className="w-full py-3 text-sm flex items-center justify-center gap-2" onClick={() => setConfirmAction({ agency: selected, action: 'approve' })}>
                      <ShieldCheck className="h-4 w-4" /> Reactivar agencia
                    </QuieroButton>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.action === 'approve' ? '¿Aprobar agencia?' : '¿Suspender agencia?'}
        description={confirmAction?.action === 'approve' ? `${confirmAction.agency.companyName} será aprobada y podrá realizar compras mayoristas.` : `${confirmAction?.agency.companyName} será suspendida.`}
        confirmLabel={confirmAction?.action === 'suspend' ? 'Suspender' : 'Confirmar'}
        tone={confirmAction?.action === 'suspend' ? 'danger' : 'violet'}
        onConfirm={async () => { setConfirmAction(null); return { ok: true }; }}
        onClose={() => setConfirmAction(null)}
      />
    </div>
  );
}
