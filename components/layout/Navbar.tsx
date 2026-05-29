'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Globe, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import QuieroButton from '@/components/ui/QuieroButton';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface NavLinkProps {
  href: string;
  label: string;
  sectionId: string;
  activeSection: string;
  onClick: (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => void;
}

function NavLink({ href, label, sectionId, activeSection, onClick }: NavLinkProps) {
  return (
    <Link
      href={href}
      onClick={(e) => onClick(e, sectionId)}
      className="relative text-sm font-medium whitespace-nowrap text-zinc-600 hover:text-black transition-colors duration-200 py-1 group"
    >
      {label}
      {/* Underline animado — siempre presente pero con scaleX 0 */}
      <span className={cn(
        "absolute bottom-0 left-0 h-[2px] w-full rounded-full",
        "bg-[#b3ff6b] origin-left",
        "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        activeSection === sectionId 
          ? "scale-x-100" // activo por scroll spy
          : "scale-x-0 group-hover:scale-x-100" // hover
      )} />
    </Link>
  );
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  const { lang, setLang, t } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);
  const langs = ['ES', 'EN', 'PT'] as const;

  // Handle transparent to glassmorphic header on scroll
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Language switcher click outside handler
  useEffect(() => {
    if (!langOpen) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.lang-switcher')) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [langOpen]);

  // Scroll spy to highlight active section link
  useEffect(() => {
    const sections = [
      'destinations-section', 
      'how-it-works-section', 
      'compatibility-section', 
      'testimonials-section', 
      'faq-section'
    ];
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.4 }
    );

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    setIsOpen(false);
    const el = document.getElementById(targetId);
    if (el) {
      const yOffset = -80; // offset for sticky navbar
      const yCoord = el.getBoundingClientRect().top + window.scrollY + yOffset;
      window.scrollTo({ top: yCoord, behavior: 'smooth' });
    }
  };

  const navItems = [
    { title: t('navbar.howItWorks'), id: 'how-it-works-section' },
    { title: t('navbar.destinations'), id: 'destinations-section' },
    { title: t('navbar.compatibility'), id: 'compatibility-section' },
    { title: t('navbar.about'), id: 'about' },
    { title: t('navbar.testimonials'), id: 'testimonials-section' },
    { title: t('navbar.faq'), id: 'faq-section' },
  ];

  return (
    <>
      <header 
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled 
            ? "bg-white/90 backdrop-blur-xl border-b border-zinc-200 py-3 shadow-sm" 
            : "bg-transparent py-5"
        )}
        id="app-navbar"
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Col 1 — Logo, justify izquierda */}
          <div className="flex items-center justify-start">
            <Link 
              href="/" 
              onClick={(e) => {
                e.preventDefault();
                setIsOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2 group cursor-pointer whitespace-nowrap z-10"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#b3ff6b] text-black shadow-md group-hover:scale-105 transition-transform duration-200">
                <Check className="h-4.5 w-4.5 stroke-[3.5]" />
              </div>
              <span className="font-sans font-black text-xl tracking-tight text-zinc-900 bg-black/[0.02] px-2 py-1 rounded-xl flex items-center transition-all duration-300">
                <span className="text-[#9933c1]">Quiero</span>
                <span className="bg-[#9933c1] text-[#83ff00] px-0.5 py-0.5 rounded-md ml-1 leading-none">SIM</span>
              </span>
            </Link>
          </div>

          {/* Col 2 — Links, centrados exactos */}
          <div className="hidden lg:flex items-center gap-8">
            {navItems.map((item) => (
              <NavLink
                key={item.id}
                href={`/#${item.id}`}
                label={item.title}
                sectionId={item.id}
                activeSection={activeSection}
                onClick={handleLinkClick}
              />
            ))}
          </div>

          {/* Col 3 — Acciones, justify derecha */}
          <div className="flex items-center gap-3 justify-end z-10">
            {/* Desktop only Language switcher + CTA button */}
            <div className="hidden lg:flex items-center gap-4">
              <div className="lang-switcher relative">
                {/* Trigger button */}
                <button
                  onClick={() => setLangOpen(!langOpen)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium text-zinc-600 hover:text-black border border-zinc-200 hover:border-zinc-300 bg-black/5 hover:bg-black/10 transition-all duration-200 whitespace-nowrap cursor-pointer"
                >
                  <Globe className="h-3.5 w-3.5 text-[#b3ff6b]" />
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
                      className="absolute top-full right-0 mt-2 w-24 bg-white/95 backdrop-blur-xl border border-zinc-200 rounded-xl overflow-hidden shadow-xl shadow-black/10 z-50"
                    >
                      {langs.map((l) => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => { setLang(l); setLangOpen(false); }}
                          className={cn(
                            "w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-150 cursor-pointer",
                            lang === l
                              ? "text-zinc-900 bg-[#b3ff6b]/30"
                              : "text-zinc-600 hover:text-black hover:bg-black/5"
                          )}
                        >
                          {l === 'ES' ? '🇦🇷 ES' : l === 'EN' ? '🇺🇸 EN' : '🇧🇷 PT'}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Link
                href="/#destinations-section"
                onClick={(e) => handleLinkClick(e, 'destinations-section')}
              >
                <QuieroButton 
                  variant="primary" 
                  showArrow 
                  className="py-2 px-5 text-sm font-black whitespace-nowrap"
                >
                  {t('navbar.buyEsim')}
                </QuieroButton>
              </Link>
            </div>

            {/* Hamburger Button (shows below lg) */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex lg:hidden flex-col justify-center items-center w-10 h-10 rounded-xl border border-zinc-200 bg-black/5 hover:bg-black/10 transition-colors cursor-pointer outline-none relative text-[#b3ff6b]"
              aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
            >
              <div className="flex flex-col gap-1.5 w-5">
                <motion.span 
                  animate={isOpen ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="h-0.5 w-full bg-[#b3ff6b] rounded-full origin-center"
                />
                <motion.span 
                  animate={isOpen ? { opacity: 0 } : { opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="h-0.5 w-full bg-[#b3ff6b] rounded-full origin-center"
                />
                <motion.span 
                  animate={isOpen ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="h-0.5 w-full bg-[#b3ff6b] rounded-full origin-center"
                />
              </div>
            </button>
          </div>

        </div>
      </header>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-x-0 top-[68px] z-45 lg:hidden border-b border-zinc-200 bg-white shadow-2xl max-h-[calc(100vh-68px)] overflow-y-auto"
            id="mobile-navigation-drawer"
          >
            <div className="px-6 pt-4 pb-8 space-y-6">
              <div className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.id}
                    href={`/#${item.id}`}
                    onClick={(e) => handleLinkClick(e, item.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-3.5 font-sans text-base font-semibold transition-colors whitespace-nowrap",
                      activeSection === item.id 
                        ? "bg-black/5 text-black underline underline-offset-4 decoration-[#b3ff6b] decoration-2" 
                        : "text-zinc-600 hover:bg-black/5 hover:text-black"
                    )}
                  >
                    {item.title}
                  </Link>
                ))}
              </div>

              {/* Mobile language selector buttons under the menu navigation */}
              <div className="flex items-center gap-2 px-6 py-4 border-t border-zinc-100">
                {(['ES', 'EN', 'PT'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-sm font-bold transition-all duration-200 cursor-pointer",
                      lang === l
                        ? "bg-[#b3ff6b] text-black"
                        : "bg-black/5 text-zinc-600 hover:bg-black/10 hover:text-black"
                    )}
                  >
                    {l === 'ES' ? '🇦🇷 ES' : l === 'EN' ? '🇺🇸 EN' : '🇧🇷 PT'}
                  </button>
                ))}
              </div>

              <div className="border-t border-white/10 pt-6 space-y-4">
                <Link
                  href="/#destinations-section"
                  onClick={(e) => handleLinkClick(e, 'destinations-section')}
                  className="block w-full"
                >
                  <QuieroButton variant="primary" showArrow className="w-full font-black text-base py-3.5">
                    {t('navbar.buyEsim')}
                  </QuieroButton>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
