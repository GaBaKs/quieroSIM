'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language, TranslationKey } from './translations';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('ES');

  useEffect(() => {
    const saved = localStorage.getItem('quierosim_lang');
    if (saved && ['ES', 'EN', 'PT'].includes(saved)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLangState(saved as Language);
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('quierosim_lang', newLang);
  };

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: any = translations[lang];
    
    for (const k of keys) {
      if (value && value[k] !== undefined) {
        value = value[k];
      } else {
        // Fallback to ES
        let fallbackValue: any = translations['ES'];
        for (const fk of keys) {
          if (fallbackValue && fallbackValue[fk] !== undefined) {
            fallbackValue = fallbackValue[fk];
          } else {
            return key; // return the path itself if completely not found
          }
        }
        value = fallbackValue;
        break;
      }
    }
    
    if (typeof value === 'string' && params) {
      return Object.keys(params).reduce(
        (str, p) => str.replace(`{${p}}`, String(params[p])),
        value
      );
    }
    
    return value as string;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // En Next.js SSR/Turbopack a veces el contexto no se hidrata a tiempo en layouts anidados.
    // Retornamos un fallback seguro en lugar de crashear la app.
    return {
      lang: 'ES' as Language,
      setLang: () => {},
      t: (key: string) => key
    };
  }
  return context;
}
