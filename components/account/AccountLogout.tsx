'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function AccountLogout({ fullWidth = false }: { fullWidth?: boolean }) {
  const router = useRouter();
  const { t } = useLanguage();

  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace('/');
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className={`flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-white/10 px-3 py-2 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 dark:hover:bg-zinc-800 dark:hover:text-white dark:hover:border-zinc-700 transition-colors cursor-pointer ${fullWidth ? 'w-full justify-center' : ''}`}
    >
      <LogOut className="h-4 w-4" />
      {t('account.logout')}
    </button>
  );
}
