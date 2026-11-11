import { useState, type SubmitEvent } from 'react';
import { ShieldAlert } from 'lucide-react';
import { GlassButton } from '../../../../components/ui/GlassButton.js';
import { GlassPasswordField } from '../../../../components/ui/GlassPasswordField.js';
import { resetPassword } from '../../api/password-recovery.api.js';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator.js';
import { useTranslation } from '../../../../i18n/index.js';
import {
  calculatePasswordStrength,
  getResetErrorMessage,
  validateConfirmPassword,
  validatePassword,
} from './recovery.constants.js';

type PasswordRecoveryResetStepProps = {
  email: string;
  resetToken: string;
  onSuccess: () => void;
  onBackToRequest: () => void;
};

export function PasswordRecoveryResetStep({
  resetToken,
  onSuccess,
  onBackToRequest,
}: PasswordRecoveryResetStepProps) {
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hasBlurredNewPassword, setHasBlurredNewPassword] = useState(false);
  const [hasBlurredConfirmPassword, setHasBlurredConfirmPassword] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const strength = calculatePasswordStrength(newPassword);

  const rawPasswordError = validatePassword(newPassword);
  const rawConfirmError = validateConfirmPassword(confirmPassword, newPassword);

  const displayedPasswordError =
    (hasBlurredNewPassword || hasSubmitted) && rawPasswordError
      ? rawPasswordError
      : '';

  const displayedConfirmError =
    (hasBlurredConfirmPassword || hasSubmitted) && rawConfirmError
      ? rawConfirmError
      : '';

  const isMatching =
    confirmPassword.length > 0 &&
    confirmPassword === newPassword &&
    !rawPasswordError;

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasSubmitted(true);
    setError('');

    if (rawPasswordError || rawConfirmError) return;

    setIsSubmitting(true);
    try {
      await resetPassword({ resetToken, newPassword });
      onSuccess();
    } catch (cause) {
      setError(getResetErrorMessage(cause));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="animate-in fade-in duration-300">
      <header className="flex flex-col gap-1.5 text-center sm:text-left">
        <h2 className="m-0 font-sans text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          {t('auth.recovery.resetTitle', 'Tạo mật khẩu mới')}
        </h2>
        <p className="m-0 font-sans text-xs sm:text-sm text-slate-600 leading-relaxed">
          {t('auth.recovery.resetDesc', 'Tạo mật khẩu mới an toàn để tiếp tục sử dụng hệ thống.')}
        </p>
      </header>

      <form className="mt-6 flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
        {/* Trường Mật khẩu mới */}
        <div className="flex flex-col gap-2">
          <GlassPasswordField
            autoComplete="new-password"
            disabled={isSubmitting}
            errorMessage={displayedPasswordError}
            label={t('auth.recovery.newPasswordLabel', 'Mật khẩu mới')}
            headerRight={
              newPassword.length > 0 ? (
                <span className="font-sans text-xs font-medium text-slate-600">
                  {t('auth.recovery.passwordStrength', 'Độ mạnh mật khẩu:')}{' '}
                  <span className={`font-semibold ${strength.colorClass}`}>
                    {strength.label}
                  </span>
                </span>
              ) : undefined
            }
            name="newPassword"
            onBlur={() => setHasBlurredNewPassword(true)}
            onChange={(value) => {
              setNewPassword(value);
              setError('');
            }}
            placeholder={t('auth.recovery.newPasswordPlaceholder', 'Nhập mật khẩu mới')}
            value={newPassword}
            required
          />

          {/* Checklist tiêu chuẩn */}
          {newPassword.length > 0 && (
            <PasswordStrengthIndicator strength={strength} />
          )}
        </div>

        {/* Trường Xác nhận mật khẩu mới */}
        <div>
          <GlassPasswordField
            autoComplete="new-password"
            disabled={isSubmitting}
            errorMessage={displayedConfirmError}
            successMessage={isMatching ? t('auth.recovery.passwordMatched', 'Mật khẩu trùng khớp') : undefined}
            label={t('auth.recovery.confirmNewPasswordLabel', 'Xác nhận mật khẩu mới')}
            name="confirmPassword"
            onBlur={() => setHasBlurredConfirmPassword(true)}
            onChange={(value) => {
              setConfirmPassword(value);
              setError('');
            }}
            placeholder={t('auth.recovery.confirmNewPasswordPlaceholder', 'Nhập lại mật khẩu mới')}
            value={confirmPassword}
            required
          />
        </div>

        {/* Thông báo lỗi từ server nếu có */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/90 p-3 text-xs sm:text-sm text-red-700 backdrop-blur-xs">
            <ShieldAlert className="size-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-sans text-xs sm:text-sm text-red-700" role="alert">
                {error}
              </p>
              {error.includes('hết hạn') && (
                <button
                  className="font-sans text-xs font-semibold text-[#1A5CFF] underline hover:text-[#1242bd]"
                  onClick={onBackToRequest}
                  type="button"
                >
                  {t('auth.recovery.resendNewCode', 'Gửi lại mã xác minh mới')}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="pt-2">
          <GlassButton
            disabled={isSubmitting}
            fullWidth
            loading={isSubmitting}
            type="submit"
          >
            {isSubmitting ? t('auth.recovery.updating', 'Đang cập nhật…') : t('auth.recovery.resetBtn', 'Đặt lại mật khẩu')}
          </GlassButton>
        </div>

        <div className="flex justify-center pt-1">
          <button
            className="text-xs sm:text-sm font-semibold text-[#1A5CFF] hover:text-[#1242bd] hover:underline transition-colors py-1 text-center outline-none focus-visible:ring-2 focus-visible:ring-[#1A5CFF] rounded-sm"
            disabled={isSubmitting}
            onClick={onBackToRequest}
            type="button"
          >
            {t('auth.recovery.backToPrevious', 'Quay lại bước trước')}
          </button>
        </div>
      </form>
    </section>
  );
}
