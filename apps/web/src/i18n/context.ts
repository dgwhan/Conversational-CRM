import { createContext } from 'react';
import type { Locale, TranslationDictionary } from './types.js';
import type { TranslationParams } from './translate.js';

export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  dict: TranslationDictionary;
  t: (keyPath: string, fallback?: string, params?: TranslationParams) => string;
}

export const I18nContext = createContext<I18nContextValue | null>(null);
