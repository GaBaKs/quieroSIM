import ReportsView from '@/components/admin/ReportsView';

/** Reportes y finanzas (Fase 9). Server component — datos mock. */
export default function AdminReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white mb-2">Reportes</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Análisis de ventas, reporte financiero y rendimiento de afiliados.</p>
      </div>
      <ReportsView />
    </div>
  );
}
