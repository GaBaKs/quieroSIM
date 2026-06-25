'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import whiteGreyBg from '@/src/assets/images/whitegreybg.jpg';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function FAQ({ plainMode = false }: { plainMode?: boolean }) {
  const { fadeUp } = useScrollReveal();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { t } = useLanguage();

  const faqs = t('faq.items') as unknown as Array<{ q: string, a: string }>;

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section 
      style={plainMode ? {} : { backgroundImage: `url(${whiteGreyBg.src})` }}
      className={`py-14 md:py-20 relative overflow-hidden ${plainMode ? 'bg-transparent' : 'bg-slate-50 bg-cover bg-center'}`} 
      id="faq-section"
    >
      {/* Subtle fade overlay to keep contrast high and ensure readability */}
      {!plainMode && <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-0" />}

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
          className="mx-auto max-w-[680px] text-center mb-16 space-y-2"
        >
          <span className="text-[#9933c1] dark:text-[#b3ff6b] text-xs font-semibold tracking-[0.2em] uppercase mb-3 block">
            {t('faq.badge')}
          </span>
          <h2 className="font-sans text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            {t('faq.title')}
          </h2>
          <p className="font-sans text-slate-500 dark:text-zinc-400 text-sm sm:text-base leading-relaxed">
            {t('faq.subtitle')}
          </p>
        </motion.div>

        {/* FAQ Accordion list */}
        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <motion.div 
                key={index} 
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className={`rounded-2xl border transition-[border,background,shadow] duration-300 overflow-hidden ${
                  isOpen 
                    ? 'border-[#9933c1]/40 bg-[#9933c1]/[0.02] dark:bg-[#9933c1]/10 shadow-[0_4px_20px_rgba(153,51,193,0.03)]' 
                    : 'border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 hover:border-slate-350 dark:hover:border-white/20 shadow-xs'
                }`}
                id={`faq-item-${index}`}
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full flex items-center justify-between p-5 sm:p-6 text-left hover:bg-zinc-50/20 dark:hover:bg-white/5 transition duration-200 cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span className={`font-sans font-extrabold text-sm sm:text-base pr-4 transition-colors duration-200 ${
                    isOpen ? 'text-[#9933c1] dark:text-[#b3ff6b]' : 'text-slate-900 dark:text-zinc-100'
                  }`}>
                    {faq.q}
                  </span>
                  
                  {/* Premium Rotating Chevron with lime background highlight when open */}
                  <div 
                    className={`flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-300 ${
                      isOpen 
                        ? 'bg-[#b3ff6b] text-black shadow-sm' 
                        : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-zinc-400'
                    }`}
                  >
                    <ChevronDown className={`h-4.5 w-4.5 transition-transform duration-300 ${isOpen ? 'transform rotate-180' : ''}`} />
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {/* Internal divisor highlighted on open item */}
                      <div className="px-5 pb-6 sm:px-6 sm:pb-7 text-xs sm:text-sm text-slate-600 dark:text-zinc-400 border-t border-[#9933c1]/10 dark:border-white/10 pt-4 leading-relaxed font-sans">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
