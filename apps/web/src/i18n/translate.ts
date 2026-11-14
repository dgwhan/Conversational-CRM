import type { Locale, TranslationDictionary } from './types.js';
import { vi } from './locales/vi.js';

export type TranslationParams = Record<string, string | number>;

// vi là mặc định nên nằm trong gói chính; en chỉ tải khi cần (loadDictionary) để giảm JS ban đầu.
const DICTIONARIES: Partial<Record<Locale, TranslationDictionary>> = { vi };

export function getDictionary(locale: Locale): TranslationDictionary {
  return DICTIONARIES[locale] ?? vi;
}

export function isDictionaryLoaded(locale: Locale): boolean {
  return DICTIONARIES[locale] !== undefined;
}

/** Tải từ điển của locale nếu chưa có. Lỗi mạng thì giữ nguyên tiếng Việt (translate() tự lùi về vi). */
export async function loadDictionary(locale: Locale): Promise<void> {
  if (DICTIONARIES[locale]) return;
  if (locale === 'en') DICTIONARIES.en = (await import('./locales/en.js')).en;
}

let activeLocale: Locale = 'vi';

/** Được I18nProvider gọi mỗi khi locale đổi, để code ngoài React (validation, API, hằng số) dùng đúng ngôn ngữ. */
export function setActiveLocale(locale: Locale): void {
  activeLocale = locale;
}

export function getActiveLocale(): Locale {
  return activeLocale;
}

/** Thay các placeholder dạng {name} bằng giá trị tương ứng. */
export function formatMessage(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export function lookupTranslation(
  dict: TranslationDictionary,
  keyPath: string,
  fallback?: string,
  params?: TranslationParams,
): string {
  let current: unknown = dict;
  for (const k of keyPath.split('.')) {
    if (current && typeof current === 'object' && k in current) {
      current = (current as Record<string, unknown>)[k];
    } else {
      return formatMessage(fallback || keyPath, params);
    }
  }
  return formatMessage(typeof current === 'string' ? current : fallback || keyPath, params);
}

/**
 * Dịch ngoài component React: translate('auth.validation.emailRequired', 'Vui lòng nhập email.')
 * Gọi tại thời điểm hiển thị (không gán vào hằng số lúc import) để luôn theo locale hiện tại.
 */
export function translate(keyPath: string, fallback?: string, params?: TranslationParams): string {
  return lookupTranslation(getDictionary(activeLocale), keyPath, fallback, params);
}
