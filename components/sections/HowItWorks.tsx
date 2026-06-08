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
          <p className="text-[#9933c1] text-xs font-bold uppercase tracking-[0.2em] mb-3 inline-block">
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
        <div className="relative max-w-4xl mx-auto">
          
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
            className="relative flex flex-col md:flex-row items-center justify-between mb-16 md:mb-28 pl-14 md:pl-0"
          >
            {/* Left Column: Image (Desktop: Left, Mobile: Bottom or Top depending on flex-row-reverse) */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5 }}
              className="hidden md:flex w-full md:w-[calc(50%-40px)] md:pr-12 justify-center lg:justify-end"
            >
              <svg viewBox="0 0 400 300" className="w-full h-auto max-w-[280px] drop-shadow-xl">
                <defs>
                  <linearGradient id="s1-g1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor:'#18181b', stopOpacity:1}} />
                    <stop offset="100%" style={{stopColor:'#3f3f46', stopOpacity:1}} />
                  </linearGradient>
                  <linearGradient id="s1-g2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor:'#9933c1', stopOpacity:1}} />
                    <stop offset="100%" style={{stopColor:'#7100a5', stopOpacity:1}} />
                  </linearGradient>
                  <clipPath id="s1-screen-clip">
                    <rect x="146" y="36" width="118" height="218" rx="14" />
                  </clipPath>
                </defs>
                
                {/* Shadow */}
                <ellipse cx="200" cy="280" rx="120" ry="15" fill="#e4e4e7" opacity="0.8" />
                
                {/* Phone Base 3D layer */}
                <rect x="155" y="45" width="130" height="230" rx="20" fill="#a1a1aa" />
                
                {/* Phone Main Body */}
                <rect x="140" y="30" width="130" height="230" rx="20" fill="url(#s1-g1)" />
                <rect x="146" y="36" width="118" height="218" rx="14" fill="#ffffff" />
                
                {/* Screen elements - Split & Landmarks */}
                <g clipPath="url(#s1-screen-clip)">
                  {/* Backgrounds */}
                  <rect x="146" y="36" width="118" height="109" fill="#f4f4f5" />
                  <rect x="146" y="145" width="118" height="109" fill="#e4e4e7" />
                  <line x1="146" y1="145" x2="264" y2="145" stroke="#ffffff" strokeWidth="4" />
                  
                  {/* Eiffel Tower (Top) */}
                  <g transform="translate(205, 120) scale(0.55)">
                    <path d="M-40 80 Q -20 20 -10 -10 L 10 -10 Q 20 20 40 80" fill="none" stroke="#a1a1aa" strokeWidth="10" />
                    <path d="M-25 80 Q 0 40 25 80" fill="none" stroke="#a1a1aa" strokeWidth="6" />
                    <path d="M-10 -10 L -6 -60 L 6 -60 L 10 -10" fill="none" stroke="#a1a1aa" strokeWidth="8" />
                    <path d="M-6 -60 L 0 -100 L 6 -60" fill="none" stroke="#a1a1aa" strokeWidth="6" />
                    <circle cx="0" cy="-100" r="4" fill="#a1a1aa" />
                    <rect x="-20" y="-10" width="40" height="8" rx="3" fill="#a1a1aa" />
                    <rect x="-12" y="-64" width="24" height="6" rx="2" fill="#a1a1aa" />
                  </g>

                  {/* Pyramids (Bottom) */}
                  <g transform="translate(205, 235) scale(0.9)">
                    <polygon points="-30,10 0,-30 15,10" fill="#a1a1aa" />
                    <polygon points="0,-30 40,0 15,10" fill="#71717a" opacity="0.6" />
                    <polygon points="-45,10 -25,-10 -10,10" fill="#a1a1aa" />
                    <polygon points="-25,-10 5,0 -10,10" fill="#71717a" opacity="0.6"/>
                  </g>
                </g>

                {/* Notch */}
                <path d="M185 36 L225 36 a 0 0 0 0 1 0 0 v 8 a 6 6 0 0 1 -6 6 h -28 a 6 6 0 0 1 -6 -6 v -8 z" fill="url(#s1-g1)" />
                
                {/* Magnifying Glass */}
                <g transform="translate(230, 170)">
                  <circle cx="30" cy="30" r="25" fill="#ffffff" stroke="#18181b" strokeWidth="8" />
                  <circle cx="30" cy="30" r="15" fill="#b3ff6b" opacity="0.2" />
                  <line x1="48" y1="48" x2="80" y2="80" stroke="#18181b" strokeWidth="12" strokeLinecap="round" />
                  <line x1="50" y1="50" x2="75" y2="75" stroke="#b3ff6b" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
                </g>
                
                
              </svg>
            </motion.div>

            {/* Dot Center */}
            <div 
              className={cn(
                "absolute left-6 -translate-x-1/2 md:left-1/2 md:-translate-x-1/2 top-0 md:top-1/2 md:-translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-500 z-10 bg-white",
                isStep1Active 
                  ? "border-[3px] border-[#18181b] bg-white text-[#18181b]" 
                  : "border-2 border-slate-300 bg-white text-slate-400"
              )}
            >
              <span className="font-sans font-black text-sm md:text-lg">1</span>
            </div>

            {/* Right Column: Text */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="w-full md:w-[calc(50%-40px)] md:pl-12 text-left"
            >
              <h3 className="font-sans text-xl md:text-2xl font-black text-slate-900 mb-3">
                {t('howItWorks.steps.0.title')}
              </h3>
              <p className="font-sans text-sm md:text-sm text-slate-500 leading-relaxed max-w-sm mb-6">
                {t('howItWorks.steps.0.desc')}
              </p>
              
              <div className="md:hidden flex justify-center my-8">
                <svg viewBox="0 0 400 300" className="w-full h-auto max-w-[280px] drop-shadow-xl">
                  <defs>
                    <linearGradient id="s1b-g1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{stopColor:'#18181b', stopOpacity:1}} />
                      <stop offset="100%" style={{stopColor:'#3f3f46', stopOpacity:1}} />
                    </linearGradient>
                    <linearGradient id="s1b-g2" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{stopColor:'#9933c1', stopOpacity:1}} />
                      <stop offset="100%" style={{stopColor:'#7100a5', stopOpacity:1}} />
                    </linearGradient>
                    <clipPath id="s1b-screen-clip">
                      <rect x="146" y="36" width="118" height="218" rx="14" />
                    </clipPath>
                  </defs>
                  
                  {/* Shadow */}
                  <ellipse cx="200" cy="280" rx="120" ry="15" fill="#e4e4e7" opacity="0.8" />
                  
                  {/* Phone Base 3D layer */}
                  <rect x="155" y="45" width="130" height="230" rx="20" fill="#a1a1aa" />
                  
                  {/* Phone Main Body */}
                  <rect x="140" y="30" width="130" height="230" rx="20" fill="url(#s1b-g1)" />
                  <rect x="146" y="36" width="118" height="218" rx="14" fill="#ffffff" />
                  
                  {/* Screen elements - Split & Landmarks */}
                  <g clipPath="url(#s1b-screen-clip)">
                    {/* Backgrounds */}
                    <rect x="146" y="36" width="118" height="109" fill="#f4f4f5" />
                    <rect x="146" y="145" width="118" height="109" fill="#e4e4e7" />
                    <line x1="146" y1="145" x2="264" y2="145" stroke="#ffffff" strokeWidth="4" />
                    
                    {/* Eiffel Tower (Top) */}
                    <g transform="translate(205, 120) scale(0.55)">
                      <path d="M-40 80 Q -20 20 -10 -10 L 10 -10 Q 20 20 40 80" fill="none" stroke="#a1a1aa" strokeWidth="10" />
                      <path d="M-25 80 Q 0 40 25 80" fill="none" stroke="#a1a1aa" strokeWidth="6" />
                      <path d="M-10 -10 L -6 -60 L 6 -60 L 10 -10" fill="none" stroke="#a1a1aa" strokeWidth="8" />
                      <path d="M-6 -60 L 0 -100 L 6 -60" fill="none" stroke="#a1a1aa" strokeWidth="6" />
                      <circle cx="0" cy="-100" r="4" fill="#a1a1aa" />
                      <rect x="-20" y="-10" width="40" height="8" rx="3" fill="#a1a1aa" />
                      <rect x="-12" y="-64" width="24" height="6" rx="2" fill="#a1a1aa" />
                    </g>

                    {/* Pyramids (Bottom) */}
                    <g transform="translate(205, 235) scale(0.9)">
                      <polygon points="-30,10 0,-30 15,10" fill="#a1a1aa" />
                      <polygon points="0,-30 40,0 15,10" fill="#71717a" opacity="0.6" />
                      <polygon points="-45,10 -25,-10 -10,10" fill="#a1a1aa" />
                      <polygon points="-25,-10 5,0 -10,10" fill="#71717a" opacity="0.6"/>
                    </g>
                  </g>

                  {/* Notch */}
                  <path d="M185 36 L225 36 a 0 0 0 0 1 0 0 v 8 a 6 6 0 0 1 -6 6 h -28 a 6 6 0 0 1 -6 -6 v -8 z" fill="url(#s1b-g1)" />
                  
                  {/* Magnifying Glass */}
                  <g transform="translate(230, 170)">
                    <circle cx="30" cy="30" r="25" fill="#ffffff" stroke="#18181b" strokeWidth="8" />
                    <circle cx="30" cy="30" r="15" fill="#b3ff6b" opacity="0.2" />
                    <line x1="48" y1="48" x2="80" y2="80" stroke="#18181b" strokeWidth="12" strokeLinecap="round" />
                    <line x1="50" y1="50" x2="75" y2="75" stroke="#b3ff6b" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
                  </g>
                  
                  
                </svg>
              </div>

              <Link href="#FAQ" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 hover:text-[#9933c1] transition-colors border-b border-black">
                ¿Tu celular acepta eSIM? &rarr;
              </Link>
            </motion.div>
          </div>

          {/* PASO 2 */}
          <div 
            ref={step2Ref}
            className="relative flex flex-col md:flex-row items-center justify-between mb-16 md:mb-28 pl-14 md:pl-0"
          >
            {/* Left Column: Text */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5 }}
              className="w-full md:w-[calc(50%-40px)] md:pr-12 text-left md:text-right"
            >
              <h3 className="font-sans text-xl md:text-2xl font-black text-slate-900 mb-3">
                {t('howItWorks.steps.1.title')}
              </h3>
              <p className="font-sans text-sm md:text-sm text-slate-500 leading-relaxed max-w-sm md:ml-auto mb-6">
                {t('howItWorks.steps.1.desc')}
              </p>

              <div className="md:hidden flex justify-center my-8 pl-4">
                <svg viewBox="0 0 400 300" className="w-full h-auto max-w-[280px] drop-shadow-xl">
                  <defs>
                    <linearGradient id="s2b-gCart" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{stopColor:'#18181b', stopOpacity:1}} />
                      <stop offset="100%" style={{stopColor:'#3f3f46', stopOpacity:1}} />
                    </linearGradient>
                    <linearGradient id="s2b-gPlan1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{stopColor:'#9933c1', stopOpacity:1}} />
                      <stop offset="100%" style={{stopColor:'#7100a5', stopOpacity:1}} />
                    </linearGradient>
                    <linearGradient id="s2b-gPlan2" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{stopColor:'#b3ff6b', stopOpacity:1}} />
                      <stop offset="100%" style={{stopColor:'#8de541', stopOpacity:1}} />
                    </linearGradient>
                  </defs>

                  {/* Shadow */}
                  <ellipse cx="200" cy="270" rx="120" ry="15" fill="#e4e4e7" opacity="0.8" />
                  
                  {/* Eiffel Tower Background Element */}
                  <g transform="translate(200, 70) scale(0.9)">
                    <path d="M-50 100 Q -25 20 -15 0 L 15 0 Q 25 20 50 100" fill="none" stroke="#d4d4d8" strokeWidth="12" />
                    <path d="M-30 100 Q 0 50 30 100" fill="none" stroke="#d4d4d8" strokeWidth="8" />
                    <path d="M-15 0 L -8 -60 L 8 -60 L 15 0" fill="none" stroke="#d4d4d8" strokeWidth="10" />
                    <path d="M-8 -60 L 0 -120 L 8 -60" fill="none" stroke="#d4d4d8" strokeWidth="8" />
                    <circle cx="0" cy="-120" r="4" fill="#d4d4d8" />
                    <rect x="-25" y="-5" width="50" height="10" rx="3" fill="#a1a1aa" />
                    <rect x="-15" y="-65" width="30" height="8" rx="3" fill="#a1a1aa" />
                  </g>

                  {/* Phone Base 3D layer */}
                  <rect x="145" y="45" width="110" height="200" rx="16" fill="#a1a1aa" opacity="0.9" />
                  
                  {/* Phone Main Body */}
                  <rect x="135" y="35" width="110" height="200" rx="16" fill="url(#s2b-gCart)" />
                  <rect x="140" y="40" width="100" height="190" rx="12" fill="#ffffff" />
                  
                  {/* Screen elements (UI) */}
                  <rect x="148" y="50" width="84" height="60" rx="8" fill="#f4f4f5" />
                  <circle cx="190" cy="80" r="15" fill="#b3ff6b" />
                  <path d="M190 70 L200 90 L180 90 Z" fill="#9933c1" />
                  
                  {/* Notch */}
                  <path d="M175 40 L205 40 a 0 0 0 0 1 0 0 v 6 a 4 4 0 0 1 -4 4 h -22 a 4 4 0 0 1 -4 -4 v -6 z" fill="url(#s2b-gCart)" />
                  
                  {/* Large Checkmark Badge */}
                  <g transform="translate(240, 150)">
                    <circle cx="0" cy="0" r="35" fill="url(#s2b-gPlan2)" />
                    <circle cx="0" cy="0" r="28" fill="none" stroke="#ffffff" strokeWidth="2" strokeDasharray="3 3" opacity="0.5" />
                    <path d="M-15 0 L -5 10 L 15 -10" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                  </g>

                  {/* Shopping Cart Substrate */}
                  <g transform="translate(40, 150)">
                    {/* Cart basket detailed */}
                    <path d="M40 0 L180 0 L150 70 L55 70 Z" fill="#ffffff" stroke="url(#s2b-gCart)" strokeWidth="12" strokeLinejoin="round" />
                    
                    {/* Grid lines */}
                    <line x1="70" y1="0" x2="80" y2="70" stroke="url(#s2b-gCart)" strokeWidth="6" />
                    <line x1="105" y1="0" x2="105" y2="70" stroke="url(#s2b-gCart)" strokeWidth="6" />
                    <line x1="140" y1="0" x2="130" y2="70" stroke="url(#s2b-gCart)" strokeWidth="6" />
                    <line x1="45" y1="35" x2="165" y2="35" stroke="url(#s2b-gCart)" strokeWidth="6" />

                    {/* Handle & frame */}
                    <path d="M0 -30 L25 -30 L40 0 L55 70 L30 110 L150 110" fill="none" stroke="url(#s2b-gCart)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
                    
                    {/* Handle grip */}
                    <line x1="-5" y1="-30" x2="30" y2="-30" stroke="#9933c1" strokeWidth="16" strokeLinecap="round" />
                    
                    {/* Wheels */}
                    <circle cx="60" cy="110" r="16" fill="url(#s2b-gCart)" />
                    <circle cx="60" cy="110" r="6" fill="#ffffff" />
                    
                    <circle cx="130" cy="110" r="16" fill="url(#s2b-gCart)" />
                    <circle cx="130" cy="110" r="6" fill="#ffffff" />
                  </g>
                </svg>
              </div>

            </motion.div>

            {/* Dot Center */}
            <div 
              className={cn(
                "absolute left-6 -translate-x-1/2 md:left-1/2 md:-translate-x-1/2 top-0 md:top-1/2 md:-translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-500 z-10 bg-white",
                isStep2Active 
                  ? "border-[3px] border-[#18181b] bg-white text-[#18181b]" 
                  : "border-2 border-slate-300 bg-white text-slate-400"
              )}
            >
              <span className="font-sans font-black text-sm md:text-lg">2</span>
            </div>

            {/* Right Column: Image */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="hidden md:flex w-full md:w-[calc(50%-40px)] md:pl-12 justify-center lg:justify-start"
            >
              <svg viewBox="0 0 400 300" className="w-full h-auto max-w-[280px] drop-shadow-xl">
                <defs>
                  <linearGradient id="s2-gCart" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor:'#18181b', stopOpacity:1}} />
                    <stop offset="100%" style={{stopColor:'#3f3f46', stopOpacity:1}} />
                  </linearGradient>
                  <linearGradient id="s2-gPlan1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor:'#9933c1', stopOpacity:1}} />
                    <stop offset="100%" style={{stopColor:'#7100a5', stopOpacity:1}} />
                  </linearGradient>
                  <linearGradient id="s2-gPlan2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor:'#b3ff6b', stopOpacity:1}} />
                    <stop offset="100%" style={{stopColor:'#8de541', stopOpacity:1}} />
                  </linearGradient>
                </defs>

                {/* Shadow */}
                <ellipse cx="200" cy="270" rx="120" ry="15" fill="#e4e4e7" opacity="0.8" />
                
                {/* Eiffel Tower Background Element */}
                <g transform="translate(200, 70) scale(0.9)">
                  <path d="M-50 100 Q -25 20 -15 0 L 15 0 Q 25 20 50 100" fill="none" stroke="#d4d4d8" strokeWidth="12" />
                  <path d="M-30 100 Q 0 50 30 100" fill="none" stroke="#d4d4d8" strokeWidth="8" />
                  <path d="M-15 0 L -8 -60 L 8 -60 L 15 0" fill="none" stroke="#d4d4d8" strokeWidth="10" />
                  <path d="M-8 -60 L 0 -120 L 8 -60" fill="none" stroke="#d4d4d8" strokeWidth="8" />
                  <circle cx="0" cy="-120" r="4" fill="#d4d4d8" />
                  <rect x="-25" y="-5" width="50" height="10" rx="3" fill="#a1a1aa" />
                  <rect x="-15" y="-65" width="30" height="8" rx="3" fill="#a1a1aa" />
                </g>

                {/* Phone Base 3D layer */}
                <rect x="145" y="45" width="110" height="200" rx="16" fill="#a1a1aa" opacity="0.9" />
                
                {/* Phone Main Body */}
                <rect x="135" y="35" width="110" height="200" rx="16" fill="url(#s2-gCart)" />
                <rect x="140" y="40" width="100" height="190" rx="12" fill="#ffffff" />
                
                {/* Screen elements (UI) */}
                <rect x="148" y="50" width="84" height="60" rx="8" fill="#f4f4f5" />
                <circle cx="190" cy="80" r="15" fill="#b3ff6b" />
                <path d="M190 70 L200 90 L180 90 Z" fill="#9933c1" />
                
                {/* Notch */}
                <path d="M175 40 L205 40 a 0 0 0 0 1 0 0 v 6 a 4 4 0 0 1 -4 4 h -22 a 4 4 0 0 1 -4 -4 v -6 z" fill="url(#s2-gCart)" />
                
                {/* Large Checkmark Badge */}
                <g transform="translate(240, 150)">
                  <circle cx="0" cy="0" r="35" fill="url(#s2-gPlan2)" />
                  <circle cx="0" cy="0" r="28" fill="none" stroke="#ffffff" strokeWidth="2" strokeDasharray="3 3" opacity="0.5" />
                  <path d="M-15 0 L -5 10 L 15 -10" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                </g>

                {/* Shopping Cart Substrate */}
                <g transform="translate(40, 150)">
                  {/* Cart basket detailed */}
                  <path d="M40 0 L180 0 L150 70 L55 70 Z" fill="#ffffff" stroke="url(#s2-gCart)" strokeWidth="12" strokeLinejoin="round" />
                  
                  {/* Grid lines */}
                  <line x1="70" y1="0" x2="80" y2="70" stroke="url(#s2-gCart)" strokeWidth="6" />
                  <line x1="105" y1="0" x2="105" y2="70" stroke="url(#s2-gCart)" strokeWidth="6" />
                  <line x1="140" y1="0" x2="130" y2="70" stroke="url(#s2-gCart)" strokeWidth="6" />
                  <line x1="45" y1="35" x2="165" y2="35" stroke="url(#s2-gCart)" strokeWidth="6" />

                  {/* Handle & frame */}
                  <path d="M0 -30 L25 -30 L40 0 L55 70 L30 110 L150 110" fill="none" stroke="url(#s2-gCart)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
                  
                  {/* Handle grip */}
                  <line x1="-5" y1="-30" x2="30" y2="-30" stroke="#9933c1" strokeWidth="16" strokeLinecap="round" />
                  
                  {/* Wheels */}
                  <circle cx="60" cy="110" r="16" fill="url(#s2-gCart)" />
                  <circle cx="60" cy="110" r="6" fill="#ffffff" />
                  
                  <circle cx="130" cy="110" r="16" fill="url(#s2-gCart)" />
                  <circle cx="130" cy="110" r="6" fill="#ffffff" />
                </g>
              </svg>
            </motion.div>
          </div>

          {/* PASO 3 */}
          <div 
            ref={step3Ref}
            className="relative flex flex-col md:flex-row items-center justify-between pl-14 md:pl-0"
          >
            {/* Left Column: Image */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="hidden md:flex w-full md:w-[calc(50%-40px)] md:pr-12 justify-center lg:justify-end"
            >
              <svg viewBox="0 0 400 300" className="w-full h-auto max-w-[280px] drop-shadow-xl">
                <defs>
                  <linearGradient id="s3-qrGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor:'#ffffff', stopOpacity:1}} />
                    <stop offset="100%" style={{stopColor:'#f4f4f5', stopOpacity:1}} />
                  </linearGradient>
                  <linearGradient id="s3-phoneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor:'#18181b', stopOpacity:1}} />
                    <stop offset="100%" style={{stopColor:'#3f3f46', stopOpacity:1}} />
                  </linearGradient>
                </defs>

                {/* Shadow */}
                <ellipse cx="200" cy="270" rx="130" ry="15" fill="#e4e4e7" opacity="0.8" />

                {/* Flight Ticket */}
                <g transform="translate(40, 100) rotate(-15)">
                  <path d="M0 0 L150 0 C 160 0, 160 20, 170 20 C 180 20, 180 0, 190 0 L220 0 L220 80 L190 80 C 180 80, 180 60, 170 60 C 160 60, 160 80, 150 80 L0 80 Z" fill="#b3ff6b" />
                  <line x1="170" y1="25" x2="170" y2="55" stroke="#18181b" strokeWidth="4" strokeDasharray="4 4" />
                  {/* Barcode */}
                  <rect x="20" y="20" width="8" height="40" fill="#18181b" />
                  <rect x="32" y="20" width="4" height="40" fill="#18181b" />
                  <rect x="40" y="20" width="12" height="40" fill="#18181b" />
                  <rect x="56" y="20" width="4" height="40" fill="#18181b" />
                  {/* Plane icon */}
                  <path d="M120 40 L130 35 L145 40 L130 45 Z" fill="#18181b" />
                </g>

                {/* QR Code Board */}
                <g transform="translate(200, 30)">
                  <rect x="0" y="0" width="120" height="120" rx="16" fill="url(#s3-qrGrad)" stroke="#e4e4e7" strokeWidth="4" />
                  {/* QR Squares */}
                  <rect x="15" y="15" width="30" height="30" rx="4" fill="#9933c1" />
                  <rect x="22" y="22" width="16" height="16" rx="2" fill="#ffffff" />
                  
                  <rect x="75" y="15" width="30" height="30" rx="4" fill="#9933c1" />
                  <rect x="82" y="22" width="16" height="16" rx="2" fill="#ffffff" />
                  
                  <rect x="15" y="75" width="30" height="30" rx="4" fill="#9933c1" />
                  <rect x="22" y="82" width="16" height="16" rx="2" fill="#ffffff" />
                  
                  <rect x="75" y="75" width="10" height="10" rx="2" fill="#18181b" />
                  <rect x="90" y="75" width="15" height="15" rx="2" fill="#18181b" />
                  <rect x="75" y="90" width="30" height="15" rx="2" fill="#18181b" />
                  <rect x="55" y="15" width="10" height="30" rx="2" fill="#18181b" />
                  <rect x="15" y="55" width="30" height="10" rx="2" fill="#18181b" />
                  <rect x="55" y="55" width="50" height="10" rx="2" fill="#18181b" />
                </g>

                {/* Smart Phone Scanning */}
                <g transform="translate(100, 110)">
                  {/* Laser scan beam */}
                  <polygon points="100,0 220,-30 220,90 100,60" fill="#b3ff6b" opacity="0.3" />
                  
                  {/* Phone Base 3D */}
                  <rect x="10" y="15" width="85" height="165" rx="16" fill="#a1a1aa" transform="rotate(15)" />
                  {/* Phone Main Body */}
                  <rect x="0" y="0" width="85" height="165" rx="16" fill="url(#s3-phoneGrad)" transform="rotate(15)" />
                  {/* Phone Screen */}
                  <rect x="4" y="4" width="77" height="157" rx="12" fill="#ffffff" transform="rotate(15)" />
                  
                  {/* Screen UI - Scan frame */}
                  <g transform="rotate(15)">
                    <path d="M15 30 L25 30 M15 30 L15 40" fill="none" stroke="#b3ff6b" strokeWidth="4" strokeLinecap="round" />
                    <path d="M70 30 L60 30 M70 30 L70 40" fill="none" stroke="#b3ff6b" strokeWidth="4" strokeLinecap="round" />
                    <path d="M15 110 L25 110 M15 110 L15 100" fill="none" stroke="#b3ff6b" strokeWidth="4" strokeLinecap="round" />
                    <path d="M70 110 L60 110 M70 110 L70 100" fill="none" stroke="#b3ff6b" strokeWidth="4" strokeLinecap="round" />
                    {/* Scan line */}
                    <line x1="15" y1="70" x2="70" y2="70" stroke="#9933c1" strokeWidth="2" />
                    <ellipse cx="42" cy="70" rx="20" ry="4" fill="#9933c1" opacity="0.5" />
                  </g>
                </g>

                {/* Floating Signal / WiFi symbol */}
                <g transform="translate(320, 150)">
                  <path d="M30 0 A 30 30 0 0 0 -30 0" fill="none" stroke="#b3ff6b" strokeWidth="6" strokeLinecap="round" />
                  <path d="M20 10 A 20 20 0 0 0 -20 10" fill="none" stroke="#b3ff6b" strokeWidth="6" strokeLinecap="round" opacity="0.7" />
                  <path d="M10 20 A 10 10 0 0 0 -10 20" fill="none" stroke="#b3ff6b" strokeWidth="6" strokeLinecap="round" opacity="0.4" />
                  <circle cx="0" cy="30" r="4" fill="#b3ff6b" />
                </g>
              </svg>
            </motion.div>

            {/* Dot Center */}
            <div 
              className={cn(
                "absolute left-6 -translate-x-1/2 md:left-1/2 md:-translate-x-1/2 top-0 md:top-1/2 md:-translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-500 z-10 bg-white",
                isStep3Active 
                  ? "border-[3px] border-[#18181b] bg-white text-[#18181b]" 
                  : "border-2 border-slate-300 bg-white text-slate-400"
              )}
            >
              <span className="font-sans font-black text-sm md:text-lg">3</span>
            </div>

            {/* Right Column: Text */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="w-full md:w-[calc(50%-40px)] md:pl-12 text-left"
            >
              <h3 className="font-sans text-xl md:text-2xl font-black text-slate-900 mb-3">
                {t('howItWorks.steps.2.title')}
              </h3>
              <p className="font-sans text-sm md:text-sm text-slate-500 leading-relaxed max-w-sm mb-6">
                {t('howItWorks.steps.2.desc')}
              </p>

              <div className="md:hidden flex justify-center my-8">
                <svg viewBox="0 0 400 300" className="w-full h-auto max-w-[280px] drop-shadow-xl">
                  <defs>
                    <linearGradient id="s3b-qrGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{stopColor:'#ffffff', stopOpacity:1}} />
                      <stop offset="100%" style={{stopColor:'#f4f4f5', stopOpacity:1}} />
                    </linearGradient>
                    <linearGradient id="s3b-phoneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{stopColor:'#18181b', stopOpacity:1}} />
                      <stop offset="100%" style={{stopColor:'#3f3f46', stopOpacity:1}} />
                    </linearGradient>
                  </defs>

                  {/* Shadow */}
                  <ellipse cx="200" cy="270" rx="130" ry="15" fill="#e4e4e7" opacity="0.8" />

                  {/* Flight Ticket */}
                  <g transform="translate(40, 100) rotate(-15)">
                    <path d="M0 0 L150 0 C 160 0, 160 20, 170 20 C 180 20, 180 0, 190 0 L220 0 L220 80 L190 80 C 180 80, 180 60, 170 60 C 160 60, 160 80, 150 80 L0 80 Z" fill="#b3ff6b" />
                    <line x1="170" y1="25" x2="170" y2="55" stroke="#18181b" strokeWidth="4" strokeDasharray="4 4" />
                    {/* Barcode */}
                    <rect x="20" y="20" width="8" height="40" fill="#18181b" />
                    <rect x="32" y="20" width="4" height="40" fill="#18181b" />
                    <rect x="40" y="20" width="12" height="40" fill="#18181b" />
                    <rect x="56" y="20" width="4" height="40" fill="#18181b" />
                    {/* Plane icon */}
                    <path d="M120 40 L130 35 L145 40 L130 45 Z" fill="#18181b" />
                  </g>

                  {/* QR Code Board */}
                  <g transform="translate(200, 30)">
                    <rect x="0" y="0" width="120" height="120" rx="16" fill="url(#s3b-qrGrad)" stroke="#e4e4e7" strokeWidth="4" />
                    {/* QR Squares */}
                    <rect x="15" y="15" width="30" height="30" rx="4" fill="#9933c1" />
                    <rect x="22" y="22" width="16" height="16" rx="2" fill="#ffffff" />
                    
                    <rect x="75" y="15" width="30" height="30" rx="4" fill="#9933c1" />
                    <rect x="82" y="22" width="16" height="16" rx="2" fill="#ffffff" />
                    
                    <rect x="15" y="75" width="30" height="30" rx="4" fill="#9933c1" />
                    <rect x="22" y="82" width="16" height="16" rx="2" fill="#ffffff" />
                    
                    <rect x="75" y="75" width="10" height="10" rx="2" fill="#18181b" />
                    <rect x="90" y="75" width="15" height="15" rx="2" fill="#18181b" />
                    <rect x="75" y="90" width="30" height="15" rx="2" fill="#18181b" />
                    <rect x="55" y="15" width="10" height="30" rx="2" fill="#18181b" />
                    <rect x="15" y="55" width="30" height="10" rx="2" fill="#18181b" />
                    <rect x="55" y="55" width="50" height="10" rx="2" fill="#18181b" />
                  </g>

                  {/* Smart Phone Scanning */}
                  <g transform="translate(100, 110)">
                    {/* Laser scan beam */}
                    <polygon points="100,0 220,-30 220,90 100,60" fill="#b3ff6b" opacity="0.3" />
                    
                    {/* Phone Base 3D */}
                    <rect x="10" y="15" width="85" height="165" rx="16" fill="#a1a1aa" transform="rotate(15)" />
                    {/* Phone Main Body */}
                    <rect x="0" y="0" width="85" height="165" rx="16" fill="url(#s3b-phoneGrad)" transform="rotate(15)" />
                    {/* Phone Screen */}
                    <rect x="4" y="4" width="77" height="157" rx="12" fill="#ffffff" transform="rotate(15)" />
                    
                    {/* Screen UI - Scan frame */}
                    <g transform="rotate(15)">
                      <path d="M15 30 L25 30 M15 30 L15 40" fill="none" stroke="#b3ff6b" strokeWidth="4" strokeLinecap="round" />
                      <path d="M70 30 L60 30 M70 30 L70 40" fill="none" stroke="#b3ff6b" strokeWidth="4" strokeLinecap="round" />
                      <path d="M15 110 L25 110 M15 110 L15 100" fill="none" stroke="#b3ff6b" strokeWidth="4" strokeLinecap="round" />
                      <path d="M70 110 L60 110 M70 110 L70 100" fill="none" stroke="#b3ff6b" strokeWidth="4" strokeLinecap="round" />
                      {/* Scan line */}
                      <line x1="15" y1="70" x2="70" y2="70" stroke="#9933c1" strokeWidth="2" />
                      <ellipse cx="42" cy="70" rx="20" ry="4" fill="#9933c1" opacity="0.5" />
                    </g>
                  </g>

                  {/* Floating Signal / WiFi symbol */}
                  <g transform="translate(320, 150)">
                    <path d="M30 0 A 30 30 0 0 0 -30 0" fill="none" stroke="#b3ff6b" strokeWidth="6" strokeLinecap="round" />
                    <path d="M20 10 A 20 20 0 0 0 -20 10" fill="none" stroke="#b3ff6b" strokeWidth="6" strokeLinecap="round" opacity="0.7" />
                    <path d="M10 20 A 10 10 0 0 0 -10 20" fill="none" stroke="#b3ff6b" strokeWidth="6" strokeLinecap="round" opacity="0.4" />
                    <circle cx="0" cy="30" r="4" fill="#b3ff6b" />
                  </g>
                </svg>
              </div>
            </motion.div>
          </div>

        </div>

        {/* Bottom central primary action */}
        <div className="mt-16 sm:mt-24 text-center flex justify-center">
          <Link
            href="#destinations-section"
            onClick={(e) => handleScroll(e, 'destinations-section')}
          >
            <QuieroButton variant="secondary" showArrow className="px-10 py-5 text-base">
              {t('hero.seePlans')}
            </QuieroButton>
          </Link>
        </div>

      </div>
    </section>
  );
}
