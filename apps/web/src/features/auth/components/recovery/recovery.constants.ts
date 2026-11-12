import { PasswordRecoveryApiError } from '../../api/password-recovery.api.js';
import { translate } from '../../../../i18n/translate.js';

// Re-export all shared authentication & password validation constants/functions
export * from '../../validation/auth.validation.js';

export function getRequestErrorMessage(error: unknown): string {
  if (error instanceof PasswordRecoveryApiError && error.status === 429) {
    return translate('auth.api.tooManyRequests', 'Bạn đã gửi yêu cầu quá nhiều lần. Vui lòng thử lại sau.');
  }
  return translate('auth.api.sendCodeFailed', 'Chưa thể gửi mã xác minh lúc này. Vui lòng thử lại.');
}

export function getVerificationErrorMessage(error: unknown): string {
  if (error instanceof PasswordRecoveryApiError && error.status === 400) {
    return translate('auth.api.codeInvalidOrExpired', 'Mã xác minh không đúng hoặc đã hết hạn.');
  }
  if (error instanceof PasswordRecoveryApiError && error.status === 429) {
    return translate('auth.api.tooManyAttempts', 'Bạn đã nhập mã quá nhiều lần. Vui lòng thử lại sau.');
  }
  return translate('auth.api.verifyFailed', 'Không thể xác minh mã lúc này. Vui lòng thử lại.');
}

export function getResetErrorMessage(error: unknown): string {
  if (error instanceof PasswordRecoveryApiError) {
    if (error.status === 400) {
      return (
        error.serverMessage ||
        translate('auth.api.resetTokenExpired', 'Mã xác minh đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng thực hiện lại từ đầu.')
      );
    }
    if (error.status === 429) {
      return translate('auth.api.tooManyActions', 'Bạn đã thao tác quá nhiều lần. Vui lòng thử lại sau ít phút.');
    }
    if (error.serverMessage) {
      return error.serverMessage;
    }
  }
  return translate('auth.api.resetFailed', 'Chưa thể đặt lại mật khẩu lúc này. Vui lòng thử lại.');
}
