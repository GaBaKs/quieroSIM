import { Metadata } from 'next';
import WholesaleMock from '@/components/admin/WholesaleMock';

export const metadata: Metadata = {
  title: 'Mayoristas | Admin Panel',
};

export default function WholesalePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white mb-2">Agencias Mayoristas</h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Gestión de compras en lote y agencias asociadas. (Modo Mock)
        </p>
      </div>
      
      <WholesaleMock />
    </div>
  );
}
