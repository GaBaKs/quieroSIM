import { Metadata } from 'next';
import SupportTicketsMock from '@/components/account/SupportTicketsMock';

export const metadata: Metadata = {
  title: 'Soporte y Ayuda | Mi Cuenta',
};

export default function SupportPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Centro de Soporte
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">
            Revisá el estado de tus consultas o abrí un nuevo ticket de asistencia.
          </p>
        </div>
      </div>
      
      <SupportTicketsMock />
    </div>
  );
}
