'use client';

import { useState, useEffect, useRef } from 'react';
import { Globe, ShieldCheck, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { motion } from 'motion/react';
import QuieroButton from '../ui/QuieroButton';
import whiteGreyBg from '@/src/assets/images/whitegreybg.jpg';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useScrollReveal } from '@/hooks/useScrollReveal';

export default function HowItWorks() {
  const [lineHeight, setLineHeight] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const step1Ref = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();
  const { fadeUp } = useScrollReveal();

  useEffect(() => {
    const handleScrollEvent = () => {
      const steps = [
        { ref: step1Ref, step: 1, height: 16 },
        { ref: step2Ref, step: 2, height: 58 },
        { ref: step3Ref, step: 3, height: 100 },
      ];
      
      const triggerPoint = window.innerHeight * 0.65;
      
      let activeStep = 0;
      let activeHeight = 0;
      
      for (const { ref, step, height } of steps) {
        if (!ref.current) continue;
        const rect = ref.current.getBoundingClientRect();
        if (rect.top <= triggerPoint) {
          activeStep = step;
          activeHeight = height;
        }
      }
      
      if (activeStep !== 0) {
        setCurrentStep(activeStep);
        setLineHeight(activeHeight);
      }
    };

    window.addEventListener('scroll', handleScrollEvent, { passive: true });
    // Run once on mount
    handleScrollEvent();
    
    return () => window.removeEventListener('scroll', handleScrollEvent);
  }, []);

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const el = document.getElementById(targetId);
    if (el) {
      const yOffset = -80;
      const yCoord = el.getBoundingClientRect().top + window.scrollY + yOffset;
      window.scrollTo({ top: yCoord, behavior: 'smooth' });
    }
  };

  const isStep1Active = currentStep >= 1;
  const isStep2Active = currentStep >= 2;
  const isStep3Active = currentStep >= 3;

  return (
    <section 
      style={{ backgroundImage: `url(${whiteGreyBg.src})` }}
      className="bg-zinc-50 bg-cover bg-center py-14 md:py-20 relative overflow-hidden" 
      id="how-it-works-section"
    >
      {/* Seamless transition gradient to bottom (white) */}
      <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-b from-transparent to-white pointer-events-none z-10" />
      
      {/* Subtle fade overlay to keep contrast high and ensure readability */}
      <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-0" />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section header */}
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
          className="mx-auto max-w-[680px] text-center mb-20"
        >
          <p className="text-[#b3ff6b] text-xs font-bold uppercase tracking-[0.2em] mb-3 bg-black px-3 py-1.5 rounded-full inline-block">
            {t('howItWorks.badge')}
          </p>
          <h2 className="font-sans text-3xl sm:text-4xl font-black tracking-tight text-slate-900 mb-4 mt-4">
            {t('howItWorks.title')}
          </h2>
          <p className="font-sans text-slate-500 text-sm sm:text-base leading-relaxed">
            {t('howItWorks.subtitle')}
          </p>
        </motion.div>

        {/* Steps Zig-Zag flow with timeline connectors */}
        <div className="relative max-w-4xl mx-auto pl-4 md:pl-0">
          
          {/* LÍNEA DE PROGRESO VERTICAL */}
          <div 
            className="absolute top-6 left-6 -translate-x-1/2 md:left-1/2 md:-translate-x-[1.5px] w-[3px] pointer-events-none"
            style={{ height: 'calc(100% - 48px)' }}
          >
            {/* TRACK (fondo) */}
            <div className="w-full h-full bg-slate-200/40 rounded-full" />
            {/* FILL (progreso animado) */}
            <div 
              className="absolute top-0 left-0 w-full rounded-full transition-[height] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ 
                height: `${lineHeight}%`,
                background: 'linear-gradient(180deg, #7100a5, #9933c1 50%, #b3ff6b)',
                boxShadow: '0 0 12px rgba(179,255,107,0.4)'
              }}
            />
          </div>

          {/* PASO 1 */}
          <div 
            ref={step1Ref}
            className="relative flex flex-col md:flex-row items-start md:items-center justify-between mb-16 md:mb-28 pl-12 md:pl-0"
          >
            {/* Left Column (Desktop: text-right, Mobile: text-left) */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5 }}
              className="w-full md:w-[calc(50%-40px)] md:pr-12 text-left md:text-right"
            >
              <p className="text-[#7ab832] text-xs font-sans font-bold uppercase tracking-widest mb-1.5">
                PASO 01
              </p>
              <h3 className="font-sans text-2xl font-black text-slate-900 mb-2">
                {t('howItWorks.steps.0.title')}
              </h3>
              <p className="font-sans text-sm text-slate-500 leading-relaxed max-w-sm md:ml-auto">
                {t('howItWorks.steps.0.desc')}
              </p>
            </motion.div>

            {/* Dot Center */}
            <div 
              className={cn(
                "absolute left-6 -translate-x-1/2 md:left-1/2 md:-translate-x-1/2 top-6 md:top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 z-10",
                isStep1Active 
                  ? "border-2 border-[#b3ff6b] bg-black text-[#b3ff6b] shadow-[0_0_16px_rgba(179,255,107,0.5)]" 
                  : "border-2 border-slate-300 bg-white text-slate-400"
              )}
            >
              <Globe className="h-5 w-5" />
            </div>

            {/* Right Column (Placeholder) */}
            <div className="hidden md:block md:w-[calc(50%-40px)] md:pl-12" />
          </div>

          {/* PASO 2 */}
          <div 
            ref={step2Ref}
            className="relative flex flex-col md:flex-row items-start md:items-center justify-between mb-16 md:mb-28 pl-12 md:pl-0"
          >
            {/* Left Column (Placeholder) */}
            <div className="hidden md:block md:w-[calc(50%-40px)] md:pr-12" />

            {/* Dot Center */}
            <div 
              className={cn(
                "absolute left-6 -translate-x-1/2 md:left-1/2 md:-translate-x-1/2 top-6 md:top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 z-10",
                isStep2Active 
                  ? "border-2 border-[#9933c1] bg-black text-[#9933c1] shadow-[0_0_16px_rgba(153,51,193,0.5)]" 
                  : "border-2 border-slate-300 bg-white text-slate-400"
              )}
            >
              <ShieldCheck className="h-5 w-5" />
            </div>

            {/* Right Column (Desktop & Mobile: text-left) */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="w-full md:w-[calc(50%-40px)] md:pl-12 text-left"
            >
              <p className="text-[#9933c1] text-xs font-sans font-bold uppercase tracking-widest mb-1.5">
                PASO 02
              </p>
              <h3 className="font-sans text-2xl font-black text-slate-900 mb-2">
                {t('howItWorks.steps.1.title')}
              </h3>
              <p className="font-sans text-sm text-slate-500 leading-relaxed max-w-sm">
                {t('howItWorks.steps.1.desc')}
              </p>
            </motion.div>
          </div>

          {/* PASO 3 */}
          <div 
            ref={step3Ref}
            className="relative flex flex-col md:flex-row items-start md:items-center justify-between pl-12 md:pl-0"
          >
            {/* Left Column (Desktop: text-right, Mobile: text-left) */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="w-full md:w-[calc(50%-40px)] md:pr-12 text-left md:text-right"
            >
              <p className="text-[#7ab832] text-xs font-sans font-bold uppercase tracking-widest mb-1.5">
                PASO 03
              </p>
              <h3 className="font-sans text-2xl font-black text-slate-900 mb-2">
                {t('howItWorks.steps.2.title')}
              </h3>
              <p className="font-sans text-sm text-slate-500 leading-relaxed max-w-sm md:ml-auto">
                {t('howItWorks.steps.2.desc')}
              </p>
            </motion.div>

            {/* Dot Center */}
            <div 
              className={cn(
                "absolute left-6 -translate-x-1/2 md:left-1/2 md:-translate-x-1/2 top-6 md:top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 z-10",
                isStep3Active 
                  ? "border-2 border-[#b3ff6b] bg-black text-[#b3ff6b] shadow-[0_0_16px_rgba(179,255,107,0.5)]" 
                  : "border-2 border-slate-300 bg-white text-slate-400"
              )}
            >
              <Zap className="h-5 w-5" />
            </div>

            {/* Right Column (Placeholder) */}
            <div className="hidden md:block md:w-[calc(50%-40px)] md:pl-12" />
          </div>

        </div>

        {/* Bottom central primary action */}
        <div className="mt-16 sm:mt-24 text-center flex justify-center">
          <Link
            href="#destinations-section"
            onClick={(e) => handleScroll(e, 'destinations-section')}
          >
            <QuieroButton variant="primary" showArrow className="px-10 py-5 text-base">
              {t('hero.seePlans')}
            </QuieroButton>
          </Link>
        </div>

      </div>
    </section>
  );
}
