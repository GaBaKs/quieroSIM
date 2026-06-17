import Link from 'next/link';
import { getOrders } from '@/server/actions/admin-orders';
import StatusBadge from '@/components/admin/StatusBadge';
import OrderFilters from '@/components/admin/OrderFilters';
import { usd, shortDate } from '@/components/admin/format';

/** Listado de órdenes con filtros por estado y búsqueda. Server component. */
export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? '1') || 1);
  const result = await getOrders({ status: sp.status, search: sp.search, page });

  const list = result.ok ? result.data : { rows: [], page: 1, pageSize: 20, total: 0 };
  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white mb-2">Órdenes</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Gestión de ventas y resolución de la cola de provisión.</p>
      </div>

      <OrderFilters status={sp.status} search={sp.search} />

      {!result.ok ? (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-400/10 rounded-xl p-4">{result.error.message}</p>
      ) : list.rows.length === 0 ? (
        <p className="text-sm text-zinc-400 py-10 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10">
          No hay órdenes para este filtro.
        </p>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 overflow-hidden">
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
                {list.rows.map((o) => (
                  <tr key={o.id} className="hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4">
                      <Link href={`/admin/orders/${o.id}`} className="font-bold text-[#9933c1] dark:text-[#b3ff6b] hover:underline">
                        #{o.shortId}
                      </Link>
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
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
            const params = new URLSearchParams();
            if (sp.status) params.set('status', sp.status);
            if (sp.search) params.set('search', sp.search);
            params.set('page', String(p));
            return (
              <Link
                key={p}
                href={`/admin/orders?${params.toString()}`}
                className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${
                  p === list.page
                    ? 'bg-[#9933c1] text-white'
                    : 'text-zinc-500 hover:bg-black/5 dark:hover:bg-white/10'
                }`}
              >
                {p}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
