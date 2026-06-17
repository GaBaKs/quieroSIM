import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getUserDetail } from '@/server/actions/admin-users';
import { getAuthContext } from '@/server/lib/auth';
import UserDetailView from '@/components/admin/UserDetailView';

/** Detalle de usuario + acciones (suspender; roles solo super_admin). Server component. */
export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [result, ctx] = await Promise.all([getUserDetail(id), getAuthContext()]);
  const isSuperAdmin = ctx?.adminSubRole === 'super_admin';

  if (!result.ok) {
    return (
      <div className="space-y-6">
        <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm font-bold text-zinc-500 hover:text-[#9933c1]">
          <ArrowLeft className="h-4 w-4" /> Volver a usuarios
        </Link>
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-400/10 rounded-xl p-4">{result.error.message}</p>
      </div>
    );
  }

  return <UserDetailView user={result.data} isSuperAdmin={isSuperAdmin} />;
}
