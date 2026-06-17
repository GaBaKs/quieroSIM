'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search } from 'lucide-react';

/** Filtros de la tabla de órdenes: chips por estado + búsqueda. Navega por query params. */
const STATUS_CHIPS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Todas' },
  { value: 'failed_needs_review', label: 'Revisión manual' },
  { value: 'fulfilled', label: 'Completadas' },
  { value: 'paid', label: 'Pagadas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'refunded', label: 'Reembolsadas' },
  { value: 'failed', label: 'Fallidas' },
];

export default function OrderFilters({ status, search }: { status?: string; search?: string }) {
  const router = useRouter();
  const [term, setTerm] = useState(search ?? '');

  const go = (next: { status?: string; search?: string }) => {
    const params = new URLSearchParams();
    const s = next.status ?? status;
    const q = next.search ?? term;
    if (s) params.set('status', s);
    if (q) params.set('search', q);
    router.push(`/admin/orders${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {STATUS_CHIPS.map((chip) => {
          const active = (status ?? '') === chip.value;
          return (
            <button
              key={chip.value || 'all'}
              onClick={() => go({ status: chip.value })}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                active
                  ? 'bg-[#9933c1] text-white'
                  : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-300 hover:border-[#9933c1]/50'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          go({ search: term });
        }}
        className="relative max-w-sm"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar por email o N° de orden…"
          className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#9933c1]"
        />
      </form>
    </div>
  );
}
