'use client';

import { useState, useRef, useEffect } from 'react';
import { Star, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import purpleWavesBg from '@/src/assets/images/purple_waves_bg_1779430079142.png';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function Testimonials() {
  const { fadeUp } = useScrollReveal();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const { t } = useLanguage();
  
  // Use translations for reviews
  const reviews = [0, 1, 2].map(i => ({
    id: `t${i}`,
    name: t(`testimonials.reviews.${i}.name`) as string,
    text: t(`testimonials.reviews.${i}.text`) as string,
    destination: t(`testimonials.reviews.${i}.location`) as string,
    originCountry: 'Local',
    rating: 5,
    avatar: (t(`testimonials.reviews.${i}.name`) as string).charAt(0)
  }));

  const [maxScrollIndex, setMaxScrollIndex] = useState(reviews.length > 3 ? reviews.length - 3 : 0);

  // Setup responsive items visibility
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        let visible = 3;
        if (window.innerWidth < 768) {
          visible = 1;
        } else if (window.innerWidth < 1024) {
          visible = 2;
        }
        setMaxScrollIndex(Math.max(0, reviews.length - visible));
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const scrollLeft = container.scrollLeft;
    // Estimate width of a single item block (card + gap)
    const itemElement = container.firstElementChild as HTMLElement;
    if (itemElement) {
      const itemWidth = itemElement.offsetWidth + 24; // width + gap
      const newIndex = Math.round(scrollLeft / itemWidth);
      setActiveIndex(Math.min(newIndex, reviews.length - 1));
    }
  };

  const scrollToIndex = (index: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const itemElement = container.firstElementChild as HTMLElement;
    if (itemElement) {
      const itemWidth = itemElement.offsetWidth + 24; // width + gap
      const newScrollLeft = index * itemWidth;
      
      container.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
      setActiveIndex(index);
    }
  };

  const slidePrev = () => {
    const nextIdx = Math.max(0, activeIndex - 1);
    scrollToIndex(nextIdx);
  };

  const slideNext = () => {
    const nextIdx = Math.min(maxScrollIndex, activeIndex + 1);
    scrollToIndex(nextIdx);
  };

  return (
    <section 
      className="pt-16 pb-20 md:pt-24 md:pb-28 bg-white text-zinc-900 relative overflow-hidden" 
      id="testimonials-section"
    >
      {/* Seamless transition gradient to bottom (slate-50) */}
      <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-b from-transparent to-slate-50 pointer-events-none z-0" />
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header with embedded Navigation controls */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12 gap-6">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
            className="max-w-[620px] space-y-2 text-left"
          >
            <span className="bg-black text-[#b3ff6b] px-3 py-1 rounded-full w-fit inline-block text-xs font-semibold tracking-[0.2em] uppercase mb-3">
              {t('testimonials.badge')}
            </span>
            <h2 className="font-sans text-3xl sm:text-4xl font-black tracking-tight text-zinc-900">
              {t('testimonials.title')}
            </h2>
            <p className="font-sans text-zinc-500 text-sm sm:text-base leading-relaxed">
              {t('testimonials.subtitle')}
            </p>
          </motion.div>
        </div>

        {/* Carousel Window */}
        <div className="relative px-0 md:px-12">
          {/* Slider controls (Arrows positioned on both extremities) */}
          <button
            onClick={slidePrev}
            disabled={activeIndex === 0}
            className={`absolute -left-2 md:left-0 top-1/2 -translate-y-1/2 z-20 h-11 w-11 rounded-full border flex items-center justify-center transition-all duration-200 bg-white/80 backdrop-blur-md shadow-xl ${
              activeIndex === 0 
                ? 'border-black/5 text-zinc-300 opacity-0 pointer-events-none' 
                : 'border-black/10 hover:border-[#b3ff6b]/50 hover:bg-[#b3ff6b]/10 text-zinc-900 cursor-pointer active:scale-95'
            }`}
            id="testimonial-prev-btn"
            aria-label="Anterior testimonio"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            onClick={slideNext}
            disabled={activeIndex >= maxScrollIndex}
            className={`absolute -right-2 md:right-0 top-1/2 -translate-y-1/2 z-20 h-11 w-11 rounded-full border flex items-center justify-center transition-all duration-200 bg-white/80 backdrop-blur-md shadow-xl ${
              activeIndex >= maxScrollIndex 
                ? 'border-black/5 text-zinc-300 opacity-0 pointer-events-none' 
                : 'border-black/10 hover:border-[#b3ff6b]/50 hover:bg-[#b3ff6b]/10 text-zinc-900 cursor-pointer active:scale-95'
            }`}
            id="testimonial-next-btn"
            aria-label="Siguiente testimonio"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Edge shadow fading gradient overlays to emphasize sliding (only on desktop) */}
          <div className="absolute left-12 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none z-10 hidden lg:block" />
          <div className="absolute right-12 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-10 hidden lg:block" />

          {/* Track sliding container (Scrollable + Snap) */}
          <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar pb-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {reviews.map((test) => (
              <div 
                key={test.id} 
                className="w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] shrink-0 snap-start"
              >
                <TestimonialCard test={test} />
              </div>
            ))}
          </div>
        </div>

        {/* Custom Progress Indicators (Dots) */}
        <div className="flex justify-center items-center gap-2 mt-8">
          {[...Array(maxScrollIndex + 1)].map((_, idx) => (
            <button
              key={idx}
              onClick={() => scrollToIndex(idx)}
              className={`h-2 transition-all duration-300 rounded-full cursor-pointer ${
                activeIndex === idx 
                  ? 'w-8 bg-[#9933c1]' 
                  : 'w-2 bg-black/10 hover:bg-black/20'
              }`}
              id={`testimonial-dot-${idx}`}
              aria-label={`Ir al testimonio ${idx + 1}`}
            />
          ))}
        </div>

        {/* Dynamic customer feedback callout with custom background image */}
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
          className="mt-16 rounded-2xl border border-[#9933c1]/35 p-6 sm:p-8 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left relative overflow-hidden bg-cover bg-center shadow-lg shadow-[#9933c1]/5"
          style={{ backgroundImage: `url(${purpleWavesBg.src})` }}
        >
          {/* Subtle dark backdrop tint overlay to ensure high readability of text */}
          <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-[2px] z-0" />

          <div className="space-y-1.5 max-w-2xl font-sans relative z-10">
            <h4 className="font-extrabold text-white text-sm sm:text-base flex justify-center md:justify-start items-center gap-2">
              <MessageSquare className="h-4 w-4 text-[#b3ff6b]" /> {t('testimonials.feedbackTitle')}
            </h4>
            <p className="text-xs text-white/80 leading-relaxed">
              {t('testimonials.feedbackDesc')}
            </p>
          </div>
          <a
            href="mailto:support@quierosim.com"
            className="rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/20 px-5 py-2.5 font-sans font-black text-xs shadow-sm shadow-black/10 transition duration-200 min-w-[180px] text-center relative z-10 backdrop-blur-sm cursor-pointer"
          >
            {t('testimonials.feedbackBtn')}
          </a>
        </motion.div>

      </div>
    </section>
  );
}

