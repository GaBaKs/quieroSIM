import WholesaleView from '@/components/admin/WholesaleView';

/** Gestión de agencias mayoristas (Fase 7). Server component — datos mock. */
export default function AdminWholesalePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white mb-2">Mayoristas</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Gestión de agencias, compras en lote e inventario de eSIMs.</p>
      </div>
      <WholesaleView />
    </div>
  );
}
