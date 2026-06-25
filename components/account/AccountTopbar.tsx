'use client';

import { Menu } from 'lucide-react';
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

export default function AccountTopbar({
  setIsOpen,
  email,
  isAdmin,
}: {
  setIsOpen: (val: boolean) => void;
  email: string;
  isAdmin: boolean;
}) {
  const initial = email.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-x-4 border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#18181b]/80 backdrop-blur-md px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 transition-colors duration-300">
      <button 
        type="button" 
        className="-m-2.5 p-2.5 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white lg:hidden transition-colors"
        onClick={() => setIsOpen(true)}
      >
        <span className="sr-only">Abrir sidebar</span>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      <div className="flex flex-1 gap-x-4 self-stretch justify-end lg:gap-x-6">
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          
          <ThemeToggle />

          <Link href="/" className="text-sm font-bold text-slate-500 dark:text-zinc-400 hover:text-[#9933c1] dark:hover:text-[#b3ff6b] transition-colors hidden sm:block">
            Ver Sitio Web
          </Link>

          {/* Separator */}
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-slate-200 lg:dark:bg-white/10" aria-hidden="true" />

          {/* Profile indicator */}
          <div className="flex items-center gap-x-3 cursor-default group">
            <div className="h-9 w-9 rounded-full bg-[#9933c1] flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:scale-105 transition-transform">
              {initial}
            </div>
            <span className="hidden lg:flex lg:flex-col lg:items-start">
              <span className="text-sm font-bold leading-none text-slate-900 dark:text-zinc-100 group-hover:text-[#9933c1] dark:group-hover:text-white transition-colors">Mi Cuenta</span>
              <span className="text-xs font-medium text-slate-500 dark:text-zinc-500 mt-1">{email}</span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
