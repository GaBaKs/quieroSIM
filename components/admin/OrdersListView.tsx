'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutGrid, List } from 'lucide-react';
import StatusBadge from '@/components/admin/StatusBadge';
import { usd, shortDate } from '@/components/admin/format';
import type { AdminOrderRow } from '@/server/actions/admin-orders';

export default function OrdersListView({ rows }: { rows: AdminOrderRow[] }) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setViewMode('grid');
    }
  }, []);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-zinc-400 py-10 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10">
        No hay órdenes para este filtro.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="flex bg-zinc-100 dark:bg-black/30 rounded-xl p-1 shrink-0 border border-zinc-200 dark:border-white/10">
          <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-white dark:bg-zinc-800 shadow-sm text-[#9933c1] dark:text-[#b3ff6b]' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}>
            <List className="h-4 w-4" />
          </button>
          <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-white dark:bg-zinc-800 shadow-sm text-[#9933c1] dark:text-[#b3ff6b]' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}>
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 overflow-hidden">
        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/30">
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Orden</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Email</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Plan</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Monto</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Estado</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                {rows.map((o) => (
                  <tr 
                    key={o.id} 
                    onClick={() => router.push(`/admin/orders/${o.id}`)}
                    className="hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <span className="font-bold text-[#9933c1] dark:text-[#b3ff6b]">#{o.shortId}</span>
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-700 dark:text-zinc-300 max-w-[200px] truncate">{o.email ?? '—'}</td>
                    <td className="py-3 px-4 text-sm text-zinc-700 dark:text-zinc-300">{o.planName}</td>
                    <td className="py-3 px-4 text-sm font-bold text-zinc-900 dark:text-white">{usd(o.pricePaid)}</td>
                    <td className="py-3 px-4"><StatusBadge kind="order" value={o.status} /></td>
                    <td className="py-3 px-4 text-sm text-zinc-500">{shortDate(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {rows.map((o) => (
              <div 
                key={o.id} 
                onClick={() => router.push(`/admin/orders/${o.id}`)}
                className="border border-zinc-200 dark:border-white/10 rounded-xl p-5 flex flex-col gap-3 bg-zinc-50 dark:bg-black/20 hover:border-[#9933c1]/30 hover:bg-zinc-100 dark:hover:bg-white/5 transition-all cursor-pointer shadow-sm hover:shadow-md"
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="font-mono text-sm font-bold text-[#9933c1] dark:text-[#b3ff6b]">#{o.shortId}</span>
                  <StatusBadge kind="order" value={o.status} />
                </div>
                
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">{o.planName}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5 truncate">{o.email ?? '—'}</p>
                </div>

                <div className="flex items-center justify-between border-t border-zinc-200 dark:border-white/10 pt-3 mt-auto">
                  <span className="text-lg font-black text-zinc-900 dark:text-white">{usd(o.pricePaid)}</span>
                  <span className="text-xs text-zinc-400">{shortDate(o.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
