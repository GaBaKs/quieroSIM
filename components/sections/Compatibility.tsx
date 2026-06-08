'use client';

import { useState, useMemo } from 'react';
import { Smartphone, Check, Search, Info, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import whiteGreyBg from '@/src/assets/images/whitegreybg.jpg';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { compatibilityDevices } from '@/lib/data/esim-devices';



export default function Compatibility() {
  const { fadeUp } = useScrollReveal();
  const [activeBrand, setActiveBrand] = useState('Apple');
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useLanguage();

  const brandModels = useMemo(() => {
    return compatibilityDevices.find(b => b.brand === activeBrand)?.models || [];
  }, [activeBrand]);

  const searchResult = useMemo(() => {
    if (!searchQuery.trim()) return null;
    
    let query = searchQuery.toLowerCase().trim();
    let exactMatch = false;

    // Buscar coincidencia exacta o coincidencia parcial
    for (const data of compatibilityDevices) {
      for (const model of data.models) {
        const modelLower = model.toLowerCase();
        // Si el query está contenido en el modelo (ej: query "iphone 13" in "iphone 13 pro") 
        // OR el modelo está contenido en el query (ej: model "iphone 13" in query "tengo un iphone 13")
        if (modelLower.includes(query) || query.includes(modelLower)) {
          // Avoid matching "iphone 5" with "iphone 15" if spacing gets weird, 
          // but generic .includes is safe if spaces are intact.
          // Wait, if query is "iphone", it will match every iphone!
          // We must demand more than just the brand. Let's explicitly bypass if query is JUST the brand.
          if (query !== 'iphone' && query !== 'samsung' && query !== 'galaxy' && query !== 'pixel' && query !== 'google') {
            exactMatch = true;
            break;
          }
        }
      }
      if (exactMatch) break;
    }

    // Filtros de rechazo conocidos (modelos viejos muy comunes)
    if (query.match(/iphone\s*(4|5|6|7|8|x\b)/)) {
      return {
        status: 'error',
        message: '❌ Modelo NO compatible. Los modelos de iPhone anteriores al iPhone XR/XS (Apple iPhone X y anteriores) no tienen tecnología eSIM.'
      };
    }

    if (query.match(/galaxy\s*(s7|s8|s9|s10|a\d|j\d|m\d|note\s*[89]|note\s*10)/)) {
      return {
        status: 'error',
        message: '❌ Modelo NO compatible. Las gamas medias/bajas de Samsung y los modelos Galaxy S10 y anteriores no disponen de eSIM.'
      };
    }

    if (exactMatch) {
      return {
        status: 'success',
        message: `✅ ¡Línea Compatible! Este modelo o gama figura en las listas homologadas de eSIM. Asegúrate de tener tu teléfono libre de origen.`
      };
    }

    // Coincidencia heurística pidiendo más detalles
    if (query.includes('iphone') || query.includes('ipad') || query.includes('apple')) {
      return {
        status: 'warning',
        message: '⚠️ Por favor, escribe tu modelo exacto (Ej: iPhone 13). Prácticamente todos los dispositivos de Apple desde 2018 (iPhone XS/XR en adelante) soportan eSIM.'
      };
    }
    if (query.includes('galaxy') || query.includes('samsung')) {
      return {
        status: 'warning',
        message: '⚠️ Por favor, escribe tu modelo exacto (Ej: Galaxy S22). Casi todas las gamas Premium de Samsung desde 2020 soportan eSIM.'
      };
    }
    if (query.includes('pixel') || query.includes('google')) {
      return {
        status: 'warning',
        message: '⚠️ Por favor, escribe tu modelo exacto. Los modelos Google Pixel desde la versión Pixel 3/4 soportan eSIM sin inconvenientes.'
      };
    }

    return {
      status: 'error',
      message: '🔍 No figura explícitamente en la lista rápida. Para estar totalmente seguro, marca *#06# en el teclado de llamadas de tu móvil y verifica si aparece un código EID de 32 dígitos.'
    };
  }, [searchQuery]);

  return (
    <section 
      style={{ backgroundImage: `url(${whiteGreyBg.src})` }}
      className="py-14 md:py-20 bg-slate-50 bg-cover bg-center relative overflow-hidden" 
      id="compatibility-section"
    >
      {/* Seamless transition gradient to bottom (white) */}
      <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-b from-transparent to-white pointer-events-none z-10" />
      
      {/* Subtle fade overlay to keep contrast high and ensure readability */}
      <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-0" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
          className="mx-auto max-w-[680px] text-center mb-16 space-y-2"
        >
          <p className="text-[#9933c1] text-xs font-semibold tracking-[0.2em] uppercase mb-3">
            {t('compatibility.badge')}
          </p>
          <h2 className="font-sans text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            {t('compatibility.title')}
          </h2>
          <p className="font-sans text-slate-500 text-sm sm:text-base">
            {t('compatibility.subtitle')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          
          {/* Left panel: Interactive Checker Search */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 flex flex-col justify-between space-y-6"
          >
            <div className="space-y-4">
              <h3 className="font-sans font-black text-slate-900 text-base sm:text-lg flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-[#9933c1]" /> {t('compatibility.checkerTitle')}
              </h3>
              <p className="font-sans text-xs text-slate-500">
                {t('compatibility.checkerDesc')}
              </p>

              {/* Text input search */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                  <Search className="h-4.5 w-4.5" />
                </div>
                <input
                  suppressHydrationWarning
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('compatibility.checkerPlaceholder')}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9933c1]/10 focus:border-[#9933c1] focus:bg-white transition flex-1"
                  id="device-compatibility-search"
                />
              </div>

              {/* Instant dynamic results */}
              <AnimatePresence mode="popLayout">
              {searchResult && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-4 rounded-xl border font-sans text-xs sm:text-sm leading-relaxed ${
                    searchResult.status === 'success' ? 'bg-green-50/50 border-green-200 text-green-800' :
                    searchResult.status === 'warning' ? 'bg-amber-50/50 border-amber-200 text-amber-800' :
                    'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  {searchResult.message}
                </motion.div>
              )}
              </AnimatePresence>
            </div>

            {/* Compact footnote manual guide */}
            <div className="text-[11px] font-sans text-slate-500 flex items-start gap-1.5 px-1 leading-normal pt-2 border-t border-slate-100">
              <Info className="h-3.5 w-3.5 text-[#9933c1] shrink-0 mt-0.5" />
              <span>{t('compatibility.checkDial')}</span>
            </div>
          </motion.div>

          {/* Right panel: Brand tabs grid reference */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-7 flex flex-col space-y-4"
          >
            <div className="flex justify-between items-center px-1">
              <h3 className="font-sans font-extrabold text-slate-900 text-xs sm:text-sm uppercase tracking-wide flex items-center gap-1.5">
                {t('compatibility.referenceTitle')}
              </h3>
            </div>

            {/* Brands headers tabs as modern pills */}
            <div className="flex flex-wrap gap-2 pb-1">
              {compatibilityDevices.map(b => (
                <button
                  key={b.brand}
                  onClick={() => { setActiveBrand(b.brand); setSearchQuery(''); }}
                  className={`px-4 py-2 text-xs font-black font-sans rounded-full border transition-all cursor-pointer whitespace-nowrap ${
                    activeBrand === b.brand
                      ? 'bg-[#b3ff6b] text-black border-[#b3ff6b] shadow-sm font-bold'
                      : 'bg-white/50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {b.brand === 'Otros' ? t('compatibility.othersBtn') : b.brand}
                </button>
              ))}
            </div>

            {/* Grid of actual products */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex-1 max-h-[220px] overflow-y-auto pr-2 no-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {brandModels.map((model, index) => (
                  <div key={index} className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs font-medium text-slate-700 font-sans">
                    <Check className="h-3.5 w-3.5 text-[#9933c1] flex-shrink-0" />
                    <span className="truncate">{model}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Compact warning footnote */}
            <div className="text-[11px] font-sans text-slate-500 flex items-start gap-1.5 px-1 leading-normal pt-1">
              <ShieldAlert className="h-3.5 w-3.5 text-[#9933c1] shrink-0 mt-0.5" />
              <span>{t('compatibility.unlockedText')}</span>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
