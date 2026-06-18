'use client';

import { Menu, Sun, Moon } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from './ThemeProvider';
import { motion, AnimatePresence } from 'motion/react';
import type { AdminSubRole } from '@/server/types';

export default function Topbar({
  setIsOpen,
  email,
  subRole,
}: {
  setIsOpen: (val: boolean) => void;
  email?: string;
  subRole?: AdminSubRole | null;
}) {
  const { theme, toggleTheme } = useTheme();
  const displayName = email || 'Admin';
  const initial = displayName.charAt(0).toUpperCase();
  const subRoleLabel = subRole === 'support_agent' ? 'Agente de Soporte' : 'Super Admin';

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-x-4 border-b border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-[#18181b]/80 backdrop-blur-md px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 transition-colors duration-300">
      <button 
        type="button" 
        className="-m-2.5 p-2.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white lg:hidden transition-colors"
        onClick={() => setIsOpen(true)}
      >
        <span className="sr-only">Abrir sidebar</span>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      <div className="flex flex-1 gap-x-4 self-stretch justify-end lg:gap-x-6">
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-[#9933c1] dark:hover:text-[#b3ff6b] transition-colors relative w-10 h-10 flex items-center justify-center overflow-hidden"
            aria-label="Alternar tema"
          >
            <AnimatePresence mode="wait" initial={false}>
              {theme === 'dark' ? (
                <motion.div
                  key="moon"
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 20, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute"
                >
                  <Moon className="h-5 w-5" />
                </motion.div>
              ) : (
                <motion.div
                  key="sun"
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 20, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute"
                >
                  <Sun className="h-5 w-5" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>

          <Link href="/account" className="text-sm font-bold text-zinc-500 dark:text-zinc-400 hover:text-[#9933c1] dark:hover:text-[#b3ff6b] transition-colors hidden sm:block">
            Vista Usuario
          </Link>
          <Link href="/" className="text-sm font-bold text-zinc-500 dark:text-zinc-400 hover:text-[#9933c1] dark:hover:text-[#b3ff6b] transition-colors hidden sm:block">
            Ver Sitio Web
          </Link>

          {/* Separator */}
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-zinc-200 lg:dark:bg-white/10" aria-hidden="true" />

          {/* Profile indicator */}
          <div className="flex items-center gap-x-3 cursor-default group">
            <div className="h-9 w-9 rounded-full bg-[#9933c1] flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:scale-105 transition-transform">
              {initial}
            </div>
            <span className="hidden lg:flex lg:flex-col lg:items-start">
              <span className="text-sm font-bold leading-none text-zinc-900 dark:text-zinc-100 group-hover:text-[#9933c1] dark:group-hover:text-white transition-colors">{displayName}</span>
              <span className="text-xs font-medium text-[#9933c1] dark:text-[#b3ff6b] mt-1 tracking-widest uppercase">{subRoleLabel}</span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
