import { describe, it, expect } from 'vitest';
import {
  resolveBusinessDomain,
  getIndustryPreset,
  INDUSTRY_PRESETS,
} from '../../src/modules/workspace-config/domain/index.js';

describe('BusinessDomain Resolver & Presets (Domain Layer)', () => {
  describe('resolveBusinessDomain', () => {
    it('mặc định là EDUCATION nếu không truyền hoặc rỗng', () => {
      expect(resolveBusinessDomain()).toBe('EDUCATION');
      expect(resolveBusinessDomain(null)).toBe('EDUCATION');
      expect(resolveBusinessDomain('')).toBe('EDUCATION');
    });

    it('ánh xạ chính xác các biến thể tiếng Việt và tiếng Anh cho RETAIL', () => {
      expect(resolveBusinessDomain('retail')).toBe('RETAIL');
      expect(resolveBusinessDomain('Cửa hàng bán lẻ')).toBe('RETAIL');
      expect(resolveBusinessDomain('Thương mại điện tử')).toBe('RETAIL');
    });

    it('ánh xạ chính xác các biến thể cho B2B_SAAS', () => {
      expect(resolveBusinessDomain('saas')).toBe('B2B_SAAS');
      expect(resolveBusinessDomain('B2B')).toBe('B2B_SAAS');
      expect(resolveBusinessDomain('Công nghệ thông tin')).toBe('B2B_SAAS');
      expect(resolveBusinessDomain('Phần mềm quản lý')).toBe('B2B_SAAS');
    });

    it('ánh xạ chính xác các biến thể cho REAL_ESTATE', () => {
      expect(resolveBusinessDomain('real_estate')).toBe('REAL_ESTATE');
      expect(resolveBusinessDomain('Bất động sản')).toBe('REAL_ESTATE');
    });

    it('ánh xạ chính xác các biến thể cho BEAUTY_SPA', () => {
      expect(resolveBusinessDomain('beauty')).toBe('BEAUTY_SPA');
      expect(resolveBusinessDomain('Spa thẩm mỹ viện')).toBe('BEAUTY_SPA');
      expect(resolveBusinessDomain('Làm đẹp & Chăm sóc da')).toBe('BEAUTY_SPA');
    });

    it('ánh xạ chính xác các biến thể cho EDUCATION', () => {
      expect(resolveBusinessDomain('education')).toBe('EDUCATION');
      expect(resolveBusinessDomain('Trung tâm giáo dục')).toBe('EDUCATION');
      expect(resolveBusinessDomain('Phòng tuyển sinh')).toBe('EDUCATION');
    });

    it('hỗ trợ trực tiếp enum key hợp lệ', () => {
      expect(resolveBusinessDomain('RETAIL')).toBe('RETAIL');
      expect(resolveBusinessDomain('B2B_SAAS')).toBe('B2B_SAAS');
      expect(resolveBusinessDomain('REAL_ESTATE')).toBe('REAL_ESTATE');
      expect(resolveBusinessDomain('BEAUTY_SPA')).toBe('BEAUTY_SPA');
      expect(resolveBusinessDomain('EDUCATION')).toBe('EDUCATION');
    });

    it('fallback về EDUCATION nếu chuỗi không khớp bất kỳ ngành nào', () => {
      expect(resolveBusinessDomain('UNKNOWN_DOMAIN_XYZ')).toBe('EDUCATION');
    });
  });

  describe('getIndustryPreset', () => {
    it('lấy đúng preset cho từng ngành', () => {
      const eduPreset = getIndustryPreset('Giáo dục');
      expect(eduPreset.domain).toBe('EDUCATION');
      expect(eduPreset.terminology.entityName).toBe('Thí sinh / Học viên');

      const retailPreset = getIndustryPreset('Bán lẻ');
      expect(retailPreset.domain).toBe('RETAIL');

      const b2bPreset = getIndustryPreset('Công nghệ phần mềm');
      expect(b2bPreset.domain).toBe('B2B_SAAS');

      const realEstatePreset = getIndustryPreset('Bất động sản');
      expect(realEstatePreset.domain).toBe('REAL_ESTATE');

      const spaPreset = getIndustryPreset('Thẩm mỹ viện Spa');
      expect(spaPreset.domain).toBe('BEAUTY_SPA');
    });

    it('fallback về preset EDUCATION nếu không xác định được', () => {
      const fallbackPreset = getIndustryPreset('khong-ro-nganh-nghe');
      expect(fallbackPreset.domain).toBe('EDUCATION');
    });
  });
});

