export type BusinessDomain =
  | 'EDUCATION'
  | 'REAL_ESTATE'
  | 'BEAUTY_SPA'
  | 'B2B_SAAS'
  | 'RETAIL'
  | 'CUSTOM'
  | (string & {});

export const DOMAIN_OPTIONS: { value: string; label: string }[] = [
  { value: 'EDUCATION', label: 'Giáo dục & Tuyển sinh' },
  { value: 'REAL_ESTATE', label: 'Bất động sản & Dự án' },
  { value: 'BEAUTY_SPA', label: 'Thẩm mỹ viện & Spa' },
  { value: 'B2B_SAAS', label: 'B2B SaaS & Phần mềm' },
  { value: 'RETAIL', label: 'Bán lẻ & Thương mại' },
  { value: 'CUSTOM', label: '+ Thêm loại mô hình khác (Tự nhập)...' },
];

export const getDomainLabel = (domain?: string): string => {
  if (!domain) return 'Mô hình tùy chỉnh';
  const found = DOMAIN_OPTIONS.find((opt) => opt.value === domain);
  if (found && found.value !== 'CUSTOM') return found.label;
  if (domain === 'CUSTOM') return 'Mô hình tùy chỉnh';
  return domain;
};

