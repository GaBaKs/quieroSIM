import Link from 'next/link';
import { getUsers } from '@/server/actions/admin-users';
import { getAuthContext } from '@/server/lib/auth';
import StatusBadge from '@/components/admin/StatusBadge';
import UserSearch from '@/components/admin/UserSearch';
import CreateUserDialog from '@/components/admin/CreateUserDialog';
import { shortDate } from '@/components/admin/format';

/** Listado de usuarios con búsqueda. Server component. */
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? '1') || 1);
  const [result, ctx] = await Promise.all([getUsers({ search: sp.search, page }), getAuthContext()]);
  const isSuper = ctx?.adminSubRole === 'super_admin';
  const list = result.ok ? result.data : { rows: [], page: 1, pageSize: 20, total: 0 };
  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white mb-2">Usuarios</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Cuentas registradas, sus compras y estado.</p>
        </div>
        {isSuper && <CreateUserDialog />}
      </div>

      <UserSearch search={sp.search} />

      {!result.ok ? (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-400/10 rounded-xl p-4">{result.error.message}</p>
      ) : list.rows.length === 0 ? (
        <p className="text-sm text-zinc-400 py-10 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10">
          No hay usuarios para esta búsqueda.
        </p>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[720px]">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/30">
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Email</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Nombre</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Roles</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Estado</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Alta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                {list.rows.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4">
                      <Link href={`/admin/users/${u.id}`} className="font-bold text-[#9933c1] dark:text-[#b3ff6b] hover:underline">{u.email}</Link>
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-700 dark:text-zinc-300">{u.fullName ?? '—'}</td>
                    <td className="py-3 px-4 text-xs text-zinc-500">{u.roles.length ? u.roles.join(', ') : '—'}</td>
                    <td className="py-3 px-4"><StatusBadge kind="user" value={u.accountStatus} /></td>
                    <td className="py-3 px-4 text-sm text-zinc-500">{shortDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
            const params = new URLSearchParams();
            if (sp.search) params.set('search', sp.search);
            params.set('page', String(p));
            return (
              <Link key={p} href={`/admin/users?${params.toString()}`}
                className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${p === list.page ? 'bg-[#9933c1] text-white' : 'text-zinc-500 hover:bg-black/5 dark:hover:bg-white/10'}`}>
                {p}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
