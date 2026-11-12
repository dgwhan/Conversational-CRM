import {
  isValidVietnamesePhoneNumber,
  validateVietnamesePhoneNumber,
  standardizeVietnamesePhoneNumber,
  formatVietnamesePhoneNumber,
} from '../../../lib/phone.js';
import { translate } from '../../../i18n/translate.js';

export {
  standardizeVietnamesePhoneNumber,
  formatVietnamesePhoneNumber,
};

export const OTP_LENGTH = 6;
export const OTP_PATTERN = /^\d{6}$/;
export const RESEND_COOLDOWN_SECONDS = 60;
export const EMAIL_FORMAT_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_FORMAT_PATTERN = /^(0|\+84)[0-9]{9}$/;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_UPPERCASE_PATTERN = /[A-Z]/;
export const PASSWORD_LOWERCASE_PATTERN = /[a-z]/;
export const PASSWORD_NUMBER_PATTERN = /[0-9]/;
export const PASSWORD_SPECIAL_CHAR_PATTERN = /[@$!%*?&]/;
export const PASSWORD_SPECIAL_CHAR_LABEL = '@$!%*?&';

export const FULL_NAME_MIN_LENGTH = 2;
export const FULL_NAME_MAX_LENGTH = 100;

export const AUTH_VALIDATION_RULES = {
  MIN_PASSWORD_LENGTH: PASSWORD_MIN_LENGTH,
  MAX_PASSWORD_LENGTH: PASSWORD_MAX_LENGTH,
  MIN_FULL_NAME_LENGTH: FULL_NAME_MIN_LENGTH,
  MAX_FULL_NAME_LENGTH: FULL_NAME_MAX_LENGTH,
  EMAIL_REGEX: EMAIL_FORMAT_PATTERN,
  PHONE_REGEX: PHONE_FORMAT_PATTERN,
  OTP_LENGTH,
  RESEND_COOLDOWN_SECONDS,
} as const;

/**
 * Thông báo validation theo ngôn ngữ hiện tại.
 * Dùng getter để mỗi lần đọc đều dịch theo locale đang chọn (key: auth.validation.*).
 */
export const AUTH_MESSAGES = {
  get EMAIL_REQUIRED() { return translate('auth.validation.emailRequired', 'Vui lòng nhập email.'); },
  get EMAIL_INVALID() { return translate('auth.validation.emailInvalid', 'Vui lòng nhập địa chỉ email hợp lệ.'); },
  get PHONE_REQUIRED() { return translate('auth.validation.phoneRequired', 'Vui lòng nhập số điện thoại.'); },
  get PHONE_INVALID() { return translate('auth.validation.phoneInvalid', 'Số điện thoại phải gồm 10 chữ số.'); },
  get IDENTIFIER_REQUIRED() { return translate('auth.validation.identifierRequired', 'Vui lòng nhập email hoặc số điện thoại.'); },
  get IDENTIFIER_INVALID() { return translate('auth.validation.identifierInvalid', 'Vui lòng nhập email hoặc số điện thoại hợp lệ.'); },
  get PASSWORD_REQUIRED() { return translate('auth.validation.passwordRequired', 'Vui lòng nhập mật khẩu.'); },
  get PASSWORD_MIN_LENGTH() { return translate('auth.validation.passwordMinLength', 'Mật khẩu phải có ít nhất {n} ký tự.', { n: PASSWORD_MIN_LENGTH }); },
  get PASSWORD_UPPERCASE() { return translate('auth.validation.passwordUppercase', 'Mật khẩu phải có ít nhất 1 chữ hoa.'); },
  get PASSWORD_LOWERCASE() { return translate('auth.validation.passwordLowercase', 'Mật khẩu phải có ít nhất 1 chữ thường.'); },
  get PASSWORD_NUMBER() { return translate('auth.validation.passwordNumber', 'Mật khẩu phải có ít nhất 1 chữ số.'); },
  get PASSWORD_SPECIAL() { return translate('auth.validation.passwordSpecial', 'Mật khẩu phải có ít nhất 1 ký tự đặc biệt ({chars}).', { chars: PASSWORD_SPECIAL_CHAR_LABEL }); },
  get PASSWORD_MAX_LENGTH() { return translate('auth.validation.passwordMaxLength', 'Mật khẩu không được vượt quá {n} ký tự.', { n: PASSWORD_MAX_LENGTH }); },
  get CONFIRM_PASSWORD_REQUIRED() { return translate('auth.validation.confirmPasswordRequired', 'Vui lòng xác nhận mật khẩu.'); },
  get CONFIRM_PASSWORD_MISMATCH() { return translate('auth.validation.confirmPasswordMismatch', 'Mật khẩu xác nhận không trùng khớp.'); },
  get FULL_NAME_REQUIRED() { return translate('auth.validation.fullNameRequired', 'Vui lòng nhập họ và tên.'); },
  get FULL_NAME_MIN_LENGTH() { return translate('auth.validation.fullNameMinLength', 'Họ và tên phải có ít nhất {n} ký tự.', { n: FULL_NAME_MIN_LENGTH }); },
  get FULL_NAME_MAX_LENGTH() { return translate('auth.validation.fullNameMaxLength', 'Họ và tên không được vượt quá {n} ký tự.', { n: FULL_NAME_MAX_LENGTH }); },
  get OTP_INVALID() { return translate('auth.validation.otpInvalid', 'Nhập đủ {n} chữ số của mã xác minh.', { n: OTP_LENGTH }); },
};

export function isEmail(value: string): boolean {
  return EMAIL_FORMAT_PATTERN.test(value.trim());
}

