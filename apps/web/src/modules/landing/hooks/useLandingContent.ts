import { useTranslation } from '../../../i18n/index.js';
import { LANDING_CONTENT, type LandingContent } from '../content/landing.content.js';

/** Nội dung landing theo ngôn ngữ đang chọn (vi/en). */
export const useLandingContent = (): LandingContent => {
  const { locale } = useTranslation();
  return LANDING_CONTENT[locale] ?? LANDING_CONTENT.vi;
};
