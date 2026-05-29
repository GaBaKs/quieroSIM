'use client';

import Link from 'next/link';
import { Mail, MapPin, Check, Facebook, Instagram } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { t, lang } = useLanguage();

  const getDocPaths = (langCode: string) => {
    switch (langCode) {
      case 'EN':
        return {
          privacy: '/docs/language/en/03_privacy_policy_EN.pdf',
          terms: '/docs/language/en/01_terms_conditions_EN.pdf',
          refund: '/docs/language/en/02_refund_policy_EN.pdf',
        };
      case 'PT':
        return {
          privacy: '/docs/language/pt/03_politica_privacidade_PT.pdf',
          terms: '/docs/language/pt/01_termos_condicoes_PT.pdf',
          refund: '/docs/language/pt/02_politica_reembolso_PT.pdf',
        };
      case 'ES':
      default:
        return {
          privacy: '/docs/language/es/03_politica_privacidad_ES.pdf',
          terms: '/docs/language/es/01_terminos_condiciones_ES.pdf',
          refund: '/docs/language/es/02_politica_reembolso_ES.pdf',
        };
    }
  };

  const docs = getDocPaths(lang);

  return (
    <footer className="bg-[#000000] text-zinc-400 font-sans border-t border-white/5 py-16" id="app-footer">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Main Flex/Grid Layout */}
        <div className="flex flex-col lg:flex-row justify-between gap-12 lg:gap-8 pb-16 border-b border-white/10">
          
          {/* LEFT COLUMN: Logo & Socials */}
          <div className="lg:w-[30%] flex flex-col space-y-12">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#b3ff6b] text-black shadow-md">
                <Check className="h-4 w-4 stroke-[4]" />
              </div>
              <span className="font-sans font-black text-2xl tracking-tighter flex items-center">
                <span className="text-[#9933c1]">Quiero</span>
                <span className="bg-[#9933c1] text-[#83ff00] px-1 py-0.5 rounded leading-none ml-0.5">SIM</span>
              </span>
            </div>

            {/* Social Icons */}
            <div className="flex items-center gap-6 text-white">
              <a href="#" aria-label="Facebook" className="hover:text-[#b3ff6b] transition-colors">
                <Facebook className="h-6 w-6 stroke-[1.5]" />
              </a>
              <a href="#" aria-label="Instagram" className="hover:text-[#b3ff6b] transition-colors">
                <Instagram className="h-6 w-6 stroke-[1.5]" />
              </a>
            </div>

            {/* Payment Note */}
            <div className="text-[11px] text-zinc-600 flex flex-wrap items-center gap-x-3 gap-y-1 mt-auto pt-6">
              <span className="font-semibold tracking-wider text-zinc-500 uppercase">{t('footer.securePayment')}</span>
              <span className="text-[#b3ff6b]/90 font-bold">Stripe</span>
              <span className="text-zinc-800">|</span>
              <span className="text-zinc-600">VISA · MC · AMEX</span>
            </div>
          </div>

          {/* RIGHT COLUMNS: Links */}
          <div className="lg:w-[65%] grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 text-sm">
            
            {/* Links / Navigation */}
            <div className="flex flex-col space-y-6">
              <h4 className="text-white font-bold text-sm">{t('footer.linksTitle')}</h4>
              <ul className="space-y-4 text-zinc-500 font-medium">
                <li><Link href="/#destinations" className="hover:text-[#b3ff6b] transition-colors">{t('footer.links.0')}</Link></li>
                <li><Link href="/#compatibility-section" className="hover:text-[#b3ff6b] transition-colors">{t('footer.links.1')}</Link></li>
                <li><Link href="/#testimonials-section" className="hover:text-[#b3ff6b] transition-colors">{t('footer.links.2')}</Link></li>
                <li><Link href="/#faq-section" className="hover:text-[#b3ff6b] transition-colors">{t('footer.links.3')}</Link></li>
              </ul>
            </div>

            {/* Popular Destinations (Using translation keys) */}
            <div className="flex flex-col space-y-6">
              <h4 className="text-white font-bold text-sm">{t('footer.topDestinations')}</h4>
              <ul className="space-y-4 text-zinc-500 font-medium">
                <li><Link href="/#destinations-section" className="hover:text-[#b3ff6b] transition-colors">eSIM {t('countries.Europa')}</Link></li>
                <li><Link href="/#destinations-section" className="hover:text-[#b3ff6b] transition-colors">eSIM {t('countries.Estados Unidos')}</Link></li>
                <li><Link href="/#destinations-section" className="hover:text-[#b3ff6b] transition-colors">eSIM {t('countries.España')}</Link></li>
                <li><Link href="/#destinations-section" className="hover:text-[#b3ff6b] transition-colors">eSIM {t('countries.México')}</Link></li>
                <li><Link href="/#destinations-section" className="hover:text-[#b3ff6b] transition-colors">eSIM {t('countries.Brasil')}</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div className="flex flex-col space-y-6">
              <h4 className="text-white font-bold text-sm">{t('footer.legalTitle')}</h4>
              <ul className="space-y-4 text-zinc-500 font-medium">
                <li><Link href={docs.terms} target="_blank" className="hover:text-[#b3ff6b] transition-colors">{t('footer.terms')}</Link></li>
                <li><Link href={docs.privacy} target="_blank" className="hover:text-[#b3ff6b] transition-colors">{t('footer.privacy')}</Link></li>
                <li><Link href={docs.refund} target="_blank" className="hover:text-[#b3ff6b] transition-colors">{t('footer.refund')}</Link></li>
              </ul>
            </div>

            {/* Support / Contact */}
            <div className="flex flex-col space-y-6">
              <h4 className="text-white font-bold text-sm">{t('footer.supportTitle')}</h4>
              <ul className="space-y-4 text-zinc-500 font-medium">
                <li className="flex items-start gap-2">
                  <Mail className="h-4 w-4 shrink-0 mt-0.5 opacity-70" />
                  <a href="mailto:support@quierosim.com" className="hover:text-[#b3ff6b] transition-colors break-all">
                    support@quierosim.com
                  </a>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5 opacity-70" />
                  <span className="leading-relaxed text-xs">
                    <strong className="text-zinc-300">QUIERO LLC</strong><br />
                    1000 Brickell Avenue, Suite #715 PMB 153, Miami, Florida 33131, EE. UU.
                  </span>
                </li>
              </ul>
            </div>

          </div>
        </div>

        {/* Copyright */}
        <div className="pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-zinc-600 gap-4">
          <p>© {currentYear} QuieroSIM (QUIERO LLC). {t('footer.rights')}</p>
        </div>

      </div>
    </footer>
  );
}
