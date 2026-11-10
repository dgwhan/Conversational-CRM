import type { BusinessDomain, WorkspaceConfig } from '../../../contracts/workspace-config.js';
import { INDUSTRY_PRESETS } from './workspace-config.presets.js';

/**
 * Ánh xạ chuỗi định danh ngành nghề / domain thô (tiếng Anh, tiếng Việt, viết hoa/thường)
 * sang BusinessDomain chuẩn của hệ thống. Mặc định là 'EDUCATION'.
 */
export function resolveBusinessDomain(rawDomain?: string | null): BusinessDomain {
  if (!rawDomain) return 'EDUCATION';

  const normalized = rawDomain.toString().toUpperCase().trim();

  if (normalized.includes('RETAIL') || normalized.includes('BÁN LẺ') || normalized.includes('THƯƠNG MẠI')) {
    return 'RETAIL';
  }
  if (normalized.includes('SAAS') || normalized.includes('B2B') || normalized.includes('CÔNG NGHỆ') || normalized.includes('PHẦN MỀM')) {
    return 'B2B_SAAS';
  }
  if (normalized.includes('REAL_ESTATE') || normalized.includes('BẤT ĐỘNG SẢN')) {
    return 'REAL_ESTATE';
  }
  if (normalized.includes('BEAUTY') || normalized.includes('SPA') || normalized.includes('LÀM ĐẸP')) {
    return 'BEAUTY_SPA';
  }
  if (normalized.includes('EDUCATION') || normalized.includes('GIÁO DỤC') || normalized.includes('TUYỂN SINH')) {
    return 'EDUCATION';
  }
  if (INDUSTRY_PRESETS[normalized as BusinessDomain]) {
    return normalized as BusinessDomain;
  }

  return 'EDUCATION';
}

/**
 * Lấy cấu hình preset ngành nghề chuẩn theo domain hoặc chuỗi domain thô.
 */
export function getIndustryPreset(rawDomainOrKey?: string | null): Omit<WorkspaceConfig, 'workspaceId'> {
  const domainKey = resolveBusinessDomain(rawDomainOrKey);
  return INDUSTRY_PRESETS[domainKey] || INDUSTRY_PRESETS.EDUCATION;
}

