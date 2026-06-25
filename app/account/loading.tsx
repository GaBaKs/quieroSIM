import { Loader2 } from 'lucide-react';

export default function AccountLoading() {
  return (
    <div className="flex h-[60vh] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-slate-400 dark:text-zinc-500">
        <Loader2 className="h-10 w-10 animate-spin text-[#9933c1] dark:text-[#b3ff6b]" />
        <p className="text-sm font-medium animate-pulse">Cargando datos...</p>
      </div>
    </div>
  );
}
