'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Settings,
  Globe,
  Percent,
  AlertTriangle,
  Users,
  Save,
  Shield,
  ShieldCheck,
  ShieldOff,
  UserPlus,
  Mail,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import QuieroButton from '@/components/ui/QuieroButton';
import ConfirmDialog from '@/components/admin/ConfirmDialog';

// ─── Mock data ──────────────────────────────────────────────────────────────

interface MockAdmin {
  id: string;
  email: string;
  name: string;
  subRole: 'super_admin' | 'support_agent';
  active: boolean;
}

const MOCK_ADMINS: MockAdmin[] = [
  { id: 'adm-1', email: 'felipe@quierosim.com', name: 'Felipe Babenco', subRole: 'super_admin', active: true },
  { id: 'adm-2', email: 'ezequiel@quierosim.com', name: 'Ezequiel Segovia', subRole: 'super_admin', active: true },
  { id: 'adm-3', email: 'ignacio@quierosim.com', name: 'Ignacio Raffin', subRole: 'super_admin', active: true },
  { id: 'adm-4', email: 'soporte1@quierosim.com', name: 'Soporte 1', subRole: 'support_agent', active: true },
  { id: 'adm-5', email: 'soporte2@quierosim.com', name: 'Soporte 2', subRole: 'support_agent', active: false },
];

// ─── Component ──────────────────────────────────────────────────────────────

type Tab = 'general' | 'margins' | 'thresholds' | 'roles';

