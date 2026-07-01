import { Metadata } from 'next';
import SupportView from '@/components/account/SupportView';
import { getMyTickets } from '@/server/actions/support';

export const metadata: Metadata = {
  title: 'Soporte y Ayuda | Mi Cuenta',
};

export default async function SupportPage() {
  const res = await getMyTickets();
  const tickets = res.ok ? res.data : [];
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Centro de Soporte
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">
            Buscá ayuda al instante o abrí un caso para hablar con una persona.
          </p>
        </div>
      </div>

      <SupportView initialTickets={tickets} />
    </div>
  );
}
