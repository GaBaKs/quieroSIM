import ComingSoon from '@/components/admin/ComingSoon';

/** Configuración global (sin store de settings). Placeholder.
 *  Roles admin se gestionan en /admin/users; precios/márgenes en /admin/plans. */
export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white mb-2">Configuración</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Ajustes globales y preferencias del sistema.</p>
      </div>
      <ComingSoon description="Los ajustes globales estarán disponibles próximamente. La gestión de administradores está en Usuarios y los precios/márgenes en Planes." />
    </div>
  );
}
