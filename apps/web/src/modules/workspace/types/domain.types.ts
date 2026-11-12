import { translate } from '../../../i18n/translate.js';
export type BusinessDomain =
  | 'EDUCATION'
  | 'REAL_ESTATE'
  | 'BEAUTY_SPA'
  | 'B2B_SAAS'
  | 'RETAIL'
  | 'CUSTOM'
  | (string & {});

export const DOMAIN_OPTIONS: { value: string; label: string }[] = [
  { value: 'EDUCATION', get label() { return translate('workspaceSettings.domains.education', 'Giáo dục & Tuyển sinh'); } },
  { value: 'REAL_ESTATE', get label() { return translate('workspaceSettings.domains.realEstate', 'Bất động sản & Dự án'); } },
  { value: 'BEAUTY_SPA', get label() { return translate('workspaceSettings.domains.beautySpa', 'Thẩm mỹ viện & Spa'); } },
  { value: 'B2B_SAAS', get label() { return translate('workspaceSettings.domains.b2bSaas', 'B2B SaaS & Phần mềm'); } },
  { value: 'RETAIL', get label() { return translate('workspaceSettings.domains.retail', 'Bán lẻ & Thương mại'); } },
  { value: 'CUSTOM', get label() { return translate('workspaceSettings.domains.customOption', '+ Thêm loại mô hình khác (Tự nhập)...'); } },
];

export const getDomainLabel = (domain?: string): string => {
  if (!domain) return translate('workspaceSettings.domains.custom', 'Mô hình tùy chỉnh');
  const found = DOMAIN_OPTIONS.find((opt) => opt.value === domain);
  if (found && found.value !== 'CUSTOM') return found.label;
  if (domain === 'CUSTOM') return translate('workspaceSettings.domains.custom', 'Mô hình tùy chỉnh');
  return domain;
};

