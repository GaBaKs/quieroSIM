/**
 * Badge de estado reutilizable para órdenes, provisión y eSIMs en el panel admin.
 * Colores semánticos consistentes con el dark theme del panel.
 */

const ORDER_STYLES: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pendiente', cls: 'bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300' },
  paid: { label: 'Pagada', cls: 'bg-blue-50 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300' },
  fulfilled: { label: 'Completada', cls: 'bg-[#b3ff6b]/30 text-green-900 dark:bg-[#b3ff6b]/20 dark:text-[#b3ff6b]' },
  failed_needs_review: { label: 'Revisión manual', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300' },
  failed: { label: 'Fallida', cls: 'bg-red-50 text-red-600 dark:bg-red-400/15 dark:text-red-300' },
  refunded: { label: 'Reembolsada', cls: 'bg-purple-50 text-purple-700 dark:bg-purple-400/15 dark:text-purple-300' },
};

const ESIM_STYLES: Record<string, { label: string; cls: string }> = {
  generated: { label: 'Generada', cls: 'bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300' },
  installed: { label: 'Instalada', cls: 'bg-blue-50 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300' },
  active: { label: 'Activa', cls: 'bg-[#b3ff6b]/30 text-green-900 dark:bg-[#b3ff6b]/20 dark:text-[#b3ff6b]' },
  expired: { label: 'Vencida', cls: 'bg-red-50 text-red-600 dark:bg-red-400/15 dark:text-red-300' },
};

const USER_STYLES: Record<string, { label: string; cls: string }> = {
  active: { label: 'Activo', cls: 'bg-[#b3ff6b]/30 text-green-900 dark:bg-[#b3ff6b]/20 dark:text-[#b3ff6b]' },
  suspended: { label: 'Suspendido', cls: 'bg-red-50 text-red-600 dark:bg-red-400/15 dark:text-red-300' },
  deleted: { label: 'Eliminado', cls: 'bg-zinc-100 text-zinc-500 dark:bg-white/10 dark:text-zinc-400' },
};

const MAPS = { order: ORDER_STYLES, esim: ESIM_STYLES, user: USER_STYLES };

export default function StatusBadge({ kind, value }: { kind: 'order' | 'esim' | 'user'; value: string }) {
  const entry = MAPS[kind][value] ?? { label: value, cls: 'bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300' };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${entry.cls}`}>
      {entry.label}
    </span>
  );
}
