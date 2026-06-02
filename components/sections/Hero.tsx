'use client';

import { useState } from 'react';
import { Play, Compass, ShieldCheck, Zap, Download, Check, MapPin, Plane, QrCode } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'motion/react';
import QuieroButton from '../ui/QuieroButton';
import Logo from '../ui/Logo';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import imagotipo from '@/images/imagotipo.svg';

export default function Hero() {
  const [searchVal, setSearchVal] = useState('');
  const { t, lang } = useLanguage();

  const navigateToDestinations = () => {
    const el = document.getElementById('destinations-section');
    if (el) {
      const yOffset = -80;
      const yCoord = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: yCoord, behavior: 'smooth' });
    }
  };

  const handleSearchChange = (val: string) => {
    setSearchVal(val);
  };

  const handleSearchSubmit = () => {
    if (!searchVal.trim()) return;
    localStorage.setItem('hero_search_query', searchVal);
    window.dispatchEvent(new CustomEvent('heroSearch', { detail: { query: searchVal } }));
    navigateToDestinations();
  };

  const handlePopularClick = (item: { query: string, id?: string, region?: string }) => {
    localStorage.setItem('hero_search_query', item.query);
    
    if (item.id) {
      localStorage.setItem('hero_selected_id', item.id);
    } else {
      localStorage.removeItem('hero_selected_id');
    }
    
    if (item.region) {
      localStorage.setItem('hero_selected_region', item.region);
    } else {
      localStorage.removeItem('hero_selected_region');
    }

    window.dispatchEvent(new CustomEvent('heroSearch', { 
      detail: { 
        query: item.query,
        id: item.id,
        region: item.region
      } 
    }));
    navigateToDestinations();
  };

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const el = document.getElementById(targetId);
    if (el) {
      const yOffset = -80;
      const yCoord = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: yCoord, behavior: 'smooth' });
    }
  };

  // Stagger entry configurations for items inside columns on load
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }
    }
  };

  return (
    <section 
      className="relative overflow-hidden pt-24 pb-16 sm:pt-28 sm:pb-20 lg:pt-32 lg:pb-24" 
      style={{
        background: `radial-gradient(ellipse 80% 50% at 20% 40%, rgba(179,255,107,0.15) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 60%, rgba(153,51,193,0.15) 0%, transparent 55%), var(--color-blanco-fondo)`
      }}
      id="hero-section"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="bg-black/[0.02] backdrop-blur-3xl rounded-[2.5rem] p-6 sm:p-10 lg:p-12 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Staggered entrance actions and headers */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="lg:col-span-7 text-center lg:text-left flex flex-col justify-center space-y-4"
          >
            {/* Top label / slogan */}
            <motion.p 
              variants={itemVariants} 
              className="text-xs sm:text-sm font-black text-[#a0a0a0] uppercase tracking-wide font-sans mb-1"
            >
              {t('hero.slogan')}
            </motion.p>

            {/* Giant Title Layout like HolaSIM */}
            <motion.div variants={itemVariants} className="space-y-3 select-none">
              <div className="hover:scale-[1.01] origin-left transform transition-transform duration-300">
                <Image 
                  src={imagotipo} 
                  alt="QuieroSIM" 
                  className="h-20 sm:h-24 lg:h-28 w-auto mx-auto lg:mx-0"
                  priority
                />
              </div>
              <h1 className="font-sans text-3xl sm:text-4xl lg:text-[45px] leading-tight font-black text-zinc-900 tracking-tight">
                {t('hero.titleRest')}
              </h1>
            </motion.div>

            {/* Simple clear subtext */}
            <motion.p 
              variants={itemVariants}
              className="font-sans text-[15px] sm:text-[16px] text-slate-600 max-w-lg mx-auto lg:mx-0 leading-relaxed font-normal"
            >
              {t('hero.subtitle')}
            </motion.p>

            {/* Search bar inside Hero (HolaSim style) */}
            <motion.div variants={itemVariants} className="pt-1">
              <div className="flex flex-col sm:flex-row items-stretch gap-2 bg-white/80 p-1.5 rounded-2xl border border-zinc-200 shadow-sm backdrop-blur-md max-w-lg mx-auto lg:mx-0">
                <div className="relative flex-1 flex items-center pl-3">
                  <MapPin className="h-5 w-5 text-zinc-400 mr-2 shrink-0" />
                  <input
                    suppressHydrationWarning
                    type="text"
                    value={searchVal}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder={t('hero.searchPlaceholder')}
                    className="w-full bg-transparent text-zinc-900 font-sans text-sm focus:outline-none placeholder-zinc-400 py-2.5"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSearchSubmit();
                    }}
                  />
                </div>
                <QuieroButton
                  variant="secondary"
                  onClick={handleSearchSubmit}
                  className="py-2.5 px-5 text-xs uppercase tracking-wider shrink-0 font-sans font-black flex items-center justify-center gap-1.5"
                >
                  {t('hero.seePlans')} <Zap className="h-3.5 w-3.5 fill-current" />
                </QuieroButton>
              </div>

              {/* Quick links populares (HolaSim design) */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-1.5 mt-2.5 text-[11px] font-sans">
                <span className="text-zinc-500 font-bold mr-1">{t('hero.popular')}</span>
                {[
                  { label: `${t('hero.regions.europe')} 🇪🇺`, query: 'Europa Regional', id: 'europa-multi' },
                  { label: `${t('hero.regions.spain')} 🇪🇸`, query: 'España', id: 'espana' },
                  { label: `${t('hero.regions.usa')} 🇺🇸`, query: 'Estados Unidos', id: 'eeuu' },
                  { label: `${t('hero.regions.brazil')} 🇧🇷`, query: 'Brasil', id: 'brasil' },
                  { label: `${t('hero.regions.japan')} 🇯🇵`, query: 'Japón', id: 'japon' },
                  { label: `${t('hero.regions.global')} 🌐`, query: 'Global (85+ Países)', id: 'global-multi' },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePopularClick(item)}
                    className="bg-zinc-100/50 hover:bg-[#b3ff6b]/20 hover:text-green-800 text-zinc-600 font-bold px-2.5 py-1 rounded-lg border border-zinc-200 hover:border-[#b3ff6b]/50 transition-all cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Trust badge tags row */}
            <motion.div
              variants={itemVariants}
              className="flex flex-wrap justify-center lg:justify-start items-center gap-x-5 gap-y-2 pt-4 border-t border-zinc-200 max-w-lg mx-auto lg:mx-0"
            >
              {[
                { icon: Zap, label: 'Activación en 2 min' },
                { icon: ShieldCheck, label: 'Sin roaming oculto' },
                { icon: Download, label: 'QR instantáneo' },
              ].map(({ icon: Icon, label }, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-[#b3ff6b] shrink-0" />
                  <span className="text-xs font-semibold text-zinc-500 whitespace-nowrap">
                    {label}
                  </span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right Column: smartphone graphics with rotate and deep pulsing glows on load */}
          <div className="lg:col-span-5 hidden lg:flex justify-center lg:justify-end relative items-center pr-10">
            
            {/* Purple Blob Backgrounds */}
            <motion.div 
              className="absolute left-[45%] top-[50%] w-[350px] h-[350px] bg-[#9933c1]/10 rounded-[40%_60%_70%_30%/40%_50%_60%_50%] z-0 blur-xl pointer-events-none"
              animate={{
                borderRadius: ["40% 60% 70% 30% / 40% 50% 60% 50%", "60% 40% 30% 70% / 50% 60% 40% 50%", "40% 60% 70% 30% / 40% 50% 60% 50%"]
              }}
              transition={{
                duration: 8,
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "reverse"
              }}
            />
            <motion.div 
              className="absolute left-[35%] top-[40%] w-[280px] h-[280px] bg-[#9933c1]/15 rounded-[60%_40%_30%_70%/50%_60%_40%_50%] z-0 blur-xl pointer-events-none"
              animate={{
                borderRadius: ["60% 40% 30% 70% / 50% 60% 40% 50%", "40% 60% 70% 30% / 40% 50% 60% 50%", "60% 40% 30% 70% / 50% 60% 40% 50%"]
              }}
              transition={{
                duration: 10,
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "reverse"
              }}
            />

            {/* Airplane trace */}
            <motion.div 
               initial={{ opacity: 0, scale: 0.8 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ duration: 1, delay: 0.5 }}
               className="absolute right-0 top-16 flex gap-3 z-0 -rotate-[22deg] items-center pointer-events-none"
            >
              <svg width="180" height="40" viewBox="0 0 150 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-40">
                <path d="M0 35 Q 75 15 150 0" stroke="#9933c1" strokeWidth="2.5" strokeDasharray="6 6" />
              </svg>
              <Plane className="h-10 w-10 text-[#9933c1] drop-shadow-sm -ml-2" fill="#9933c1" />
            </motion.div>

            {/* Smartphone mockup */}
            <motion.div 
              initial={{ opacity: 0, y: 50, rotateY: 0, rotateX: 0, rotateZ: 0 }}
              animate={{ opacity: 1, y: 0, rotateY: -22, rotateX: 12, rotateZ: -6 }}
              transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={{
                 transformStyle: 'preserve-3d',
                 transformPerspective: 1200,
                 boxShadow: '1px 1px 0 #f4f4f5, 2px 2px 0 #e4e4e7, 3px 4px 0 #d4d4d8, 4px 5px 0 #a1a1aa, 5px 7px 0 #71717a, 15px 25px 40px rgba(0,0,0,0.25)',
                 background: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)'
              }}
              className="relative w-full max-w-[270px] aspect-[9/18.5] rounded-[44px] p-[6px] z-10 hover:-translate-y-2 transition-transform duration-500 ease-out mr-8"
              id="hero-smartphone-simulator"
            >
              {/* Dynamic camera notch */}
              <div className="absolute top-[18px] left-1/2 -translate-x-1/2 h-5 w-[90px] bg-black rounded-full z-20 flex items-center justify-between px-2.5 shadow-[inset_0_-1px_2px_rgba(255,255,255,0.1)]">
                <div className="h-2 w-2 rounded-full bg-[#111]" />
                <div className="h-2 w-2 rounded-full bg-[#0a0a0a] shadow-[inset_0_0_2px_rgba(255,255,255,0.2)]" />
              </div>

              {/* SIM screen layout */}
              <div className="w-full h-full bg-black rounded-[38px] overflow-hidden flex flex-col relative font-sans text-white border-[3px] border-black">
                
                {/* Simulated status bar */}
                <div className="h-8 flex justify-between items-center px-6 pt-2 text-[10px] text-zinc-500">
                  <span>9:41 AM</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[var(--color-lime)]">eSIM 5G</span>
                    <div className="h-2 w-4 border border-zinc-700 rounded-xs p-px flex items-center">
                      <div className="h-full w-full bg-zinc-500" />
                    </div>
                  </div>
                </div>

                {/* Smartphone App Header */}
                <div className="px-5 py-4 flex items-center justify-between border-b border-white/5 bg-zinc-950/40">
                  <div className="flex items-center gap-2">
                    <Logo className="scale-[0.55] origin-left -ml-2" isDark />
                    <span className="font-bold text-[10px] text-zinc-400 absolute right-8">App</span>
                  </div>
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse relative z-10" />
                </div>

                {/* Simulated Active eSIM card */}
                <div className="flex-1 p-5 flex flex-col justify-between space-y-4">
                  
                  {/* Digital Boarding screen */}
                  <div className="space-y-3">
                    <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wide">{t('hero.phoneLine')}</span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#b3ff6b] uppercase tracking-wider bg-[#b3ff6b]/15 px-1.5 py-0.5 rounded">
                          ● {t('hero.phoneActive')}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-lg font-bold tracking-tight">EE.UU. eSIM</div>
                          <div className="text-[11px] text-zinc-400">Operadores: AT&T / T-Mobile</div>
                        </div>
                        <span className="text-xl">🇺🇸</span>
                      </div>

                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full w-3/4 bg-gradient-to-r from-[#b3ff6b] to-lime-500 rounded-full" />
                      </div>
                      
                      <div className="flex justify-between text-[11px] text-zinc-500">
                        <span>{t('hero.phoneConsumidos')}</span>
                        <span>{t('hero.phoneTotales')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick-install scanning tutorial vector */}
                  <div className="rounded-xl bg-violet-950/20 border border-[#b3ff6b]/10 p-4 text-center space-y-2">
                    <div className="text-xs font-bold text-[#b3ff6b]">{t('hero.phoneAuto')}</div>
                    <div className="w-18 h-18 mx-auto rounded bg-white p-1 flex items-center justify-center">
                      <svg viewBox="0 0 100 100" className="w-full h-full text-zinc-950">
                        <path fill="currentColor" d="M0,0 h20 v5 h-15 v15 h-5 z M80,0 h20 v20 h-5 v-15 h-15 z M0,80 h5 v15 h-5 v5 h-20 z M100,100 h-20 v-5 h15 v-15 h5 z" />
                        <rect x="15" y="15" width="20" height="20" fill="currentColor" />
                        <rect x="65" y="65" width="20" height="20" fill="currentColor" />
                        <rect x="65" y="15" width="20" height="20" fill="currentColor" />
                        <rect x="15" y="65" width="20" height="20" fill="currentColor" />
                        <rect x="42" y="42" width="16" height="16" fill="currentColor" />
                      </svg>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-normal">
                      {t('hero.phoneAutoDesc')}
                    </p>
                  </div>

                  {/* Sim legal note */}
                  <div className="text-center text-[9px] text-zinc-600">
                    {t('hero.phoneSupport')}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>

      {/* Seamless transition gradient to HowItWorks (zinc-50) */}
      <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-b from-transparent to-zinc-50 pointer-events-none" />
    </section>
  );
}
