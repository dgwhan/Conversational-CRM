import { useContext } from 'react';
import { I18nContext, type I18nContextValue } from './context.js';
import { getActiveLocale, translate, type TranslationParams } from './translate.js';

export function useTranslation(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
}

/**
 * Dành cho component UI dùng chung (có thể render ngoài I18nProvider, vd. trong test):
 * trong Provider thì giống useTranslation(), ngoài Provider thì dùng translate() theo locale hiện hành.
 */
export function useOptionalTranslation(): Pick<I18nContextValue, 't' | 'locale'> {
  const context = useContext(I18nContext);
  if (context) return context;
  return {
    locale: getActiveLocale(),
    t: (keyPath: string, fallback?: string, params?: TranslationParams) => translate(keyPath, fallback, params),
  };
}
