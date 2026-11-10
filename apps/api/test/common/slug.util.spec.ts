import { describe, it, expect } from 'vitest';
import { SlugUtil, createSlug, generateUniqueSlug } from '../../src/utils/slug.util.js';

describe('SlugUtil', () => {
  it('should generate URL-friendly slug from Vietnamese string', () => {
    const slug = SlugUtil.create('Trường Đại học Cần Thơ');
    expect(slug).toBe('truong-dai-hoc-can-tho');
  });

  it('should handle special characters and fallback for empty strings', () => {
    expect(SlugUtil.create('')).toBe('ws');
    expect(SlugUtil.create(null)).toBe('ws');
    expect(createSlug('  Công ty TNHH @ ABC # 123  ')).toBe('cong-ty-tnhh-abc-123');
  });

  it('should generate unique slug with timestamp suffix', () => {
    const unique = generateUniqueSlug('PolarisX');
    expect(unique.startsWith('polarisx-')).toBe(true);
    expect(unique.length).toBeGreaterThan('polarisx-'.length);
  });
});

