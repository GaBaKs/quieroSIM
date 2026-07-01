import { redirect } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import { createSupabaseServerClient } from '@/server/db/supabase-server';
import AccountLogout from '@/components/account/AccountLogout';

import { AccountThemeProvider } from '@/components/account/AccountThemeProvider';
import AccountShell from '@/components/account/AccountShell';
import { getMyAgency } from '@/server/actions/wholesale';

/**
 * Panel del usuario final (Etapa 6). El proxy ya exige sesión para /account/*;
 * este guard server-side es la segunda línea (sin chequeo de rol: cualquier
 * usuario logueado ve SUS eSIMs vía RLS).
 */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Check if admin
  const { data: adminData } = await supabase
    .from('admin_profile')
    .select('id')
    .eq('user_id', user.id)
    .single();


  const isAdmin = !!adminData;

  const agencyRes = await getMyAgency();
  const hasWholesaleRole = agencyRes.ok && agencyRes.data?.status === 'approved';


  return (
    <AccountThemeProvider>
      <AccountShell email={user.email || ''} isAdmin={isAdmin} hasWholesaleRole={hasWholesaleRole}>
        {children}
      </AccountShell>
    </AccountThemeProvider>
  );
}
