'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Globe, Percent, Users, Save, ShieldCheck, UserPlus, Trash2, Shield } from 'lucide-react';
import QuieroButton from '@/components/ui/QuieroButton';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import {
  updateSettings,
  grantAdmin,
  setAdminSubRole,
  revokeAdmin,
  type PlatformSettings,
  type AdminAccount,
} from '@/server/actions/admin-settings';

type Tab = 'general' | 'margins' | 'affiliates' | 'admins';
type SubRole = 'super_admin' | 'support_agent';

const inputCls =
  'w-full px-4 py-3 text-sm bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#9933c1]/30 focus:border-[#9933c1] transition-all';
const labelCls = 'block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1.5';
const cardCls = 'bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 p-6 space-y-5 max-w-xl';

export default function SettingsView({ settings, admins }: { settings: PlatformSettings; admins: AdminAccount[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('general');

  const [form, setForm] = useState<Record<keyof PlatformSettings, string>>({
    storeName: settings.storeName,
    supportEmail: settings.supportEmail,
    defaultCurrency: settings.defaultCurrency,
    defaultMarginPct: String(settings.defaultMarginPct),
    wholesaleMarginPct: String(settings.wholesaleMarginPct),
    priceAlertThresholdPct: String(settings.priceAlertThresholdPct),
    commissionL1Pct: String(settings.commissionL1Pct),
    commissionL2Pct: String(settings.commissionL2Pct),
    minWithdrawalUsd: String(settings.minWithdrawalUsd),
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof PlatformSettings, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const res = await updateSettings({
      storeName: form.storeName,
      supportEmail: form.supportEmail,
      defaultCurrency: form.defaultCurrency,
      defaultMarginPct: Number(form.defaultMarginPct),
      wholesaleMarginPct: Number(form.wholesaleMarginPct),
      priceAlertThresholdPct: Number(form.priceAlertThresholdPct),
      commissionL1Pct: Number(form.commissionL1Pct),
      commissionL2Pct: Number(form.commissionL2Pct),
      minWithdrawalUsd: Number(form.minWithdrawalUsd),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } else {
      setError(res.error.message);
    }
  };

  // ── Admins ──
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<SubRole>('support_agent');
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<AdminAccount | null>(null);

  const handleGrant = async () => {
    setAdminBusy(true);
    setAdminError(null);
    const res = await grantAdmin({ email: newEmail, subRole: newRole });
    setAdminBusy(false);
    if (res.ok) {
      setNewEmail('');
      router.refresh();
    } else {
      setAdminError(res.error.message);
    }
  };

  const handleToggleRole = async (a: AdminAccount) => {
    setAdminError(null);
    const next: SubRole = a.subRole === 'super_admin' ? 'support_agent' : 'super_admin';
    const res = await setAdminSubRole({ userId: a.userId, subRole: next });
    if (res.ok) router.refresh();
    else setAdminError(res.error.message);
  };

  const tabs: { label: string; value: Tab; icon: typeof Globe }[] = [
    { label: 'General', value: 'general', icon: Globe },
    { label: 'Márgenes y alertas', value: 'margins', icon: Percent },
    { label: 'Afiliados', value: 'affiliates', icon: Users },
    { label: 'Administradores', value: 'admins', icon: Shield },
  ];

  const SaveButton = (
    <QuieroButton variant="primary" className="py-3 px-6 text-sm flex items-center gap-2" onClick={handleSave}>
      {saving ? 'Guardando…' : saved ? (<><ShieldCheck className="h-4 w-4" /> Guardado ✓</>) : (<><Save className="h-4 w-4" /> Guardar cambios</>)}
    </QuieroButton>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-white/10 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.value} onClick={() => { setTab(t.value); setError(null); }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 -mb-px transition-colors cursor-pointer whitespace-nowrap ${
              tab === t.value ? 'border-[#9933c1] text-[#9933c1] dark:text-[#b3ff6b] dark:border-[#b3ff6b]' : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}><t.icon className="h-4 w-4" /> {t.label}</button>
        ))}
      </div>

      {error && tab !== 'admins' && (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-400/10 rounded-xl p-3 max-w-xl">{error}</p>
      )}

      {/* General */}
      {tab === 'general' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cardCls}>
          <div>
            <label className={labelCls}>Nombre de la tienda</label>
            <input type="text" value={form.storeName} onChange={(e) => set('storeName', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email de soporte</label>
            <input type="email" value={form.supportEmail} onChange={(e) => set('supportEmail', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Moneda principal</label>
            <select value={form.defaultCurrency} onChange={(e) => set('defaultCurrency', e.target.value)} className={inputCls}>
              <option value="USD">USD — Dólar estadounidense</option>
              <option value="EUR">EUR — Euro</option>
              <option value="ARS">ARS — Peso argentino</option>
            </select>
          </div>
          {SaveButton}
        </motion.div>
      )}

      {/* Márgenes y alertas */}
      {tab === 'margins' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cardCls}>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">El margen default y el umbral de alerta los usa la sincronización de catálogo (sync-catalog).</p>
          <div>
            <label className={labelCls}>Margen default para planes nuevos (%)</label>
            <input type="number" value={form.defaultMarginPct} onChange={(e) => set('defaultMarginPct', e.target.value)} className={inputCls} min="0" max="1000" />
          </div>
          <div>
            <label className={labelCls}>Margen mayoristas (%)</label>
            <input type="number" value={form.wholesaleMarginPct} onChange={(e) => set('wholesaleMarginPct', e.target.value)} className={inputCls} min="0" max="1000" />
          </div>
          <div>
            <label className={labelCls}>Umbral de variación de precio para alerta (%)</label>
            <input type="number" value={form.priceAlertThresholdPct} onChange={(e) => set('priceAlertThresholdPct', e.target.value)} className={inputCls} min="0" max="100" />
            <p className="text-xs text-zinc-400 mt-1">Si YeSim cambia un costo más del X%, se registra una alerta.</p>
          </div>
          {SaveButton}
        </motion.div>
      )}

      {/* Afiliados */}
      {tab === 'affiliates' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cardCls}>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Se guardan ahora; aplican cuando el módulo de afiliados esté activo.</p>
          <div>
            <label className={labelCls}>Comisión Nivel 1 (%)</label>
            <input type="number" value={form.commissionL1Pct} onChange={(e) => set('commissionL1Pct', e.target.value)} className={inputCls} min="0" max="100" />
          </div>
          <div>
            <label className={labelCls}>Comisión Nivel 2 (%)</label>
            <input type="number" value={form.commissionL2Pct} onChange={(e) => set('commissionL2Pct', e.target.value)} className={inputCls} min="0" max="100" />
          </div>
          <div>
            <label className={labelCls}>Mínimo de retiro (USD)</label>
            <input type="number" value={form.minWithdrawalUsd} onChange={(e) => set('minWithdrawalUsd', e.target.value)} className={inputCls} min="0" />
          </div>
          {SaveButton}
        </motion.div>
      )}

      {/* Administradores */}
      {tab === 'admins' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Agregar admin */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 p-5">
            <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-3">Agregar administrador</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input type="email" placeholder="email@registrado.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className={`${inputCls} flex-1`} />
              <select value={newRole} onChange={(e) => setNewRole(e.target.value as SubRole)} className={`${inputCls} sm:w-52`}>
                <option value="support_agent">Agente de soporte</option>
                <option value="super_admin">Super administrador</option>
              </select>
              <QuieroButton variant="primary" className="py-3 px-5 text-sm flex items-center gap-2 justify-center" onClick={handleGrant}>
                <UserPlus className="h-4 w-4" /> {adminBusy ? 'Agregando…' : 'Agregar'}
              </QuieroButton>
            </div>
            <p className="text-xs text-zinc-400 mt-2">El usuario debe estar registrado en la app. Se le da acceso al panel admin.</p>
            {adminError && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-400/10 rounded-lg p-2.5 mt-3">{adminError}</p>}
          </div>

          {/* Lista de admins */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[560px]">
                <thead><tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/30">
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Email</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Rol</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Acciones</th>
                </tr></thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                  {admins.map((a) => (
                    <tr key={a.userId} className="hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 text-sm font-bold text-zinc-900 dark:text-white">
                        {a.email}{a.isSelf && <span className="ml-2 text-[10px] font-black uppercase text-zinc-400">(vos)</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                          a.subRole === 'super_admin' ? 'bg-[#9933c1]/10 text-[#9933c1] dark:bg-[#9933c1]/20 dark:text-[#b3ff6b]' : 'bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300'
                        }`}>{a.subRole === 'super_admin' ? 'Super Admin' : 'Agente Soporte'}</span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {a.isSelf ? (
                          <span className="text-xs text-zinc-400">—</span>
                        ) : (
                          <div className="inline-flex items-center gap-3">
                            <button onClick={() => handleToggleRole(a)} className="text-xs font-bold text-[#9933c1] dark:text-[#b3ff6b] hover:underline cursor-pointer">
                              {a.subRole === 'super_admin' ? 'Pasar a soporte' : 'Pasar a super'}
                            </button>
                            <button onClick={() => setConfirmRevoke(a)} className="inline-flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-700 dark:hover:text-red-300 cursor-pointer">
                              <Trash2 className="h-3.5 w-3.5" /> Revocar
                            </button>
                          </div>
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
        title="¿Revocar acceso de administrador?"
        description={`${confirmRevoke?.email ?? ''} perderá el acceso al panel de administración.`}
        confirmLabel="Revocar"
        tone="danger"
        onConfirm={async () => {
          if (!confirmRevoke) return { ok: false, error: 'Sin selección.' };
          const res = await revokeAdmin({ userId: confirmRevoke.userId });
          if (res.ok) { router.refresh(); return { ok: true }; }
          return { ok: false, error: res.error.message };
        }}
        onClose={() => setConfirmRevoke(null)}
      />
    </div>
  );
}
