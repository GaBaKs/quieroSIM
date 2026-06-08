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
import chicasHeroImg from '@/src/assets/images/chicas-hero.jpg';

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
                  <Icon className="h-3.5 w-3.5 text-[#9933c1] shrink-0" />
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
               className="absolute right-4 md:right-8 lg:right-0 top-16 flex gap-3 z-0 -rotate-[22deg] items-center pointer-events-none translate-x-[10px]"
            >
              <svg width="180" height="40" viewBox="0 0 150 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-40">
                <path d="M0 35 Q 75 15 150 0" stroke="#9933c1" strokeWidth="2.5" strokeDasharray="6 6" />
              </svg>
              <Plane className="h-10 w-10 text-[#9933c1] drop-shadow-sm -ml-2" fill="#9933c1" />
            </motion.div>

            {/* Person holding smartphone mockup */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-[320px] sm:max-w-[360px] lg:max-w-[400px] aspect-[3/4] z-10 flex rounded-3xl overflow-hidden shadow-2xl mx-auto lg:mx-0"
            >
              {/* Background Image */}
              <Image 
                src={chicasHeroImg} 
                alt="Chicas mostrando el celular" 
                className="absolute inset-0 w-full h-full object-cover bg-zinc-200"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"><rect width="100" height="100" fill="%23f4f4f5"/><text x="50" y="50" font-family="sans-serif" font-size="5" text-anchor="middle" dominant-baseline="middle" fill="%23a1a1aa">Sube la imagen como /src/assets/images/chicas-hero.jpg</text></svg>';
                }}
              />
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
