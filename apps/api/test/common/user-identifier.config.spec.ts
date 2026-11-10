import { describe, it, expect } from 'vitest';
import {
  parseUserIdentifier,
  buildUserIdentifierWhereClause,
  findUserByIdentifier,
  USER_IDENTIFIER_CONFIG,
  UserIdentifierType,
  UserIdentifierLabel,
} from '../../src/common/configs/user-identifier.config.js';

describe('UserIdentifierConfig (Cấu hình chung hệ thống nhận diện & tìm kiếm người dùng)', () => {
  describe('parseUserIdentifier', () => {
    it('nhận diện chính xác Email và chuẩn hóa chữ thường', () => {
      const parsed = parseUserIdentifier('  TranVanA@Cusc.VN  ');
      expect(parsed.type).toBe(UserIdentifierType.EMAIL);
      expect(parsed.label).toBe(UserIdentifierLabel.EMAIL);
      expect(parsed.normalizedValue).toBe('tranvana@cusc.vn');
      expect(parsed.isValid).toBe(true);
      expect(parsed.clean).toBe('TranVanA@Cusc.VN');
    });

    it('nhận diện chính xác Số điện thoại định dạng chuẩn Việt Nam', () => {
      const parsed = parseUserIdentifier('0901234567');
      expect(parsed.type).toBe(UserIdentifierType.PHONE);
      expect(parsed.label).toBe(UserIdentifierLabel.PHONE);
      expect(parsed.normalizedValue).toBe('0901234567');
      expect(parsed.isValid).toBe(true);
      expect(parsed.phoneVariations).toContain('0901234567');
    });

    it('chuẩn hóa Số điện thoại có dấu phân cách hoặc mã quốc gia +84', () => {
      const parsed = parseUserIdentifier('+84 901.234.567');
      expect(parsed.type).toBe(UserIdentifierType.PHONE);
      expect(parsed.label).toBe(UserIdentifierLabel.PHONE);
      expect(parsed.normalizedValue).toBe('0901234567');
      expect(parsed.isValid).toBe(true);
      expect(parsed.phoneVariations).toContain('0901234567');
    });

    it('xử lý chuỗi rỗng an toàn', () => {
      const parsed = parseUserIdentifier('   ');
      expect(parsed.clean).toBe('');
      expect(parsed.type).toBe(UserIdentifierType.PHONE);
      expect(parsed.isValid).toBe(false);
    });
  });

  describe('buildUserIdentifierWhereClause', () => {
    it('tạo where clause cho Email', () => {
      const clause = buildUserIdentifierWhereClause('test@example.com');
      expect(clause).toEqual({ email: 'test@example.com' });
    });

    it('tạo where clause có OR cho các biến thể số điện thoại', () => {
      const clause = buildUserIdentifierWhereClause('0901.234.567');
      expect(clause).toHaveProperty('OR');
      expect(Array.isArray(clause.OR)).toBe(true);
      expect(clause.OR.some((cond: any) => cond.phoneNumber === '0901234567')).toBe(true);
    });
  });

  describe('findUserByIdentifier', () => {
    it('tìm kiếm user theo Email qua userDelegate', async () => {
      const mockDelegate = {
        findUnique: async ({ where }: any) => {
          if (where.email === 'found@cusc.com') {
            return { id: 'u-1', email: 'found@cusc.com' };
          }
          return null;
        },
      };

      const result = await findUserByIdentifier(mockDelegate, 'found@cusc.com');
      expect(result.identifierType).toBe('Email');
      expect(result.user).not.toBeNull();
      expect(result.user.id).toBe('u-1');
    });

    it('tìm kiếm user theo Số điện thoại qua userDelegate.findFirst', async () => {
      const mockDelegate = {
        findFirst: async ({ where }: any) => {
          if (where.OR?.some((o: any) => o.phoneNumber === '0901234567')) {
            return { id: 'u-2', phoneNumber: '0901234567' };
          }
          return null;
        },
      };

      const result = await findUserByIdentifier(mockDelegate, '0901.234.567');
      expect(result.identifierType).toBe('Số điện thoại');
      expect(result.user).not.toBeNull();
      expect(result.user.id).toBe('u-2');
    });

    it('trả về user: null nếu không tìm thấy trong DB', async () => {
      const mockDelegate = {
        findUnique: async () => null,
      };

      const result = await findUserByIdentifier(mockDelegate, 'notfound@cusc.com');
      expect(result.user).toBeNull();
      expect(result.identifierType).toBe('Email');
    });
  });

  describe('USER_IDENTIFIER_CONFIG.MESSAGES', () => {
    it('xuất thông báo lỗi hệ thống chuẩn xác', () => {
      expect(USER_IDENTIFIER_CONFIG.MESSAGES.MISSING_INPUT).toBe(
        'Vui lòng nhập Email hoặc Số điện thoại của nhân viên cần mời.'
      );
      expect(USER_IDENTIFIER_CONFIG.MESSAGES.USER_NOT_FOUND('Email', 'abc@test.com')).toBe(
        'Tài khoản với Email "abc@test.com" chưa tồn tại trong hệ thống. Người dùng cần đăng ký tài khoản trước.'
      );
      expect(USER_IDENTIFIER_CONFIG.MESSAGES.ALREADY_MEMBER('0901234567')).toBe(
        'Tài khoản "0901234567" đã là thành viên trong Workspace này.'
      );
      expect(USER_IDENTIFIER_CONFIG.MESSAGES.SELF_INVITE_DENIED).toBe(
        'Không thể tự thêm chính mình vào Không gian làm việc.'
      );
    });
  });
});

