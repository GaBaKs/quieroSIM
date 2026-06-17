'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function AccountLogout() {
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
      className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-[#9933c1] hover:text-[#9933c1] transition-colors cursor-pointer"
    >
      <LogOut className="h-3.5 w-3.5" />
      {t('account.logout')}
    </button>
  );
}
