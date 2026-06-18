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

  // Check if admin
  const { data: adminData } = await supabase
    .from('admin_profile')
    .select('id')
    .eq('user_id', user.id)
    .single();

  const isAdmin = !!adminData;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/" aria-label="QuieroSIM">
              <Logo isDark={false} />
            </Link>
            <div className="hidden sm:flex items-center gap-4 border-l border-slate-200 pl-4 ml-2">
              <Link href="/" className="text-sm font-semibold text-slate-500 hover:text-[#9933c1] transition-colors">
                Ver Sitio Web
              </Link>
              {isAdmin && (
                <Link href="/admin" className="text-sm font-semibold text-[#9933c1] hover:text-[#7100a5] transition-colors">
                  Panel de Administración
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs text-slate-500">{user.email}</span>
            <AccountLogout />
          </div>
        </div>
      </header>
      
      {/* Mobile Nav Links */}
      <div className="sm:hidden border-b border-slate-200 bg-white px-4 py-2.5 flex items-center gap-4 overflow-x-auto shadow-sm">
        <Link href="/" className="text-xs font-semibold text-slate-600 hover:text-[#9933c1] whitespace-nowrap transition-colors">
          Ver Sitio Web
        </Link>
        {isAdmin && (
          <Link href="/admin" className="text-xs font-semibold text-[#9933c1] whitespace-nowrap transition-colors">
            Panel de Administración
          </Link>
        )}
      </div>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
