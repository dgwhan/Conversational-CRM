import crypto from 'crypto';

export class SlugUtil {
  static create(name?: string | null, maxLength = 50): string {
    if (!name || !name.trim()) return 'ws';
    return (
      name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, maxLength) || 'ws'
    );
  }

  /**
   * Sinh mã slug bảo mật duy nhất cho Không gian làm việc (Mã slug chuẩn an toàn)
   * Định dạng: ws-<10 ký tự ngẫu nhiên hex> (ví dụ: ws-a7f3b9c2e1)
   * Chống hoàn toàn lỗ hổng enumeration attack, không lộ tên tiếng Việt nội bộ và không dùng timestamp đoán được.
   */
  static generateUnique(_name?: string | null, _maxLength?: number): string {
    const randomHex = crypto.randomBytes(5).toString('hex');
    return `ws-${randomHex}`;
  }
}

export const createSlug = (name?: string | null, maxLength = 50): string =>
  SlugUtil.create(name, maxLength);

export const generateUniqueSlug = (name?: string | null, maxLength = 50): string =>
  SlugUtil.generateUnique(name, maxLength);

