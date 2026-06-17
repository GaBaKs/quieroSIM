'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search } from 'lucide-react';

/** Búsqueda de usuarios por email/nombre. Navega por query param. */
export default function UserSearch({ search }: { search?: string }) {
  const router = useRouter();
  const [term, setTerm] = useState(search ?? '');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/admin/users${term ? `?search=${encodeURIComponent(term)}` : ''}`);
      }}
      className="relative max-w-sm"
    >
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Buscar por email o nombre…"
        className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#9933c1]"
      />
    </form>
  );
}
