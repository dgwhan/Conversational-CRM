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

  it('should generate an opaque random slug that does not leak the workspace name', () => {
    const a = generateUniqueSlug('PolarisX');
    const b = generateUniqueSlug('PolarisX');
    expect(a).toMatch(/^ws-[0-9a-f]{10}$/);
    expect(a).not.toContain('polarisx');
    expect(a).not.toBe(b);
  });
});

