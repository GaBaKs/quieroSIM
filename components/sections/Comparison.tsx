'use client';

import { useLanguage } from '@/lib/i18n/LanguageContext';
import { motion } from 'motion/react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { Check, X, Infinity as InfinityIcon, Zap, Headphones, Globe, Smartphone } from 'lucide-react';
import Logo from '../ui/Logo';

export default function Comparison() {
  const { t } = useLanguage();
  const { fadeUp } = useScrollReveal();

  const features = [
    {
      id: 0,
      icon: InfinityIcon,
      qx: true,
      local: false,
      others: false,
    },
    {
      id: 1,
      icon: Zap,
      qx: true,
      local: false,
      others: true,
    },
    {
      id: 2,
      icon: Headphones,
      qx: true,
      local: true,
      others: false,
    },
    {
      id: 3,
      icon: Globe,
      qx: true,
      local: true,
      others: false,
    },
    {
      id: 4,
      icon: Smartphone,
      qx: true,
      local: true,
      others: true,
    },
  ];

  return (
    <section className="py-20 md:py-32 bg-white text-zinc-900 overflow-hidden">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-zinc-900">
            {t('comparison.title')} <span className="text-[#9933c1]">{t('comparison.titleHighlight')}</span>
          </h2>
        </motion.div>

        <motion.div
           variants={fadeUp}
           initial="hidden"
           whileInView="visible"
           viewport={{ once: true, margin: "-100px" }}
           className="border border-black/5 rounded-3xl overflow-x-auto shadow-sm"
        >
          <div className="min-w-[700px]">
            {/* Header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr] items-center border-b border-black/5">
              <div className="p-6"></div>
              
              <div className="p-6 flex justify-center items-center bg-zinc-50 border-x border-black/5 shadow-[0_0_20px_rgba(0,0,0,0.02)] h-full">
                <Logo className="justify-center scale-[0.65] sm:scale-[0.75] origin-center" />
              </div>

              <div className="p-6 text-center font-sans md:text-sm text-xs font-semibold text-zinc-500">
                {t('comparison.columns.local')}
              </div>

              <div className="p-6 text-center font-sans md:text-sm text-xs font-semibold text-zinc-500">
                {t('comparison.columns.others')}
              </div>
            </div>

            {/* Body */}
            <div className="flex flex-col">
              {features.map((feat, idx) => (
                <div key={idx} className="grid grid-cols-[2fr_1fr_1fr_1fr] items-center border-b border-black/5 last:border-b-0 hover:bg-zinc-50/30 transition-colors">
                  <div className="p-5 sm:p-6 flex items-center gap-4">
                    <feat.icon className="h-5 w-5 text-zinc-800 shrink-0" strokeWidth={1.5} />
                    <span className="font-sans text-sm md:text-base font-medium text-zinc-600">
                      {(t(`comparison.features` as any) as any)[feat.id]}
                    </span>
                  </div>

                  <div className="p-5 sm:p-6 flex justify-center items-center bg-zinc-50 border-x border-black/5 h-full">
                    {feat.qx ? (
                      <div className="rounded-full bg-[#9933c1] p-1 shadow-sm">
                        <Check className="h-4 w-4 text-white" strokeWidth={3} />
                      </div>
                    ) : (
                      <X className="h-5 w-5 text-zinc-400" strokeWidth={1.5} />
                    )}
                  </div>

                  <div className="p-5 sm:p-6 flex justify-center items-center h-full">
                    {feat.local ? (
                      <div className="rounded-full bg-[#9933c1] p-1 shadow-sm">
                        <Check className="h-4 w-4 text-white" strokeWidth={3} />
                      </div>
                    ) : (
                      <X className="h-5 w-5 text-zinc-400" strokeWidth={1.5} />
                    )}
                  </div>

                  <div className="p-5 sm:p-6 flex justify-center items-center h-full">
                    {feat.others ? (
                      <div className="rounded-full bg-[#9933c1] p-1 shadow-sm">
                        <Check className="h-4 w-4 text-white" strokeWidth={3} />
                      </div>
                    ) : (
                      <X className="h-5 w-5 text-zinc-400" strokeWidth={1.5} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
