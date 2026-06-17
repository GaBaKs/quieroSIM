import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getOrderDetail } from '@/server/actions/admin-orders';
import { getAuthContext } from '@/server/lib/auth';
import OrderDetailView from '@/components/admin/OrderDetailView';

/** Detalle de una orden + acciones (reintento, refund). Server component. */
export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [result, ctx] = await Promise.all([getOrderDetail(id), getAuthContext()]);
  const isSuperAdmin = ctx?.adminSubRole === 'super_admin';

  if (!result.ok) {
    return (
      <div className="space-y-6">
        <Link href="/admin/orders" className="inline-flex items-center gap-1.5 text-sm font-bold text-zinc-500 hover:text-[#9933c1]">
          <ArrowLeft className="h-4 w-4" /> Volver a órdenes
        </Link>
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-400/10 rounded-xl p-4">{result.error.message}</p>
      </div>
    );
  }

  return <OrderDetailView order={result.data} isSuperAdmin={isSuperAdmin} />;
}
