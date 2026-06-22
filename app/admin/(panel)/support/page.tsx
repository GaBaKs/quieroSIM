import ComingSoon from '@/components/admin/ComingSoon';

/** Soporte y tickets (Fase 9 — sin construir). Placeholder. */
export default function AdminSupportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white mb-2">Soporte y Tickets</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Atención al cliente, historial de chat y Knowledge Base sugerido.</p>
      </div>
      <ComingSoon description="El módulo de soporte con bot e IA estará disponible próximamente." />
    </div>
  );
}
