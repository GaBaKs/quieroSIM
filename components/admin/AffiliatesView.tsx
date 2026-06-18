'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Network,
  Search,
  Users,
  DollarSign,
  TrendingUp,
  Eye,
  Copy,
  Check,
  ChevronDown,
  ExternalLink,
  X,
  ShieldCheck,
  ShieldOff,
  Banknote,
  Link2,
  Instagram,
  Youtube,
  Globe,
  ArrowRight,
} from 'lucide-react';
import QuieroButton from '@/components/ui/QuieroButton';
import StatusBadge from '@/components/admin/StatusBadge';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { usd, shortDate } from '@/components/admin/format';

// ─── Mock data ──────────────────────────────────────────────────────────────

type AffiliateStatus = 'pending' | 'active' | 'suspended';

interface MockAffiliate {
  id: string;
  name: string;
  email: string;
  channel: string;
  channelIcon: 'instagram' | 'youtube' | 'blog' | 'agency';
  estimatedAudience: number;
  referralLink: string;
  couponCode: string;
  status: AffiliateStatus;
  totalSales: number;
  commissionPending: number;
  commissionPaid: number;
  level: 1 | 2;
  referredBy: string | null;
  termsAccepted: boolean;
  termsAcceptedAt: string | null;
  createdAt: string;
  sales: MockSale[];
}

interface MockSale {
  orderId: string;
  customer: string;
  plan: string;
  amount: number;
  commission: number;
  level: 1 | 2;
  date: string;
}

