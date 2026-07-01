import { Metadata } from 'next';
import SupportAdminView from '@/components/admin/SupportAdminView';
import { getAdminTickets, getKbArticles, getUnresolvedQueries } from '@/server/actions/admin-support';

export const metadata: Metadata = {
  title: 'Soporte y Tickets | Admin Panel',
};

export default async function SupportPage() {
  const [ticketsRes, kbRes, unresolvedRes] = await Promise.all([getAdminTickets(), getKbArticles(), getUnresolvedQueries()]);
  const firstErr = !ticketsRes.ok ? ticketsRes : !kbRes.ok ? kbRes : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white mb-2">Centro de Soporte</h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Tickets de clientes, base de conocimiento y consultas sin respuesta.
        </p>
      </div>

      {firstErr ? (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-400/10 rounded-xl p-4">{firstErr.error.message}</p>
      ) : (
        <SupportAdminView
          tickets={ticketsRes.ok ? ticketsRes.data : []}
          kb={kbRes.ok ? kbRes.data : []}
          unresolved={unresolvedRes.ok ? unresolvedRes.data : []}
        />
      )}
    </div>
  );
}
