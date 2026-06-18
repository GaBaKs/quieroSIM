import SettingsView from '@/components/admin/SettingsView';

/** Configuración global (Fase 10). Server component — datos mock. */
export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white mb-2">Configuración</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Ajustes globales, márgenes por defecto y gestión de administradores.</p>
      </div>
      <SettingsView />
    </div>
  );
}
