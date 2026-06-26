'use client';

import Link from 'next/link';
import { ArrowLeft, Check } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import PrivacyPolicyES from './PrivacyPolicyES';
import PrivacyPolicyEN from './PrivacyPolicyEN';
import PrivacyPolicyPT from './PrivacyPolicyPT';

export default function PrivacyPolicyView() {
  const { lang, t } = useLanguage();

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased" id="privacy-policy-view">
      {/* Mini header/Navbar */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-sans font-bold text-slate-900 text-lg sm:text-xl">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#b3ff6b] text-black shadow-md">
              <Check className="h-4 w-4 stroke-[3.5]" />
            </div>
            <span className="font-sans font-black text-xl tracking-tight">
              <span className="text-[#9933c1]">Quiero</span><span className="text-[#b3ff6b]">SIM</span>
            </span>
          </Link>
          <Link href="/" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-950 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            {lang === 'ES' ? 'Volver al inicio' : lang === 'EN' ? 'Back to Home' : 'Voltar ao Início'}
          </Link>
        </div>
      </header>

      {lang === 'ES' && <PrivacyPolicyES />}
      {lang === 'EN' && <PrivacyPolicyEN />}
      {lang === 'PT' && <PrivacyPolicyPT />}
    </div>
  );
}