export function isPhone(value: string): boolean {
  return isValidVietnamesePhoneNumber(value.trim());
}

export function validateEmail(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    return AUTH_MESSAGES.EMAIL_REQUIRED;
  }
  if (!isEmail(normalized)) {
    return AUTH_MESSAGES.EMAIL_INVALID;
  }
  return '';
}

export function validatePhone(value: string, required = false): string {
  const normalized = value.trim();
  if (!normalized) {
    return required ? AUTH_MESSAGES.PHONE_REQUIRED : '';
  }
  const result = validateVietnamesePhoneNumber(normalized);
  if (!result.isValid) {
    return result.error || AUTH_MESSAGES.PHONE_INVALID;
  }
  return '';
}

export function validateIdentifier(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    return AUTH_MESSAGES.IDENTIFIER_REQUIRED;
  }

  // If contains @, validate as email
  if (normalized.includes('@')) {
    if (!isEmail(normalized)) {
      return AUTH_MESSAGES.EMAIL_INVALID;
    }
    return '';
  }

  // Otherwise check phone/digits
  const phoneRes = validateVietnamesePhoneNumber(normalized);
  if (phoneRes.isValid) {
    return '';
  }

  return AUTH_MESSAGES.IDENTIFIER_INVALID;
}

export function validateOtp(otp: string): string {
  if (!OTP_PATTERN.test(otp)) {
    return AUTH_MESSAGES.OTP_INVALID;
  }
  return '';
}

export function validatePassword(value: string): string {
  if (!value) return AUTH_MESSAGES.PASSWORD_REQUIRED;
  if (value.length < PASSWORD_MIN_LENGTH) {
    return AUTH_MESSAGES.PASSWORD_MIN_LENGTH;
  }
  if (!PASSWORD_UPPERCASE_PATTERN.test(value)) {
    return AUTH_MESSAGES.PASSWORD_UPPERCASE;
  }
  if (!PASSWORD_LOWERCASE_PATTERN.test(value)) {
    return AUTH_MESSAGES.PASSWORD_LOWERCASE;
  }
  if (!PASSWORD_NUMBER_PATTERN.test(value)) {
    return AUTH_MESSAGES.PASSWORD_NUMBER;
  }
  if (!PASSWORD_SPECIAL_CHAR_PATTERN.test(value)) {
    return AUTH_MESSAGES.PASSWORD_SPECIAL;
  }
  if (value.length > PASSWORD_MAX_LENGTH) {
    return AUTH_MESSAGES.PASSWORD_MAX_LENGTH;
  }
  return '';
}

export function validateConfirmPassword(
  confirmVal: string,
  passwordVal: string,
): string {
  if (!confirmVal) return AUTH_MESSAGES.CONFIRM_PASSWORD_REQUIRED;
  if (confirmVal !== passwordVal) return AUTH_MESSAGES.CONFIRM_PASSWORD_MISMATCH;
  return '';
}

export function validateFullName(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    return AUTH_MESSAGES.FULL_NAME_REQUIRED;
  }
  if (normalized.length < FULL_NAME_MIN_LENGTH) {
    return AUTH_MESSAGES.FULL_NAME_MIN_LENGTH;
  }
  if (normalized.length > FULL_NAME_MAX_LENGTH) {
    return AUTH_MESSAGES.FULL_NAME_MAX_LENGTH;
  }
  return '';
}

export const PASSWORD_STRENGTH_LEVEL = {
  EMPTY: '',
  WEAK: 'Yếu',
  STRONG: 'Mạnh',
} as const;

export type PasswordStrengthLevel =
  (typeof PASSWORD_STRENGTH_LEVEL)[keyof typeof PASSWORD_STRENGTH_LEVEL];

export const PASSWORD_STRENGTH_COLOR = {
  EMPTY: 'text-text-secondary',
  WEAK: 'text-state-error',
  STRONG: 'text-state-success',
} as const;

export type PasswordStrength = {
  score: number;
  label: PasswordStrengthLevel;
  colorClass: string;
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasUpperLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  isStrong: boolean;
};

export function calculatePasswordStrength(password: string): PasswordStrength {
  const hasMinLength = password.length >= PASSWORD_MIN_LENGTH;
  const hasUppercase = PASSWORD_UPPERCASE_PATTERN.test(password);
  const hasLowercase = PASSWORD_LOWERCASE_PATTERN.test(password);
  const hasUpperLower = hasUppercase && hasLowercase;
  const hasNumber = PASSWORD_NUMBER_PATTERN.test(password);
  const hasSpecial = PASSWORD_SPECIAL_CHAR_PATTERN.test(password);

  const isStrong =
    hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;

  if (!password) {
    return {
      score: 0,
      label: PASSWORD_STRENGTH_LEVEL.EMPTY,
      colorClass: PASSWORD_STRENGTH_COLOR.EMPTY,
      hasMinLength: false,
      hasUppercase: false,
      hasLowercase: false,
      hasUpperLower: false,
      hasNumber: false,
      hasSpecial: false,
      isStrong: false,
    };
  }

  const score = [hasMinLength, hasUpperLower, hasNumber, hasSpecial].filter(
    Boolean,
  ).length;

  return {
    score,
    label: isStrong ? PASSWORD_STRENGTH_LEVEL.STRONG : PASSWORD_STRENGTH_LEVEL.WEAK,
    colorClass: isStrong ? PASSWORD_STRENGTH_COLOR.STRONG : PASSWORD_STRENGTH_COLOR.WEAK,
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasUpperLower,
    hasNumber,
    hasSpecial,
    isStrong,
  };
}
