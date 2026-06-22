import { getSettings, getAdmins } from '@/server/actions/admin-settings';
import SettingsView from '@/components/admin/SettingsView';

/** Configuración global (solo super_admin). Server component con datos reales. */
export default async function AdminSettingsPage() {
  const [settingsRes, adminsRes] = await Promise.all([getSettings(), getAdmins()]);
  const firstErr = !settingsRes.ok ? settingsRes : !adminsRes.ok ? adminsRes : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white mb-2">Configuración</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Ajustes globales, márgenes y gestión de administradores.</p>
      </div>

      {firstErr ? (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-400/10 rounded-xl p-4">{firstErr.error.message}</p>
      ) : (
        <SettingsView
          settings={settingsRes.ok ? settingsRes.data : {
            defaultMarginPct: 0, wholesaleMarginPct: 0, priceAlertThresholdPct: 0,
            commissionL1Pct: 0, commissionL2Pct: 0, minWithdrawalUsd: 0,
          }}
          admins={adminsRes.ok ? adminsRes.data : []}
        />
      )}
    </div>
  );
}
