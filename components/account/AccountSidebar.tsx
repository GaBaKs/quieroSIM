'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Smartphone, HelpCircle, X, ShieldCheck, LifeBuoy, Users } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import { useAccountTheme } from './AccountThemeProvider';
import AccountLogout from './AccountLogout';

const navigation = [
  { name: 'Mis eSIMs', href: '/account', icon: Smartphone, exact: true },
  { name: 'Afiliados', href: '/account/affiliate', icon: Users },
  { name: 'Ayuda y Soporte', href: '/account/support', icon: LifeBuoy },
  { name: 'Preguntas Frecuentes', href: '/account/faq', icon: HelpCircle },
];

export default function AccountSidebar({
  isOpen,
  setIsOpen,
  isAdmin,
}: {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const { theme } = useAccountTheme();

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
          "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-white/10 transform transition-all duration-300 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo Area */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200 dark:border-white/10">
            <Link href="/" className="scale-90 origin-left dark:brightness-0 dark:invert transition-all">
              <Logo isDark={false} />
            </Link>
            <button 
              className="lg:hidden text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
            {navigation.map((item) => {
              const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors",
                    isActive
                      ? "bg-[#9933c1]/10 dark:bg-[#9933c1]/20 text-[#9933c1] dark:text-[#b3ff6b]"
                      : "text-slate-500 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-zinc-100"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", isActive ? "text-[#9933c1] dark:text-[#b3ff6b]" : "text-slate-400 dark:text-zinc-500")} />
                  {item.name}
                </Link>
              );
            })}
            
            {isAdmin && (
              <div className="pt-4 mt-4 border-t border-slate-200 dark:border-white/10">
                <Link
                  href="/admin"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-500 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#9933c1] dark:hover:text-[#b3ff6b] transition-colors"
                >
                  <ShieldCheck className="h-5 w-5 text-slate-400 dark:text-zinc-500" />
                  Panel de Administración
                </Link>
              </div>
            )}
          </nav>

          {/* Bottom Logout Area */}
          <div className="p-4 border-t border-slate-200 dark:border-white/10">
            <AccountLogout fullWidth />
          </div>
        </div>
      </div>
    </>
  );
}