export default function SettingsView() {
  const [tab, setTab] = useState<Tab>('general');
  const [saved, setSaved] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<MockAdmin | null>(null);

  // General settings (mock state)
  const [storeName, setStoreName] = useState('QuieroSIM');
  const [currency, setCurrency] = useState('USD');
  const [supportEmail, setSupportEmail] = useState('support@quierosim.com');
  const [maintenance, setMaintenance] = useState(false);

  // Margins
  const [defaultMargin, setDefaultMargin] = useState('40');
  const [wholesaleMargin, setWholesaleMargin] = useState('15');
  const [commissionL1, setCommissionL1] = useState('15');
  const [commissionL2, setCommissionL2] = useState('5');

  // Thresholds
  const [priceAlertPct, setPriceAlertPct] = useState('5');
  const [minWithdrawal, setMinWithdrawal] = useState('50');
  const [faqThreshold, setFaqThreshold] = useState('5');

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs: { label: string; value: Tab; icon: typeof Settings }[] = [
    { label: 'General', value: 'general', icon: Globe },
    { label: 'Márgenes', value: 'margins', icon: Percent },
    { label: 'Umbrales', value: 'thresholds', icon: AlertTriangle },
    { label: 'Roles admin', value: 'roles', icon: Shield },
  ];

  const inputCls = "w-full px-4 py-3 text-sm bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#9933c1]/30 focus:border-[#9933c1] transition-all";
  const labelCls = "block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1.5";

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-white/10 pb-0 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.value} onClick={() => setTab(t.value)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 -mb-px transition-colors cursor-pointer whitespace-nowrap ${
              tab === t.value ? 'border-[#9933c1] text-[#9933c1] dark:text-[#b3ff6b] dark:border-[#b3ff6b]' : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}><t.icon className="h-4 w-4" /> {t.label}</button>
        ))}
      </div>

      {/* General */}
      {tab === 'general' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 p-6 space-y-5 max-w-xl">
          <div>
            <label className={labelCls}>Nombre de la tienda</label>
            <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Moneda principal</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls}>
              <option value="USD">USD — Dólar estadounidense</option>
              <option value="EUR">EUR — Euro</option>
              <option value="ARS">ARS — Peso argentino</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Email de soporte</label>
            <input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} className={inputCls} />
          </div>
          <div className="flex items-center justify-between bg-zinc-50 dark:bg-white/5 rounded-xl p-4 border border-zinc-200 dark:border-white/10">
            <div>
              <p className="text-sm font-bold text-zinc-900 dark:text-white">Modo mantenimiento</p>
              <p className="text-xs text-zinc-500 mt-0.5">Muestra un banner en la landing indicando que el sitio está en mantenimiento.</p>
            </div>
            <button onClick={() => setMaintenance(!maintenance)} className="cursor-pointer text-[#9933c1] dark:text-[#b3ff6b]">
              {maintenance ? <ToggleRight className="h-8 w-8" /> : <ToggleLeft className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />}
            </button>
          </div>
          <QuieroButton variant="primary" className="py-3 px-6 text-sm flex items-center gap-2" onClick={handleSave}>
            {saved ? <><ShieldCheck className="h-4 w-4" /> Guardado ✓</> : <><Save className="h-4 w-4" /> Guardar cambios</>}
          </QuieroButton>
        </motion.div>
      )}

      {/* Margins */}
      {tab === 'margins' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 p-6 space-y-5 max-w-xl">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Márgenes globales que se aplican como valor predeterminado al crear nuevos planes o aprobar nuevas cuentas.</p>
          <div>
            <label className={labelCls}>Margen default nuevos planes (%)</label>
            <input type="number" value={defaultMargin} onChange={(e) => setDefaultMargin(e.target.value)} className={inputCls} min="0" max="100" />
          </div>
          <div>
            <label className={labelCls}>Margen mayoristas (%)</label>
            <input type="number" value={wholesaleMargin} onChange={(e) => setWholesaleMargin(e.target.value)} className={inputCls} min="0" max="100" />
          </div>
          <div>
            <label className={labelCls}>Comisión afiliados Nivel 1 (%)</label>
            <input type="number" value={commissionL1} onChange={(e) => setCommissionL1(e.target.value)} className={inputCls} min="0" max="50" />
          </div>
          <div>
            <label className={labelCls}>Comisión afiliados Nivel 2 (%)</label>
            <input type="number" value={commissionL2} onChange={(e) => setCommissionL2(e.target.value)} className={inputCls} min="0" max="50" />
          </div>
          <QuieroButton variant="primary" className="py-3 px-6 text-sm flex items-center gap-2" onClick={handleSave}>
            {saved ? <><ShieldCheck className="h-4 w-4" /> Guardado ✓</> : <><Save className="h-4 w-4" /> Guardar cambios</>}
          </QuieroButton>
        </motion.div>
      )}

      {/* Thresholds */}
      {tab === 'thresholds' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 p-6 space-y-5 max-w-xl">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Umbrales que disparan alertas y acciones automáticas en el sistema.</p>
          <div>
            <label className={labelCls}>Variación de precio para alerta (%)</label>
            <input type="number" value={priceAlertPct} onChange={(e) => setPriceAlertPct(e.target.value)} className={inputCls} min="1" max="50" />
            <p className="text-xs text-zinc-400 mt-1">Si YeSim cambia un precio más del X%, se notifica al admin.</p>
          </div>
          <div>
            <label className={labelCls}>Mínimo retiro comisiones afiliado (USD)</label>
            <input type="number" value={minWithdrawal} onChange={(e) => setMinWithdrawal(e.target.value)} className={inputCls} min="0" />
          </div>
          <div>
            <label className={labelCls}>Umbral FAQs detectadas</label>
            <input type="number" value={faqThreshold} onChange={(e) => setFaqThreshold(e.target.value)} className={inputCls} min="1" max="100" />
            <p className="text-xs text-zinc-400 mt-1">Cantidad mínima de consultas similares para sugerir un nuevo FAQ al admin.</p>
          </div>
          <QuieroButton variant="primary" className="py-3 px-6 text-sm flex items-center gap-2" onClick={handleSave}>
            {saved ? <><ShieldCheck className="h-4 w-4" /> Guardado ✓</> : <><Save className="h-4 w-4" /> Guardar cambios</>}
          </QuieroButton>
        </motion.div>
      )}

      {/* Roles */}
      {tab === 'roles' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Cuentas con acceso al panel de administración.</p>
            <QuieroButton variant="primary" className="text-xs py-2.5 px-4 flex items-center gap-1.5">
              <UserPlus className="h-3.5 w-3.5" /> Invitar admin
            </QuieroButton>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/30">
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Nombre</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Email</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Rol</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Estado</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                {MOCK_ADMINS.map((adm) => (
                  <tr key={adm.id} className="hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 text-sm font-bold text-zinc-900 dark:text-white">{adm.name}</td>
                    <td className="py-3 px-4 text-sm text-zinc-700 dark:text-zinc-300">{adm.email}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                        adm.subRole === 'super_admin'
                          ? 'bg-[#9933c1]/10 text-[#9933c1] dark:bg-[#9933c1]/20 dark:text-[#b3ff6b]'
                          : 'bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300'
                      }`}>
                        {adm.subRole === 'super_admin' ? 'Super Admin' : 'Agente Soporte'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                        adm.active ? 'bg-[#b3ff6b]/30 text-green-900 dark:bg-[#b3ff6b]/20 dark:text-[#b3ff6b]' : 'bg-red-50 text-red-600 dark:bg-red-400/15 dark:text-red-300'
                      }`}>
                        {adm.active ? 'Activo' : 'Revocado'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {adm.active ? (
                        <button onClick={() => setConfirmRevoke(adm)} className="text-xs font-bold text-red-500 hover:text-red-700 dark:hover:text-red-300 transition-colors cursor-pointer">
                          Revocar
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </motion.div>
      )}

      <ConfirmDialog
        open={!!confirmRevoke}
        title="¿Revocar acceso?"
        description={`${confirmRevoke?.name} perderá acceso al panel de administración.`}
        confirmLabel="Revocar"
        tone="danger"
        onConfirm={async () => { setConfirmRevoke(null); return { ok: true }; }}
        onClose={() => setConfirmRevoke(null)}
      />
    </div>
  );
}
