'use client';

import { Menu } from 'lucide-react';
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { cn } from '@/lib/utils';

export default function AccountTopbar({
  setIsOpen,
  email,
  isAdmin,
}: {
  setIsOpen: (val: boolean) => void;
  email: string;
  isAdmin: boolean;
}) {
  const { lang, setLang, t } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);
  const langs = ['ES', 'EN', 'PT'] as const;

  // Language switcher click outside handler
  useEffect(() => {
    if (!langOpen) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.lang-switcher-account')) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [langOpen]);
  const initial = email.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-x-4 border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#18181b]/80 backdrop-blur-md px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 transition-colors duration-300">
      <button 
        type="button" 
        className="-m-2.5 p-2.5 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white lg:hidden transition-colors"
        onClick={() => setIsOpen(true)}
      >
        <span className="sr-only">{t('account.openSidebar')}</span>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      <div className="flex flex-1 gap-x-4 self-stretch justify-end lg:gap-x-6">
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          
          <ThemeToggle />

          {/* Account Language Switcher */}
          <div className="lang-switcher-account relative hidden sm:block">
            {/* Trigger button */}
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-slate-50 dark:bg-zinc-900/50 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all duration-200 whitespace-nowrap cursor-pointer"
            >
              <Globe className="h-3.5 w-3.5 text-[#9933c1] dark:text-[#b3ff6b]" />
              <span>{lang}</span>
              <motion.span
                animate={{ rotate: langOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-3 w-3" />
              </motion.span>
            </button>

            {/* Dropdown */}
            <AnimatePresence>
              {langOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute top-full right-0 mt-2 w-24 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-xl shadow-black/10 z-50"
                >
                  {langs.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => { setLang(l); setLangOpen(false); }}
                      className={cn(
                        "w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-150 cursor-pointer",
                        lang === l
                          ? "text-slate-900 dark:text-zinc-100 bg-[#b3ff6b]/30 dark:bg-[#b3ff6b]/10"
                          : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-50 dark:hover:bg-zinc-800"
                      )}
                    >
                      {l === 'ES' ? '🇦🇷 ES' : l === 'EN' ? '🇺🇸 EN' : '🇧🇷 PT'}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

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
              <span className="text-sm font-bold leading-none text-slate-900 dark:text-zinc-100 group-hover:text-[#9933c1] dark:group-hover:text-white transition-colors">{t('account.myAccount')}</span>
              <span className="text-xs font-medium text-slate-500 dark:text-zinc-500 mt-1">{email}</span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
