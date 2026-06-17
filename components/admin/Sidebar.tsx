'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Globe2,
  Ticket,
  Network,
  Building2,
  HeadphonesIcon,
  BarChart3,
  Settings,
  LogOut,
  X
} from 'lucide-react';
import Logo from '@/components/ui/Logo';
import { useTheme } from './ThemeProvider';
import { useMounted } from '@/hooks/use-mounted';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { AdminSubRole } from '@/server/types';

// `soon: true` = sección de Etapas 8–9 (cupones, afiliados, mayorista, etc.):
// se muestra deshabilitada con un badge "Pronto", sin link.
const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Órdenes', href: '/admin/orders', icon: ShoppingCart },
  { name: 'Usuarios', href: '/admin/users', icon: Users },
  { name: 'Planes', href: '/admin/plans', icon: Globe2 },
  { name: 'Cupones', href: '/admin/coupons', icon: Ticket },
  { name: 'Afiliados', href: '/admin/affiliates', icon: Network, soon: true },
  { name: 'Mayoristas', href: '/admin/wholesale', icon: Building2, soon: true },
  { name: 'Soporte', href: '/admin/support', icon: HeadphonesIcon, soon: true },
  { name: 'Reportes', href: '/admin/reports', icon: BarChart3, superAdminOnly: true, soon: true },
  { name: 'Configuración', href: '/admin/settings', icon: Settings, soon: true },
];

export default function Sidebar({
  isOpen,
  setIsOpen,
  subRole,
}: {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  subRole?: AdminSubRole | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();
  const mounted = useMounted();

  // support_agent no ve secciones de finanzas (la seguridad real la da RLS).
  const visibleNavigation = navigation.filter(
    (item) => !item.superAdminOnly || subRole === 'super_admin',
  );

  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace('/admin/login');
    router.refresh();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 dark:bg-black/80 backdrop-blur-sm lg:hidden transition-opacity" 
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-white/10 transform transition-all duration-300 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo Area */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-zinc-200 dark:border-white/10">
            <Link href="/admin" className="scale-90 origin-left">
              <Logo isDark={mounted ? theme === 'dark' : true} />
            </Link>
            <button 
              className="lg:hidden text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
            {visibleNavigation.map((item) => {
              // Secciones de Etapas 8–9: deshabilitadas con badge "Pronto".
              if (item.soon) {
                return (
                  <div
                    key={item.name}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-zinc-300 dark:text-zinc-600 cursor-not-allowed select-none"
                    title="Disponible próximamente"
                  >
                    <item.icon className="h-5 w-5 text-zinc-300 dark:text-zinc-600" />
                    <span>{item.name}</span>
                    <span className="ml-auto rounded-full bg-zinc-100 dark:bg-white/5 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                      Pronto
                    </span>
                  </div>
                );
              }
              const isActive = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors",
                    isActive
                      ? "bg-[#9933c1]/10 dark:bg-[#9933c1]/20 text-[#9933c1] dark:text-[#b3ff6b]"
                      : "text-zinc-500 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-zinc-100"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", isActive ? "text-[#9933c1] dark:text-[#b3ff6b]" : "text-zinc-400 dark:text-zinc-500")} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Bottom Logout Area */}
          <div className="p-4 border-t border-zinc-200 dark:border-white/10">
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/10 transition-colors w-full"
            >
              <LogOut className="h-5 w-5" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
