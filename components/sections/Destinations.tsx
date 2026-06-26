'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Destination, Plan } from '@/lib/types';
import { Search, MapPin, Sparkles, Shield, Tag, Calendar, HelpCircle, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import CheckoutModal from '@/components/CheckoutModal';
import QuieroButton from '../ui/QuieroButton';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { translateFeature } from '@/lib/i18n/featureTranslator';

interface DestinationsProps {
  /** Destinos activos con planes reales (vienen de la BD vía app/page.tsx). */
  destinations: Destination[];
  /** Planes por destination.id, ya mapeados a la forma de la UI. */
  plansByDestination: Record<string, Plan[]>;
}



function FeatureItem({ text, showMoreText, showLessText }: { text: string, showMoreText: string, showLessText: string }) {
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 65;

  if (text.length <= LIMIT) {
    return <span className="leading-tight break-words">{text}</span>;
  }

  const displayText = expanded ? text : text.slice(0, LIMIT) + '...';

  return (
    <span className="leading-tight break-words">
      {displayText}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(!expanded);
        }}
        className="text-[#9933c1] font-bold ml-1 hover:underline text-[11px] inline-flex"
      >
        {expanded ? showLessText : showMoreText}
      </button>
    </span>
  );
}

export default function Destinations({ destinations, plansByDestination }: DestinationsProps) {
  const { fadeUp } = useScrollReveal();
  const [selectedRegion, setSelectedRegion] = useState<'All' | 'Americas' | 'Europe' | 'Asia' | 'Africa' | 'Global'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDestId, setSelectedDestId] = useState(destinations[0]?.id ?? 'eeuu');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [activePlan, setActivePlan] = useState<Plan | null>(null);
  const { t, lang } = useLanguage();
  const [showAllPlans, setShowAllPlans] = useState(false);

  // Filtered list of destinations
  const filteredDestinations = useMemo(() => {
    // Mapa de ciudades famosas para mejorar la búsqueda sin depender solo de la base de datos
    const cityAliases: Record<string, string[]> = {
      'Estados Unidos': ['miami', 'orlando', 'nueva york', 'new york', 'los angeles', 'las vegas', 'chicago', 'san francisco', 'boston', 'washington', 'houston', 'dallas', 'atlanta'],
      'España': ['madrid', 'barcelona', 'ibiza', 'sevilla', 'valencia', 'mallorca', 'malaga', 'bilbao', 'granada', 'tenerife', 'canarias'],
      'Francia': ['paris', 'niza', 'lyon', 'marsella', 'toulouse', 'burdeos', 'cannes'],
      'Italia': ['roma', 'milan', 'venecia', 'florencia', 'napoles', 'amalfi', 'sicilia', 'turin', 'pisa'],
      'Reino Unido': ['londres', 'edimburgo', 'london', 'manchester', 'liverpool', 'belfast', 'glasgow'],
      'México': ['cancun', 'cdmx', 'mexico df', 'tulum', 'playa del carmen', 'monterrey', 'guadalajara', 'puerto vallarta', 'los cabos'],
      'Brasil': ['rio de janeiro', 'sao paulo', 'san pablo', 'buzios', 'florianopolis', 'salvador', 'fortaleza', 'recife', 'curitiba'],
      'Japón': ['tokio', 'tokyo', 'kyoto', 'osaka', 'hiroshima', 'sapporo', 'nara'],
      'Alemania': ['berlin', 'munich', 'frankfurt', 'hamburgo', 'colonia', 'stuttgart'],
      'Colombia': ['bogota', 'medellin', 'cartagena', 'san andres', 'cali', 'barranquilla', 'santa marta'],
      'Perú': ['lima', 'cusco', 'machu picchu', 'arequipa', 'mancora', 'piura'],
      'Chile': ['santiago', 'valparaiso', 'viña del mar', 'atacama', 'puerto montt', 'punta arenas'],
      'Argentina': ['buenos aires', 'bariloche', 'mendoza', 'mar del plata', 'cordoba', 'rosario', 'ushuaia', 'calafate', 'salta', 'iguazu'],
      'Uruguay': ['montevideo', 'punta del este', 'colonia'],
      'Portugal': ['lisboa', 'oporto', 'faro', 'madeira'],
      'Países Bajos': ['amsterdam', 'rotterdam', 'la haya'],
      'Suiza': ['zurich', 'ginebra', 'basilea', 'lucerna', 'berna'],
      'Canadá': ['toronto', 'vancouver', 'montreal', 'quebec', 'ottawa', 'calgary'],
      'Australia': ['sydney', 'melbourne', 'brisbane', 'perth', 'gold coast'],
      'Emiratos Árabes Unidos': ['dubai', 'abu dhabi'],
      'Europa Regional': ['europa', 'euro', 'schengen'],
      'Tailandia': ['bangkok', 'phuket', 'chiang mai', 'pattaya', 'krabi'],
      'Corea del Sur': ['seul', 'seoul', 'busan', 'jeju'],
      'China': ['pekin', 'beijing', 'shanghai', 'hong kong', 'macao', 'guangzhou', 'shenzhen'],
      'Turquía': ['estambul', 'istanbul', 'ankara', 'antalya', 'capadocia'],
      'Grecia': ['atenas', 'santorini', 'mykonos', 'creta', 'rodas'],
      'Egipto': ['el cairo', 'cairo', 'luxor', 'asuan', 'alejandria', 'sharm el-sheij'],
      'Sudáfrica': ['ciudad del cabo', 'cape town', 'johanesburgo', 'durban'],
      'India': ['nueva delhi', 'delhi', 'mumbai', 'bombay', 'goa', 'bangalore', 'agra'],
      'Indonesia': ['bali', 'yakarta', 'jakarta', 'lombok', 'komodo'],
      'Vietnam': ['hanoi', 'ho chi minh', 'saigon', 'halong', 'da nang'],
      'Nueva Zelanda': ['auckland', 'wellington', 'christchurch', 'queenstown'],
      'Costa Rica': ['san jose', 'tamarindo', 'manuel antonio', 'jaco'],
      'República Dominicana': ['punta cana', 'santo domingo', 'puerto plata', 'bavaro'],
      'Puerto Rico': ['san juan', 'ponce', 'fajardo'],
      'Ecuador': ['quito', 'guayaquil', 'galapagos', 'cuenca'],
      'Bolivia': ['la paz', 'sucre', 'santa cruz', 'uyuni'],
      'Paraguay': ['asuncion', 'ciudad del este', 'encarnacion'],
      'Suecia': ['estocolmo', 'gotemburgo', 'malmo'],
      'Noruega': ['oslo', 'bergen', 'tromso'],
      'Dinamarca': ['copenhague', 'aarhus'],
      'Finlandia': ['helsinki', 'laponia'],
      'Irlanda': ['dublin', 'cork', 'galway'],
      'Bélgica': ['bruselas', 'brujas', 'gante', 'amberes'],
      'Austria': ['viena', 'salzburgo', 'innsbruck'],
      'Polonia': ['varsovia', 'cracovia', 'gdansk'],
      'República Checa': ['praga', 'brno'],
      'Hungría': ['budapest'],
      'Croacia': ['dubrovnik', 'split', 'zagreb'],
      'Marruecos': ['marrakech', 'casablanca', 'fez', 'rabat'],
      'Filipinas': ['manila', 'boracay', 'cebu', 'palawan'],
      'Singapur': ['singapur', 'singapore'],
      'Malasia': ['kuala lumpur', 'penang', 'langkawi'],
      'Taiwán': ['taipei', 'taiwan']
    };

    return destinations.filter(dest => {
      const matchesRegion = selectedRegion === 'All' || dest.region === selectedRegion;
      const lowerQuery = searchQuery.toLowerCase();
      
      const translatedName = t(`countries.${dest.name}`);
      const actualTranslatedName = translatedName.startsWith('countries.') ? dest.name : translatedName;
      
      const extraAliases = cityAliases[dest.name] || [];
      const combinedAliases = [...(dest.searchAliases || []), ...extraAliases];
      
      const matchesName = dest.name.toLowerCase().includes(lowerQuery) || actualTranslatedName.toLowerCase().includes(lowerQuery);
      const matchesAlias = combinedAliases.some(alias => alias.toLowerCase().includes(lowerQuery));
      const matchesCode = dest.code.toLowerCase().includes(lowerQuery);
      return matchesRegion && (matchesName || matchesAlias || matchesCode);
    });
  }, [selectedRegion, searchQuery, t, destinations]);

  // Find the selected active index
  const selectedIndex = useMemo(() => {
    const idx = filteredDestinations.findIndex(d => d.id === selectedDestId);
    return idx >= 0 ? idx : 0;
  }, [filteredDestinations, selectedDestId]);

  // Carousel layout constants (px)
  const ITEM_WIDTH = 110;
  const GAP = 16;
  const STEP = ITEM_WIDTH + GAP;
  const MULTIPLIER = 4; // For infinite loop feel, reduced to prevent lag

  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const clickPrevented = useRef(false);

  // Momentum variables
  const lastMousePosition = useRef({ x: 0, time: 0 });
  const velocity = useRef(0);
  const rafId = useRef<number | null>(null);
  const isFirstLoad = useRef(true);

  const currentMultiplier = (searchQuery === '' && selectedRegion === 'All') ? MULTIPLIER : 1;

  // Duplicated destinations for infinite scroll
  const infiniteDestinations = useMemo(() => {
    if (filteredDestinations.length === 0) return [];
    const arr = [];
    for (let i = 0; i < currentMultiplier; i++) {
      for (const dest of filteredDestinations) {
        arr.push({ ...dest, _copyIdx: i });
      }
    }
    return arr;
  }, [filteredDestinations, currentMultiplier]);

  const prevMultiplier = useRef(currentMultiplier);

  // Center scroll to the closest active destination block
  useEffect(() => {
    if (scrollRef.current && filteredDestinations.length > 0) {
      let isMultiplierChange = false;
      if (prevMultiplier.current !== currentMultiplier) {
        isFirstLoad.current = true;
        prevMultiplier.current = currentMultiplier;
        isMultiplierChange = true;
      }

      const naturalIdx = filteredDestinations.findIndex(d => d.id === selectedDestId);
      const actualNaturalIdx = naturalIdx >= 0 ? naturalIdx : 0;

      let closestIdx = 0;

      if (isFirstLoad.current) {
        const middleBlockIdx = Math.floor(currentMultiplier / 2);
        closestIdx = (middleBlockIdx * filteredDestinations.length) + actualNaturalIdx;
        isFirstLoad.current = false;
      } else {
        const currentScrollCenter = scrollRef.current.scrollLeft + scrollRef.current.clientWidth / 2;
        const currentGlobalIdx = Math.max(0, Math.floor(currentScrollCenter / STEP));
        // Bound the block id
        const maxBlockIdx = currentMultiplier > 0 ? (currentMultiplier - 1) : 0;
        const currentBlockIdx = Math.min(Math.max(0, Math.floor(currentGlobalIdx / filteredDestinations.length)), maxBlockIdx);
        
        // Find the closest instance of the selected item out of the nearest blocks
        const options = [
          (Math.max(0, currentBlockIdx - 1) * filteredDestinations.length) + actualNaturalIdx,
          (currentBlockIdx * filteredDestinations.length) + actualNaturalIdx,
          (Math.min(maxBlockIdx, currentBlockIdx + 1) * filteredDestinations.length) + actualNaturalIdx,
        ];

        closestIdx = options[1];
        let minDiff = Math.abs(options[1] - currentGlobalIdx);
        for(const opt of options) {
          if (Math.abs(opt - currentGlobalIdx) < minDiff) {
            minDiff = Math.abs(opt - currentGlobalIdx);
            closestIdx = opt;
          }
        }
      }

      const scrollPos = closestIdx * STEP;
      // Delay slightly so layout can process the duplicated elements
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({ 
            left: scrollPos - (scrollRef.current.clientWidth / 2) + (ITEM_WIDTH / 2), 
            behavior: isMultiplierChange ? 'auto' : 'smooth' 
          });
        }
      });
    }
  }, [filteredDestinations, selectedDestId, selectedRegion, searchQuery, STEP, ITEM_WIDTH, currentMultiplier]); // Re-run if query or region drops length

  const startMomentum = () => {
    let currentVelocity = velocity.current * 20; // acceleration multiplier
    
    const step = () => {
      if (Math.abs(currentVelocity) < 0.5 || isDragging.current) {
        if (rafId.current) cancelAnimationFrame(rafId.current);
        return; 
      }
      if (scrollRef.current) {
        scrollRef.current.scrollLeft -= currentVelocity;
      }
      currentVelocity *= 0.94; // friction
      rafId.current = requestAnimationFrame(step);
    };
    
    rafId.current = requestAnimationFrame(step);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    isDragging.current = true;
    clickPrevented.current = false;
    startX.current = e.pageX - scrollRef.current!.offsetLeft;
    scrollLeft.current = scrollRef.current!.scrollLeft;
    
    lastMousePosition.current = { x: e.pageX, time: Date.now() };
    velocity.current = 0;
  };

  const handleMouseLeave = () => {
    if (isDragging.current) {
      startMomentum();
    }
    isDragging.current = false;
  };

  const handleMouseUp = () => {
    if (isDragging.current) {
      startMomentum();
    }
    isDragging.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current!.offsetLeft;
    const walk = (x - startX.current) * 0.8; // Reduced from 1.5 to slow down normal dragging
    
    if (Math.abs(walk) > 10) {
      clickPrevented.current = true;
    }
    
    const now = Date.now();
    const dt = now - lastMousePosition.current.time;
    if (dt > 0) {
      const v = (e.pageX - lastMousePosition.current.x) / dt;
      // Exponential moving average
      velocity.current = velocity.current * 0.4 + v * 0.6;
    }
    
    lastMousePosition.current = { x: e.pageX, time: now };
    scrollRef.current!.scrollLeft = scrollLeft.current - walk;
  };

  const handleDestinationClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (clickPrevented.current) return;
    if (rafId.current) cancelAnimationFrame(rafId.current); // Stop momentum
    const destId = e.currentTarget.dataset.id;
    if (destId) {
      setSelectedDestId(destId);
      setShowAllPlans(false);
    }
  }, []);

  const handleBuyClick = (plan: Plan) => {
    setActivePlan(plan);
    setIsCheckoutOpen(true);
  };

  const activeDestination = useMemo(() => {
    if (filteredDestinations.length > 0) {
      const idx = filteredDestinations.findIndex(d => d.id === selectedDestId);
      return idx >= 0 ? filteredDestinations[idx] : filteredDestinations[0];
    }
    return destinations.find(d => d.id === selectedDestId) || destinations[0];
  }, [filteredDestinations, selectedDestId, destinations]);

  const activePlans = useMemo(() => {
    if (!activeDestination) return [];
    const plans = plansByDestination[activeDestination.id] ?? [];
    return [...plans].sort((a, b) => {
      if (a.isPopular && !b.isPopular) return -1;
      if (!a.isPopular && b.isPopular) return 1;
      return 0;
    });
  }, [activeDestination, plansByDestination]);


  // Listen to search changes from Hero or localStorage
  useEffect(() => {
    const checkStorage = () => {
      const storedQuery = localStorage.getItem('hero_search_query');
      const storedId = localStorage.getItem('hero_selected_id');
      const storedRegion = localStorage.getItem('hero_selected_region');

      if (storedQuery !== null) {
        setSearchQuery(storedQuery);
        localStorage.removeItem('hero_search_query');
      }
      if (storedId !== null) {
        setSelectedDestId(storedId);
        localStorage.removeItem('hero_selected_id');
      }
      if (storedRegion !== null) {
        setSelectedRegion(storedRegion as any);
        localStorage.removeItem('hero_selected_region');
      }
    };

    // Run immediately
    checkStorage();

    // Custom Event Listener
    const handleHeroSearch = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        if (customEvent.detail.query !== undefined) {
          setSearchQuery(customEvent.detail.query);
        }
        if (customEvent.detail.id) {
          setSelectedDestId(customEvent.detail.id);
        }
        if (customEvent.detail.region) {
          setSelectedRegion(customEvent.detail.region);
        }
      }
    };

    window.addEventListener('heroSearch', handleHeroSearch);
    return () => {
      window.removeEventListener('heroSearch', handleHeroSearch);
    };
  }, []);

  // Catálogo vacío (BD sin planes activos): la sección no se renderiza.
  if (!activeDestination) return null;

  const regionTabs = [
    { label: t('destinations.filterAll'), value: 'All' },
    { label: t('destinations.filterPopular'), value: 'Americas' }, // Actually Americans, but keeping logic
    { label: t('countries.Europa').startsWith('countries.') ? 'Europa' : t('countries.Europa'), value: 'Europe' },
    { label: t('countries.Asia').startsWith('countries.') ? 'Asia' : t('countries.Asia'), value: 'Asia' },
    { label: t('countries.África').startsWith('countries.') ? 'África' : t('countries.África'), value: 'Africa' },
    { label: t('destinations.filterRegional'), value: 'Global' },
  ];

  return (
    <section 
      className="pt-16 pb-20 md:pt-24 md:pb-28 bg-white text-zinc-900 relative overflow-hidden" 
      id="destinations-section"
    >
      {/* Seamless transition gradient to bottom (slate-50) */}
      <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-b from-transparent to-slate-50 pointer-events-none z-0" />
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
          className="mx-auto max-w-[680px] text-center mb-12 space-y-2"
        >
          <span className="text-[#9933c1] text-xs font-semibold tracking-[0.2em] uppercase mb-3 block">
            {t('destinations.badge')}
          </span>
          <h2 className="font-sans text-3xl sm:text-4xl font-black tracking-tight text-zinc-900">
            {t('destinations.title')}
          </h2>
          <p className="font-sans text-zinc-500 text-sm sm:text-base leading-relaxed">
            {t('destinations.subtitle')}
          </p>
        </motion.div>

        {/* Search & Regions Bar */}
        <div className="mb-10 max-w-4xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-[#fafafa] p-4 rounded-2xl border border-black/5 backdrop-blur-md">
            <div className="relative w-full lg:max-w-xs shrink-0">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-400">
                <Search className="h-4.5 w-4.5" />
              </div>
              <input
                suppressHydrationWarning
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('destinations.search')}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-black/10 text-zinc-900 rounded-xl focus:outline-none focus:border-[#b3ff6b] focus:ring-2 focus:ring-[#b3ff6b]/15 transition-all font-sans placeholder:text-zinc-400"
                id="destination-search-field"
              />
            </div>

            {/* Region filters inside horizontal pill container */}
            <div className="flex items-center gap-1.5 w-full lg:w-auto overflow-x-auto scrollbar-none no-scrollbar justify-start lg:justify-end py-1 whitespace-nowrap">
              {regionTabs.map(tab => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setSelectedRegion(tab.value as any)}
                  className={`px-4 py-2 rounded-full font-sans text-xs font-bold transition-all duration-200 whitespace-nowrap cursor-pointer border shrink-0 ${
                    selectedRegion === tab.value
                      ? 'bg-[#9933c1] text-white border-[#9933c1] shadow-md shadow-[#9933c1]/20'
                      : 'bg-white text-zinc-500 border-black/10 hover:bg-[#fafafa] hover:text-zinc-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* NEW HORIZONTAL TIMELINE CAROUSEL OF DESTINATIONS */}
        {/* ---------------------------------------------------- */}
        <div className="flex flex-col items-center justify-center max-w-6xl mx-auto mb-16">
          
          <div className="relative w-full shrink-0">
            {/* Subtle fade edges to cover the overflow area */}
            <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-r from-white to-transparent pointer-events-none z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />

            {/* Viewport frame containing the drag-to-scroll track */}
            <div 
              ref={scrollRef}
              className="w-full overflow-x-auto overflow-y-hidden h-40 flex items-center px-4 scrollbar-none no-scrollbar cursor-grab active:cursor-grabbing"
              onMouseDown={handleMouseDown}
              onMouseLeave={handleMouseLeave}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
            >
              <div 
                className="flex items-center w-max h-full px-4 sm:px-12"
                style={{ gap: `${GAP}px` }}
              >
                {infiniteDestinations.length > 0 ? (
                  infiniteDestinations.map((dest, i) => {
                    const isSelected = selectedDestId === dest.id;
                    
                    return (
                      <button
                        key={`${dest.id}-${dest._copyIdx}-${i}`}
                        data-id={dest.id}
                        onClick={handleDestinationClick}
                        type="button"
                        className={`flex flex-col items-center justify-center shrink-0 h-32 rounded-2xl border transition-all duration-300 ${
                          isSelected
                            ? 'border-[#9933c1] bg-[#9933c1]/10 text-zinc-900 shadow-[0_0_24px_rgba(153,51,193,0.15)] scale-110 z-10'
                            : 'border-black/5 bg-[#fafafa] text-zinc-500 opacity-80 hover:opacity-100 hover:border-black/10 hover:bg-[#f0f0f0] scale-100'
                        }`}
                        style={{ width: `${ITEM_WIDTH}px` }}
                      >
                        {/* Flag Image or Emoji */}
                        {dest.code.length <= 2 ? (
                          <img 
                            src={`https://flagcdn.com/w80/${dest.code.toLowerCase()}.png`} 
                            alt={t(`countries.${dest.name}`).startsWith('countries.') ? dest.name : t(`countries.${dest.name}`)} 
                            className="h-7 w-10 object-cover rounded shadow-md mb-2 shrink-0 select-none border border-white/5 pointer-events-none"
                          />
                        ) : (
                          <span className="text-3xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] select-none mb-1.5 relative -top-0.5 pointer-events-none">
                            {dest.flag}
                          </span>
                        )}
                        {/* Code abbreviation */}
                        <span className="font-black text-sm tracking-widest text-[#9933c1] pointer-events-none">
                          {dest.code}
                        </span>
                        {/* Name snippet truncated */}
                        <span className="font-sans font-bold text-[10px] text-center px-1 truncate max-w-full text-zinc-800 pointer-events-none">
                          {t(`countries.${dest.name}`).startsWith('countries.') ? dest.name : t(`countries.${dest.name}`)}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center shrink-0 py-4 text-center text-zinc-500 w-full h-full min-w-[300px]">
                    <p className="font-sans text-sm font-medium">{t('destinations.noResults')} &quot;{searchQuery}&quot;</p>
                    <button 
                      onClick={() => { setSearchQuery(''); setSelectedRegion('All'); }}
                      type="button"
                      className="text-xs font-bold text-[#9933c1] underline cursor-pointer mt-1"
                    >
                      {t('destinations.filterAll')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* ---------------------------------------------------- */}
        {/* PLANS DISPLAY FOR THE SELECTED COUNTRY */}
        {/* ---------------------------------------------------- */}
        <div id="plans-display-anchor" className="max-w-5xl mx-auto space-y-6">
          
          {/* Country Banner */}
          <div className="rounded-2xl border border-black/5 p-6 bg-[#fafafa] backdrop-blur-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              {activeDestination.code.length <= 2 ? (
                <img 
                  src={`https://flagcdn.com/w160/${activeDestination.code.toLowerCase()}.png`} 
                  alt={t(`countries.${activeDestination.name}`).startsWith('countries.') ? activeDestination.name : t(`countries.${activeDestination.name}`)} 
                  className="h-10 w-14 object-cover rounded-md shadow-sm border border-black/5 select-none shrink-0"
                />
              ) : (
                <span className="text-4xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)]">{activeDestination.flag}</span>
              )}
              <div>
                <h3 className="font-sans font-extrabold text-zinc-900 text-xl sm:text-2xl leading-none">
                  {t('destinations.details.plansFor').replace('{country}', t(`countries.${activeDestination.name}`).startsWith('countries.') ? activeDestination.name : t(`countries.${activeDestination.name}`))}
                </h3>
                <p className="font-sans text-xs text-zinc-500 mt-1.5 leading-relaxed">
                  {t('destinations.details.prepaidPlans')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[#9933c1] bg-[#9933c1]/5 border border-[#9933c1]/20 rounded-xl px-3 py-1.5 text-xs">
              <Shield className="h-4 w-4" />
              <span className="font-sans font-black">{t('destinations.details.stripeGuarantee')}</span>
            </div>
          </div>

          {/* Adaptive columns depending on active plan sizes */}
          <div className={`grid gap-6 ${
            activePlans.length === 1 
              ? 'grid-cols-1 max-w-md mx-auto'
              : activePlans.length === 2
              ? 'grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto'
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          }`}>
            <AnimatePresence>
            {(showAllPlans ? activePlans : activePlans.slice(0, 3)).map((plan, idx) => {
              const isPopular = plan.isPopular;

              return (
                <motion.div 
                  key={plan.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className={`rounded-2xl border p-6 transition-all duration-300 relative flex flex-col justify-between ${
                    isPopular
                      ? 'border-[#b3ff6b] bg-[#fafafa] shadow-lg shadow-[#b3ff6b]/20'
                      : 'border-black/5 bg-[#fafafa] hover:border-black/20 hover:bg-white'
                  }`}
                >
                  {isPopular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#b3ff6b] font-sans font-black text-black uppercase tracking-wider px-4 py-0.5 rounded-full shadow-md shadow-[#b3ff6b]/20 text-[10px]">
                      {t('destinations.details.mostPopular')}
                    </span>
                  )}

                  <div className="space-y-4 mt-2">
                    {/* Size and days indicator */}
                    <div className="flex justify-between items-baseline">
                      <span className="font-sans font-black text-zinc-900 text-4xl tracking-tight">
                        {plan.dataGB === 'Ilimitado' ? t('destinations.unlimited') : plan.dataGB}
                      </span>
                      <span className="font-sans text-xs text-zinc-500 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-[#9933c1]" /> {plan.days} {t('destinations.days')}
                      </span>
                    </div>

                    {/* Thin dividing border line */}
                    <div className={`w-full border-t border-black/5 my-2 ${isPopular ? 'border-[#b3ff6b]' : ''}`} />

                    {/* Features checks list */}
                    <ul className="space-y-2 py-2 text-xs text-zinc-600 flex-1">
                      {plan.features.map((feat, i) => {
                        const localizedFeat = translateFeature(feat, lang);
                        return (
                          <li key={i} className="flex items-start gap-2">
                            <Check className="h-3.5 w-3.5 text-[#9933c1] flex-shrink-0 mt-0.5" />
                            <FeatureItem text={localizedFeat} showMoreText={t('destinations.showMore')} showLessText={t('destinations.showLess')} />
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* Pricing row with trigger button */}
                  <div className="mt-8 pt-4 border-t border-black/5 flex items-center justify-between gap-4">
                    <div className="text-left">
                      <span className="font-sans font-black text-zinc-900 tracking-tight block text-2xl leading-none">
                        ${plan.priceUSD}{' '}
                        <span className="text-xs font-normal text-zinc-500 tracking-wider">USD</span>
                      </span>
                    </div>

                    <QuieroButton 
                      variant={isPopular ? 'primary' : 'secondary'}
                      onClick={() => handleBuyClick(plan)}
                      className="text-xs py-2.5 px-5 transition duration-200"
                    >
                      {t('destinations.buy')} eSIM
                    </QuieroButton>
                  </div>
                </motion.div>
              );
            })}
            </AnimatePresence>
          </div>
          {/* Show More Button if there are more than 3 plans */}
          {activePlans.length > 3 && (
            <motion.div layout className="flex justify-center mt-8">
              <motion.button
                layout
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (showAllPlans) {
                    const el = document.getElementById('plans-display-anchor');
                    if (el) {
                      const yOffset = -100;
                      const yCoord = el.getBoundingClientRect().top + window.scrollY + yOffset;
                      window.scrollTo({ top: yCoord, behavior: 'smooth' });
                    }
                  }
                  setShowAllPlans(!showAllPlans);
                }}
                className="text-sm font-bold text-[#9933c1] transition-colors border border-[#9933c1]/20 bg-[#9933c1]/5 hover:bg-[#9933c1]/10 px-6 py-2.5 rounded-full flex items-center gap-2 cursor-pointer shadow-sm"
              >
                {showAllPlans ? t('destinations.hidePlans') : `${t('destinations.showAllPlans')} (${activePlans.length})`}
                <motion.div
                  animate={{ rotate: showAllPlans ? 180 : 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <ChevronDown className="h-4 w-4" />
                </motion.div>
              </motion.button>
            </motion.div>
          )}

          {/* Trust description block */}
          <div className="rounded-xl border border-black/5 p-4 bg-[#fafafa] text-xs text-zinc-500 flex items-start gap-2.5 leading-relaxed font-sans mt-8">
            <HelpCircle className="h-4 w-4 text-zinc-400 mt-0.5 flex-shrink-0" />
            <p>
              <strong>{t('destinations.details.deliveryTitle')}</strong> {t('destinations.details.deliveryDesc').replace('{country}', t(`countries.${activeDestination.name}`).startsWith('countries.') ? activeDestination.name : t(`countries.${activeDestination.name}`))}
            </p>
          </div>
        </div>

      </div>

      {/* Embedded Checkout Stripe simulation Modal */}
      <CheckoutModal 
        isOpen={isCheckoutOpen} 
        onClose={() => setIsCheckoutOpen(false)} 
        plan={activePlan} 
        destinationName={t(`countries.${activeDestination.name}`).startsWith('countries.') ? activeDestination.name : t(`countries.${activeDestination.name}`)} 
        destinationFlag={activeDestination.flag} 
        destinationCode={activeDestination.code}
      />
    </section>
  );
}
