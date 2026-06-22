import ComingSoon from '@/components/admin/ComingSoon';

/** Afiliados (Fase 7 — en standby). Placeholder hasta construir el módulo. */
export default function AdminAffiliatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white mb-2">Afiliados</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Gestión de afiliados, comisiones y programa de referidos.</p>
      </div>
      <ComingSoon description="El módulo de afiliados (registro, comisiones de 2 niveles y retiros) estará disponible próximamente." />
    </div>
  );
}
