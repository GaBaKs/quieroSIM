import { redirect } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import { createSupabaseServerClient } from '@/server/db/supabase-server';
import AccountLogout from '@/components/account/AccountLogout';

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

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" aria-label="QuieroSIM">
            <Logo isDark={false} />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs text-slate-500">{user.email}</span>
            <AccountLogout />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
