
'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import en from './locales/en.json';
import sw from './locales/sw.json';

type Locale = 'en' | 'sw';
type Translations = Record<string, string>;

const translations: Record<Locale, Translations> = { en, sw };

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
  };
  
  const t = useCallback((key: string, replacements?: Record<string, string | number>): string => {
    let translation = translations[locale][key] || translations['en'][key] || key;
    if (replacements) {
        Object.keys(replacements).forEach(rKey => {
            translation = translation.replace(`{{${rKey}}}`, String(replacements[rKey]));
        });
    }
    return translation;
  }, [locale]);

  const value = useMemo(() => ({
    locale,
    setLocale,
    t
  }), [locale, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