// Sub-component wrapper for each testimonial item
function TestimonialCard({ test }: { test: any }) {
  return (
    <div 
      className="group/test flex flex-col justify-between rounded-[20px] border border-black/5 bg-[#fafafa] p-6 hover:border-[#b3ff6b]/40 hover:bg-[#b3ff6b]/4 transition-all duration-300 relative overflow-hidden h-full min-h-[300px]"
    >
      {/* Decorative large serif double quote behind review text */}
      <span className="text-[140px] font-black text-[#b3ff6b]/5 leading-none absolute -top-8 -left-2 pointer-events-none select-none">
        “
      </span>

      <div className="space-y-4 relative z-10 flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          {/* Stars and verified indicator */}
          <div className="flex items-center justify-between">
            <div className="flex gap-0.5 text-[#b3ff6b]">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className={`h-4.5 w-4.5 ${
                    i < test.rating 
                      ? 'fill-[#b3ff6b] text-[#b3ff6b]' 
                      : 'text-zinc-700 fill-none'
                  }`} 
                />
              ))}
            </div>
            
            <span className="text-[9px] uppercase tracking-wider font-extrabold bg-black text-[#b3ff6b] px-3 py-1 rounded-full">
              Verificado
            </span>
          </div>

          {/* Review Text */}
          <p className="font-sans text-xs sm:text-sm text-zinc-500 leading-relaxed italic pr-2">
            &ldquo;{test.text}&rdquo;
          </p>
        </div>
      </div>

      {/* User info line */}
      <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-black/5 pt-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#b3ff6b] font-sans font-black text-xs text-black">
            {test.avatar}
          </div>
          <div>
            <h4 className="font-sans font-extrabold text-zinc-900 text-xs sm:text-sm leading-none">
              {test.name}
            </h4>
            <span className="font-sans text-[10px] text-zinc-500">
              {test.originCountry}
            </span>
          </div>
        </div>

        {/* Travel destination pill */}
        <span className="font-sans text-[10px] font-bold text-[#9933c1] bg-[#9933c1]/5 border border-[#9933c1]/10 px-2.5 py-1 rounded-md max-w-[140px] truncate">
          {test.destination}
        </span>
      </div>
    </div>
  );
}
