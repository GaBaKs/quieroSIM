import { redirect } from 'next/navigation';
import { getAuthContext } from '@/server/lib/auth';
import AdminShell from '@/components/admin/AdminShell';

/**
 * Guard del panel admin (Server Component): exige sesión + rol admin.
 * La protección de DATOS la da RLS; esto bloquea la UI y resuelve el sub-rol
 * (support_agent no ve secciones de finanzas).
 */
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/admin/login');
  if (!ctx.roles.includes('admin')) redirect('/admin/login?error=forbidden');

  return (
    <AdminShell email={ctx.email ?? ''} subRole={ctx.adminSubRole}>
      {children}
    </AdminShell>
  );
}
