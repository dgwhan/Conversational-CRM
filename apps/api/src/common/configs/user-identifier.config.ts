import { standardizeVietnamesePhoneNumber } from '../../modules/customers/domain/phone-standardizer.js';

export const UserIdentifierType = {
  EMAIL: 'EMAIL',
  PHONE: 'PHONE',
} as const;
export type UserIdentifierType = (typeof UserIdentifierType)[keyof typeof UserIdentifierType];

export const UserIdentifierLabel = {
  EMAIL: 'Email',
  PHONE: 'Số điện thoại',
} as const;
export type UserIdentifierLabel = (typeof UserIdentifierLabel)[keyof typeof UserIdentifierLabel];

export interface ParsedUserIdentifier {
  raw: string;
  clean: string;
  type: UserIdentifierType;
  label: UserIdentifierLabel;
  normalizedValue: string;
  phoneVariations: string[];
  isValid: boolean;
}

/**
 * Cấu hình chung cho hệ thống về nhận diện & tìm kiếm tài khoản người dùng
 */
export const USER_IDENTIFIER_CONFIG = {
  MODEL: 'user' as const,
  TYPES: UserIdentifierType,
  LABELS: UserIdentifierLabel,
  PATTERNS: {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    VIETNAMESE_PHONE: /^0[0-9]{9}$/,
  },
  MESSAGES: {

    MISSING_INPUT: 'Vui lòng nhập Email hoặc Số điện thoại của nhân viên cần mời.',

    MISSING_ROLE: 'Vui lòng chỉ định vai trò cho thành viên (OWNER hoặc STAFF).',

    INVALID_ROLE: 'Vai trò chỉ định không hợp lệ. Vui lòng chọn OWNER hoặc STAFF.',

    USER_NOT_FOUND: (identifierType: string, rawInput: string) =>
      `Tài khoản với ${identifierType} "${rawInput}" chưa tồn tại trong hệ thống. Người dùng cần đăng ký tài khoản trước.`,

    ALREADY_MEMBER: (identifier: string) =>
      `Tài khoản "${identifier}" đã là thành viên trong Workspace này.`,

    SELF_INVITE_DENIED: 'Không thể tự thêm chính mình vào Không gian làm việc.',

    UNAVAILABLE_DB: 'Database service is unavailable',
  },
} as const;

/**
 * Phân tích và chuẩn hóa chuỗi định danh (Email hoặc Số điện thoại)
 */
export function parseUserIdentifier(rawInput: string): ParsedUserIdentifier {
  const clean = (rawInput || '').trim();
  const isEmail = clean.includes('@');

  if (isEmail) {
    const normalizedValue = clean.toLowerCase();
    const isValid = USER_IDENTIFIER_CONFIG.PATTERNS.EMAIL.test(normalizedValue);
    return {
      raw: rawInput,
      clean,
      type: UserIdentifierType.EMAIL,
      label: USER_IDENTIFIER_CONFIG.LABELS.EMAIL,
      normalizedValue,
      phoneVariations: [],
      isValid,
    };
  }

  const stdPhone = standardizeVietnamesePhoneNumber(clean);
  const cleanPhone = clean.replace(/[\s.-]/g, '');
  const variations = Array.from(
    new Set([stdPhone, cleanPhone, clean].filter((v): v is string => Boolean(v && v.length > 0)))
  );

  return {
    raw: rawInput,
    clean,
    type: UserIdentifierType.PHONE,
    label: USER_IDENTIFIER_CONFIG.LABELS.PHONE,
    normalizedValue: stdPhone || cleanPhone || clean,
    phoneVariations: variations,
    isValid: Boolean(stdPhone),
  };
}

/**
 * Tạo điều kiện truy vấn (where clause) cho Prisma User delegate
 */
export function buildUserIdentifierWhereClause(parsedOrRaw: string | ParsedUserIdentifier): any {
  const parsed = typeof parsedOrRaw === 'string' ? parseUserIdentifier(parsedOrRaw) : parsedOrRaw;

  if (parsed.type === UserIdentifierType.EMAIL) {
    return { email: parsed.normalizedValue };
  }

  if (parsed.phoneVariations.length === 1) {
    return { phoneNumber: parsed.phoneVariations[0] };
  }

  return {
    OR: parsed.phoneVariations.map((phone) => ({ phoneNumber: phone })),
  };
}

/**
 * Tìm kiếm tài khoản người dùng theo Identifier (Email hoặc Số điện thoại)
 * Sử dụng magic string 'user' để lấy delegate từ Prisma hoặc dùng trực tiếp delegate
 */
export async function findUserByIdentifier(
  prismaOrDelegate: any,
  rawInput: string
): Promise<{ user: any; identifierType: UserIdentifierLabel; parsed: ParsedUserIdentifier }> {
  const parsed = parseUserIdentifier(rawInput);

  if (!prismaOrDelegate || !parsed.clean) {
    return { user: null, identifierType: parsed.label, parsed };
  }

  // Truy vấn trực tiếp qua cấu hình USER_IDENTIFIER_CONFIG.MODEL ('user') trên PrismaService hoặc delegate
  const delegate = prismaOrDelegate[USER_IDENTIFIER_CONFIG.MODEL] ?? prismaOrDelegate;
  const where = buildUserIdentifierWhereClause(parsed);

  const user = delegate.findFirst
    ? await delegate.findFirst({ where })
    : delegate.findUnique
      ? await delegate.findUnique({ where })
      : null;

  return { user, identifierType: parsed.label, parsed };
}

