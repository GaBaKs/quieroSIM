'use client';

import { useState } from 'react';
import { ChevronsLeft, ChevronsRight, BadgeCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import Image from 'next/image';

export default function Testimonials() {
  const { fadeUp } = useScrollReveal();
  const [activeIndex, setActiveIndex] = useState(0);
  const { t } = useLanguage();
  
  // Custom images mapped to the translation reviews
  const reviewImages = [
    'https://images.unsplash.com/photo-1528605105345-5344ea20e269?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1506012787146-f92b2d7d6d96?auto=format&fit=crop&q=80&w=800'
  ];

  const reviews = [0, 1, 2].map(i => ({
    id: `t${i}`,
    name: t(`testimonials.reviews.${i}.name`) as string,
    text: t(`testimonials.reviews.${i}.text`) as string,
    destination: t(`testimonials.reviews.${i}.location`) as string,
    image: reviewImages[i]
  }));

  const handleNext = () => {
    setActiveIndex((prev) => (prev === reviews.length - 1 ? 0 : prev + 1));
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? reviews.length - 1 : prev - 1));
  };

  const currentReview = reviews[activeIndex];

  return (
    <section 
      className="py-20 md:py-32 bg-white text-zinc-900 overflow-hidden" 
      id="testimonials-section"
    >
      <div className="mx-auto max-w-6xl px-6 md:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          
          {/* Left Column - Content */}
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
            className="flex flex-col h-full justify-center"
          >
            {/* Title */}
            <h2 className="font-sans text-3xl sm:text-4xl md:text-[42px] font-black text-slate-900 tracking-tight mb-8 leading-tight">
              {t('testimonials.title')}
            </h2>
            
            {/* Quote Icon */}
            <div className="mb-4 text-slate-900 font-serif text-[60px] leading-none opacity-80 h-10">
              “
            </div>

            <div className="min-h-[140px] md:min-h-[160px] relative mt-2">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <p className="font-sans text-lg text-slate-600 leading-[1.8] font-normal">
                    {currentReview.text}
                  </p>
                  
                  {/* Name and verified buyer */}
                  <div className="flex items-center gap-2 pt-2">
                    <span className="font-sans text-[15px] font-semibold text-[#9933c1]">
                      {currentReview.name}
                    </span>
                    <BadgeCheck className="w-[18px] h-[18px] text-[#9933c1] ml-1" />
                    <span className="font-sans text-[14px] font-medium text-[#9933c1]">
                      {t('testimonials.verifiedBuyer')}
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation Controls */}
            <div className="flex flex-col gap-5 mt-10 w-fit">
              <div className="flex items-center gap-3 self-center">
                <button
                  onClick={handlePrev}
                  className="w-11 h-11 rounded-full bg-[#4a4a4a] hover:bg-slate-800 text-white flex items-center justify-center transition-colors"
                  aria-label="Anterior testimonio"
                >
                  <ChevronsLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNext}
                  className="w-11 h-11 rounded-full bg-[#9933c1] hover:bg-[#7100a5] text-white flex items-center justify-center transition-colors shadow-md shadow-[#9933c1]/20"
                  aria-label="Siguiente testimonio"
                >
                  <ChevronsRight className="w-5 h-5" />
                </button>
              </div>

              {/* Dots matching the exact image style (pill for active, small dot for inactive) */}
              <div className="flex items-center justify-center gap-2.5">
                {reviews.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveIndex(idx)}
                    className={`transition-all duration-300 rounded-full ${
                      activeIndex === idx 
                        ? 'w-6 h-2.5 bg-[#9933c1]' 
                        : 'w-2.5 h-2.5 bg-slate-200 hover:bg-slate-300'
                    }`}
                    aria-label={`Ir al testimonio ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right Column - Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
            className="relative w-full aspect-square md:aspect-[4/4] lg:aspect-[4/4.5] xl:aspect-square rounded-[2rem] overflow-hidden ml-auto lg:max-w-[500px]"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0"
              >
                <Image
                  src={currentReview.image}
                  alt={currentReview.name}
                  fill
                  className="object-cover"
                  referrerPolicy="no-referrer"
                  sizes="(max-width: 1024px) 100vw, 500px"
                  priority={activeIndex === 0}
                />
              </motion.div>
            </AnimatePresence>
          </motion.div>
          
        </div>
      </div>
    </section>
  );
}