const MOCK_AFFILIATES: MockAffiliate[] = [
  {
    id: 'aff-001',
    name: 'Martina López',
    email: 'martina@viajera.com',
    channel: '@martina.viaja',
    channelIcon: 'instagram',
    estimatedAudience: 125000,
    referralLink: 'https://quierosim.com/ref/martina',
    couponCode: 'MARTINA10',
    status: 'active',
    totalSales: 87,
    commissionPending: 234.50,
    commissionPaid: 1890.00,
    level: 1,
    referredBy: null,
    termsAccepted: true,
    termsAcceptedAt: '2026-01-15T10:00:00Z',
    createdAt: '2026-01-10T08:30:00Z',
    sales: [
      { orderId: 'ORD-8a2f', customer: 'lucas@gmail.com', plan: 'Europa 10GB', amount: 29.99, commission: 4.50, level: 1, date: '2026-06-15T14:00:00Z' },
      { orderId: 'ORD-9c3d', customer: 'ana@hotmail.com', plan: 'USA 5GB', amount: 19.99, commission: 3.00, level: 1, date: '2026-06-14T09:30:00Z' },
      { orderId: 'ORD-7b1e', customer: 'pedro@yahoo.com', plan: 'Brasil 3GB', amount: 14.99, commission: 2.25, level: 1, date: '2026-06-12T18:00:00Z' },
      { orderId: 'ORD-6a0f', customer: 'sofia@gmail.com', plan: 'Japón 10GB', amount: 34.99, commission: 5.25, level: 1, date: '2026-06-10T11:00:00Z' },
    ],
  },
  {
    id: 'aff-002',
    name: 'Diego Fernández',
    email: 'diego@travelchannel.com',
    channel: 'TravelDiego',
    channelIcon: 'youtube',
    estimatedAudience: 340000,
    referralLink: 'https://quierosim.com/ref/diego',
    couponCode: 'DIEGO15',
    status: 'active',
    totalSales: 215,
    commissionPending: 567.80,
    commissionPaid: 4320.00,
    level: 1,
    referredBy: null,
    termsAccepted: true,
    termsAcceptedAt: '2025-11-20T14:00:00Z',
    createdAt: '2025-11-18T12:00:00Z',
    sales: [
      { orderId: 'ORD-5d2a', customer: 'maria@gmail.com', plan: 'Europa 20GB', amount: 44.99, commission: 6.75, level: 1, date: '2026-06-16T10:00:00Z' },
      { orderId: 'ORD-4c1b', customer: 'jorge@outlook.com', plan: 'USA Ilimitado', amount: 49.99, commission: 7.50, level: 1, date: '2026-06-15T16:30:00Z' },
    ],
  },
  {
    id: 'aff-003',
    name: 'Camila Torres',
    email: 'camila@blogviajero.ar',
    channel: 'blogviajero.ar',
    channelIcon: 'blog',
    estimatedAudience: 45000,
    referralLink: 'https://quierosim.com/ref/camila',
    couponCode: 'CAMILA10',
    status: 'pending',
    totalSales: 0,
    commissionPending: 0,
    commissionPaid: 0,
    level: 1,
    referredBy: null,
    termsAccepted: true,
    termsAcceptedAt: '2026-06-17T09:00:00Z',
    createdAt: '2026-06-17T08:45:00Z',
    sales: [],
  },
  {
    id: 'aff-004',
    name: 'Roberto Méndez',
    email: 'roberto@turismoplus.com',
    channel: 'Turismo Plus Agency',
    channelIcon: 'agency',
    estimatedAudience: 8000,
    referralLink: 'https://quierosim.com/ref/roberto',
    couponCode: 'TURISMO5',
    status: 'suspended',
    totalSales: 12,
    commissionPending: 0,
    commissionPaid: 156.00,
    level: 1,
    referredBy: null,
    termsAccepted: true,
    termsAcceptedAt: '2026-03-01T10:00:00Z',
    createdAt: '2026-02-28T15:00:00Z',
    sales: [],
  },
  {
    id: 'aff-005',
    name: 'Valentina Ruiz',
    email: 'vale@mochilera.com',
    channel: '@vale.mochilera',
    channelIcon: 'instagram',
    estimatedAudience: 67000,
    referralLink: 'https://quierosim.com/ref/vale',
    couponCode: 'VALE10',
    status: 'active',
    totalSales: 43,
    commissionPending: 112.30,
    commissionPaid: 645.00,
    level: 2,
    referredBy: 'Martina López',
    termsAccepted: true,
    termsAcceptedAt: '2026-02-20T10:00:00Z',
    createdAt: '2026-02-18T09:00:00Z',
    sales: [
      { orderId: 'ORD-3b0c', customer: 'elena@gmail.com', plan: 'México 5GB', amount: 17.99, commission: 1.80, level: 2, date: '2026-06-13T12:00:00Z' },
    ],
  },
];

// ─── Component ──────────────────────────────────────────────────────────────

const channelIcons = {
  instagram: Instagram,
  youtube: Youtube,
  blog: Globe,
  agency: Users,
};

