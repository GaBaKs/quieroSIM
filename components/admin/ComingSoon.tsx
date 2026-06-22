import { Hammer } from 'lucide-react';

/** Placeholder limpio para secciones del panel aún no construidas (sin datos mock). */
export default function ComingSoon({
  title = 'Próximamente',
  description = 'Esta sección estará disponible próximamente.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-300 dark:border-white/15 p-12 flex flex-col items-center text-center">
      <div className="p-4 rounded-2xl bg-[#9933c1]/10 dark:bg-[#9933c1]/20 text-[#9933c1] dark:text-[#b3ff6b] mb-4">
        <Hammer className="h-7 w-7" />
      </div>
      <h2 className="text-lg font-black text-zinc-900 dark:text-white mb-1">{title}</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">{description}</p>
    </div>
  );
}
