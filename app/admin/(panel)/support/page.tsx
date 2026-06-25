import { Metadata } from 'next';
import SupportAdminMock from '@/components/admin/SupportAdminMock';

export const metadata: Metadata = {
  title: 'Soporte y Tickets | Admin Panel',
};

export default function SupportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white mb-2">Centro de Soporte</h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Gestión de tickets, atención al cliente y Base de Conocimientos (IA). (Modo Mock)
        </p>
      </div>
      
      <SupportAdminMock />
    </div>
  );
}