function formatAudience(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export default function AffiliatesView() {
  const [filterStatus, setFilterStatus] = useState<'all' | AffiliateStatus>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<MockAffiliate | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ affiliate: MockAffiliate; action: 'approve' | 'suspend' | 'pay' } | null>(null);

  const filtered = useMemo(() => {
    return MOCK_AFFILIATES.filter((a) => {
      if (filterStatus !== 'all' && a.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || a.couponCode.toLowerCase().includes(q);
      }
      return true;
    });
  }, [filterStatus, search]);

  const totals = useMemo(() => {
    const active = MOCK_AFFILIATES.filter((a) => a.status === 'active').length;
    const pending = MOCK_AFFILIATES.filter((a) => a.status === 'pending').length;
    const totalSales = MOCK_AFFILIATES.reduce((s, a) => s + a.totalSales, 0);
    const totalPending = MOCK_AFFILIATES.reduce((s, a) => s + a.commissionPending, 0);
    return { active, pending, totalSales, totalPending };
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleConfirm = () => {
    // Mock action - in production this would call the server
    setConfirmAction(null);
  };

  const statusFilters: { label: string; value: 'all' | AffiliateStatus }[] = [
    { label: 'Todos', value: 'all' },
    { label: 'Activos', value: 'active' },
    { label: 'Pendientes', value: 'pending' },
    { label: 'Suspendidos', value: 'suspended' },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Afiliados activos', value: String(totals.active), icon: Users, color: 'text-[#b3ff6b]' },
          { label: 'Pendientes aprobación', value: String(totals.pending), icon: Network, color: 'text-yellow-400' },
          { label: 'Ventas referidas', value: String(totals.totalSales), icon: TrendingUp, color: 'text-[#9933c1]' },
          { label: 'Comisiones pendientes', value: usd(totals.totalPending), icon: DollarSign, color: 'text-orange-400' },
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
            placeholder="Buscar por nombre, email o cupón..."
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
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/30">
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Afiliado</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Canal</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Audiencia</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Estado</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Nivel</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Ventas</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Pendiente</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Pagado</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-zinc-400 text-sm">
                    No se encontraron afiliados.
                  </td>
                </tr>
              ) : (
                filtered.map((aff) => {
                  const ChannelIcon = channelIcons[aff.channelIcon];
                  return (
                    <tr key={aff.id} className="hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-bold text-sm text-zinc-900 dark:text-white">{aff.name}</p>
                          <p className="text-xs text-zinc-500">{aff.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                          <ChannelIcon className="h-4 w-4 text-zinc-400" />
                          <span className="truncate max-w-[140px]">{aff.channel}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm font-bold text-zinc-900 dark:text-white">
                        {formatAudience(aff.estimatedAudience)}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge kind="affiliate" value={aff.status} />
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-black px-2 py-1 rounded-lg ${
                          aff.level === 1
                            ? 'bg-[#9933c1]/10 text-[#9933c1] dark:bg-[#9933c1]/20 dark:text-[#b3ff6b]'
                            : 'bg-zinc-100 dark:bg-white/5 text-zinc-500'
                        }`}>
                          Nivel {aff.level}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm font-bold text-zinc-900 dark:text-white text-right">{aff.totalSales}</td>
                      <td className="py-3 px-4 text-sm font-bold text-orange-500 text-right">{usd(aff.commissionPending)}</td>
                      <td className="py-3 px-4 text-sm font-bold text-[#b3ff6b] text-right">{usd(aff.commissionPaid)}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelected(aff)}
                          className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-500 hover:text-[#9933c1] dark:hover:text-[#b3ff6b] transition-colors cursor-pointer"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Detail Drawer ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
              onClick={() => setSelected(null)}
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-white/10 shadow-2xl overflow-y-auto"
            >
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">{selected.name}</h2>
                    <p className="text-sm text-zinc-500 mt-0.5">{selected.email}</p>
                  </div>
                  <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-400 transition-colors cursor-pointer">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Status + Level */}
                <div className="flex items-center gap-3 flex-wrap">
                  <StatusBadge kind="affiliate" value={selected.status} />
                  <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                    selected.level === 1
                      ? 'bg-[#9933c1]/10 text-[#9933c1] dark:bg-[#9933c1]/20 dark:text-[#b3ff6b]'
                      : 'bg-zinc-100 dark:bg-white/5 text-zinc-500'
                  }`}>
                    Nivel {selected.level}
                  </span>
                  {selected.referredBy && (
                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                      <ArrowRight className="h-3 w-3" /> Referido por <strong className="text-zinc-700 dark:text-zinc-300">{selected.referredBy}</strong>
                    </span>
                  )}
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-50 dark:bg-white/5 rounded-xl p-3.5 border border-zinc-200 dark:border-white/10">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Canal</p>
                    <div className="flex items-center gap-2">
                      {(() => { const I = channelIcons[selected.channelIcon]; return <I className="h-4 w-4 text-zinc-500" />; })()}
                      <p className="text-sm font-bold text-zinc-900 dark:text-white">{selected.channel}</p>
                    </div>
                  </div>
                  <div className="bg-zinc-50 dark:bg-white/5 rounded-xl p-3.5 border border-zinc-200 dark:border-white/10">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Audiencia</p>
                    <p className="text-sm font-bold text-zinc-900 dark:text-white">{formatAudience(selected.estimatedAudience)} seguidores</p>
                  </div>
                  <div className="bg-zinc-50 dark:bg-white/5 rounded-xl p-3.5 border border-zinc-200 dark:border-white/10">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Registro</p>
                    <p className="text-sm font-bold text-zinc-900 dark:text-white">{shortDate(selected.createdAt)}</p>
                  </div>
                  <div className="bg-zinc-50 dark:bg-white/5 rounded-xl p-3.5 border border-zinc-200 dark:border-white/10">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">T&C Aceptados</p>
                    <p className="text-sm font-bold text-zinc-900 dark:text-white">{selected.termsAccepted ? '✅ Sí' : '❌ No'}</p>
                  </div>
                </div>

                {/* Referral Link + Coupon */}
                <div className="space-y-3">
                  <div className="bg-zinc-50 dark:bg-white/5 rounded-xl p-3.5 border border-zinc-200 dark:border-white/10">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Link2 className="h-3 w-3" /> Link de referido
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-white dark:bg-black/30 rounded-lg px-3 py-2 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/10 truncate">
                        {selected.referralLink}
                      </code>
                      <button
                        onClick={() => handleCopy(selected.referralLink, 'link')}
                        className="p-2 rounded-lg bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10 hover:border-[#9933c1] text-zinc-500 hover:text-[#9933c1] transition-all cursor-pointer"
                      >
                        {copied === 'link' ? <Check className="h-4 w-4 text-[#b3ff6b]" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="bg-zinc-50 dark:bg-white/5 rounded-xl p-3.5 border border-zinc-200 dark:border-white/10">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Código de cupón</p>
                    <div className="flex items-center gap-2">
                      <span className="flex-1 text-lg font-black text-[#9933c1] dark:text-[#b3ff6b] tracking-widest">{selected.couponCode}</span>
                      <button
                        onClick={() => handleCopy(selected.couponCode, 'coupon')}
                        className="p-2 rounded-lg bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10 hover:border-[#9933c1] text-zinc-500 hover:text-[#9933c1] transition-all cursor-pointer"
                      >
                        {copied === 'coupon' ? <Check className="h-4 w-4 text-[#b3ff6b]" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Commission Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-zinc-50 dark:bg-white/5 rounded-xl p-3.5 border border-zinc-200 dark:border-white/10 text-center">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Ventas</p>
                    <p className="text-xl font-black text-zinc-900 dark:text-white">{selected.totalSales}</p>
                  </div>
                  <div className="bg-zinc-50 dark:bg-white/5 rounded-xl p-3.5 border border-zinc-200 dark:border-white/10 text-center">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Pendiente</p>
                    <p className="text-xl font-black text-orange-500">{usd(selected.commissionPending)}</p>
                  </div>
                  <div className="bg-zinc-50 dark:bg-white/5 rounded-xl p-3.5 border border-zinc-200 dark:border-white/10 text-center">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Pagado</p>
                    <p className="text-xl font-black text-[#b3ff6b]">{usd(selected.commissionPaid)}</p>
                  </div>
                </div>

                {/* Sales Table */}
                {selected.sales.length > 0 && (
                  <div>
                    <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider mb-3">Ventas referidas</h3>
                    <div className="bg-zinc-50 dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-white/10 overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-zinc-200 dark:border-white/10">
                            <th className="py-2.5 px-3 font-bold text-zinc-500 uppercase tracking-wider">Orden</th>
                            <th className="py-2.5 px-3 font-bold text-zinc-500 uppercase tracking-wider">Plan</th>
                            <th className="py-2.5 px-3 font-bold text-zinc-500 uppercase tracking-wider text-right">Monto</th>
                            <th className="py-2.5 px-3 font-bold text-zinc-500 uppercase tracking-wider text-right">Comisión</th>
                            <th className="py-2.5 px-3 font-bold text-zinc-500 uppercase tracking-wider">Fecha</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                          {selected.sales.map((s) => (
                            <tr key={s.orderId}>
                              <td className="py-2 px-3 font-bold text-[#9933c1] dark:text-[#b3ff6b]">#{s.orderId.slice(-4)}</td>
                              <td className="py-2 px-3 text-zinc-700 dark:text-zinc-300">{s.plan}</td>
                              <td className="py-2 px-3 text-zinc-900 dark:text-white font-bold text-right">{usd(s.amount)}</td>
                              <td className="py-2 px-3 text-[#b3ff6b] font-bold text-right">{usd(s.commission)}</td>
                              <td className="py-2 px-3 text-zinc-500">{shortDate(s.date)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-2 border-t border-zinc-200 dark:border-white/10">
                  {selected.status === 'pending' && (
                    <QuieroButton
                      variant="primary"
                      className="w-full py-3 text-sm flex items-center justify-center gap-2"
                      onClick={() => setConfirmAction({ affiliate: selected, action: 'approve' })}
                    >
                      <ShieldCheck className="h-4 w-4" /> Aprobar afiliado
                    </QuieroButton>
                  )}
                  {selected.status === 'active' && (
                    <>
                      {selected.commissionPending > 0 && (
                        <QuieroButton
                          variant="primary"
                          className="w-full py-3 text-sm flex items-center justify-center gap-2"
                          onClick={() => setConfirmAction({ affiliate: selected, action: 'pay' })}
                        >
                          <Banknote className="h-4 w-4" /> Marcar comisión como pagada ({usd(selected.commissionPending)})
                        </QuieroButton>
                      )}
                      <QuieroButton
                        variant="secondary"
                        className="w-full py-3 text-sm flex items-center justify-center gap-2 !bg-red-50 dark:!bg-red-400/10 !text-red-500 !border-red-200 dark:!border-red-400/20 hover:!bg-red-100 dark:hover:!bg-red-400/20"
                        onClick={() => setConfirmAction({ affiliate: selected, action: 'suspend' })}
                      >
                        <ShieldOff className="h-4 w-4" /> Suspender afiliado
                      </QuieroButton>
                    </>
                  )}
                  {selected.status === 'suspended' && (
                    <QuieroButton
                      variant="primary"
                      className="w-full py-3 text-sm flex items-center justify-center gap-2"
                      onClick={() => setConfirmAction({ affiliate: selected, action: 'approve' })}
                    >
                      <ShieldCheck className="h-4 w-4" /> Reactivar afiliado
                    </QuieroButton>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={!!confirmAction}
        title={
          confirmAction?.action === 'approve' ? '¿Aprobar afiliado?'
            : confirmAction?.action === 'suspend' ? '¿Suspender afiliado?'
            : '¿Marcar comisión como pagada?'
        }
        description={
          confirmAction?.action === 'approve'
            ? `${confirmAction.affiliate.name} pasará a estado Activo y podrá generar comisiones.`
            : confirmAction?.action === 'suspend'
            ? `${confirmAction.affiliate.name} será suspendido y no recibirá nuevas comisiones.`
            : `Se registrará el pago de ${usd(confirmAction?.affiliate.commissionPending ?? 0)} a ${confirmAction?.affiliate.name}.`
        }
        confirmLabel={confirmAction?.action === 'suspend' ? 'Suspender' : 'Confirmar'}
        tone={confirmAction?.action === 'suspend' ? 'danger' : 'violet'}
        onConfirm={async () => { handleConfirm(); return { ok: true }; }}
        onClose={() => setConfirmAction(null)}
      />
    </div>
  );
}
