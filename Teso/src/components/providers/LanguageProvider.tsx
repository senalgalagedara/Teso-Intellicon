"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { dashboardTranslations, Language } from '@/lib/i18n/dashboard-translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: typeof dashboardTranslations['en'];
  isSinhala: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: dashboardTranslations.en,
  isSinhala: false,
});

const STORAGE_KEY = 'teso_student_lang';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (saved && (saved === 'en' || saved === 'si')) {
        setLanguageState(saved);
      }
    } catch {
      // Local storage may be restricted
    }
    setMounted(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {}
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'si' : 'en');
  };

  const value: LanguageContextType = {
    language,
    setLanguage,
    toggleLanguage,
    t: dashboardTranslations[language] || dashboardTranslations.en,
    isSinhala: language === 'si',
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
