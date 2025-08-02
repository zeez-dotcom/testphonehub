import React, { createContext, useContext, useState, useEffect } from 'react';
import { getTranslation, formatCurrency, formatNumber } from '@shared/translations';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
    t: (key: string) => string;
  formatCurrency: (amount: number | string) => string;
  formatNumber: (num: number) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    // Get language from localStorage or default to English
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'en';
  });

  useEffect(() => {
    // Save language to localStorage
    localStorage.setItem('language', language);
    
    // Update document direction and language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    
    // Add/remove Arabic font class
    if (language === 'ar') {
      document.documentElement.classList.add('arabic');
    } else {
      document.documentElement.classList.remove('arabic');
    }
  }, [language]);

  const t = (key: string) => getTranslation(key as any, language);
  
  const currencyFormatter = (amount: number | string) => formatCurrency(amount, language);
  
  const numberFormatter = (num: number) => formatNumber(num, language);

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
    formatCurrency: currencyFormatter,
    formatNumber: numberFormatter,
    isRTL: language === 'ar',
  };

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