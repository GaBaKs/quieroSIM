import AffiliatesView from '@/components/admin/AffiliatesView';

/** Gestión de afiliados (Fase 6). Server component — datos mock por ahora. */
export default function AdminAffiliatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white mb-2">Afiliados</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Gestión de afiliados, comisiones y programa de referidos.</p>
      </div>
      <AffiliatesView />
    </div>
  );
}
