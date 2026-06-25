import { getOrders } from '@/server/actions/admin-orders';
import OrderFilters from '@/components/admin/OrderFilters';
import OrdersListView from '@/components/admin/OrdersListView';
import Link from 'next/link';

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
        <OrdersListView rows={list.rows} />
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
