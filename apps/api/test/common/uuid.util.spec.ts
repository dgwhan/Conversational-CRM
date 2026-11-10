import { describe, it, expect } from 'vitest';
import { isUuid, UuidUtil, UUID_REGEX } from '../../src/utils/uuid.util.js';

describe('UuidUtil', () => {
  it('should validate valid UUID v4 strings correctly', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    expect(isUuid(validUuid)).toBe(true);
    expect(UuidUtil.isValid(validUuid)).toBe(true);
    expect(UUID_REGEX.test(validUuid)).toBe(true);
  });

  it('should return false for invalid UUID strings', () => {
    expect(isUuid('')).toBe(false);
    expect(isUuid(undefined)).toBe(false);
    expect(isUuid(null)).toBe(false);
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUuid('123e4567-e89b-12d3-a456')).toBe(false);
    expect(UuidUtil.isValid('workspace-slug-123')).toBe(false);
  });

  it('should generate valid v4 UUID strings', () => {
    const generated = UuidUtil.generateV4();
    expect(isUuid(generated)).toBe(true);
    expect(UuidUtil.isValid(generated)).toBe(true);
  });
});

