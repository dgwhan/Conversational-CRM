import { useState, type FormEvent } from 'react';
import {
  MailIcon,
  PhoneIcon,
  UserIcon,
} from '../../../components/icons/AuthIcons.js';
import { GlassButton } from '../../../components/ui/GlassButton.js';
import { GlassInput } from '../../../components/ui/GlassInput.js';
import { GlassPasswordField } from '../../../components/ui/GlassPasswordField.js';
import { AuthApiError, register } from '../api/auth.api.js';
import type { RegisterResponse } from '../types/auth.types.js';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator.js';
import { useTranslation } from '../../../i18n/index.js';
import { ShieldAlert } from 'lucide-react';
import {
  calculatePasswordStrength,
  validateConfirmPassword,
  validateEmail,
  validateFullName,
  validatePassword,
  validatePhone,
  standardizeVietnamesePhoneNumber,
} from '../validation/auth.validation.js';

export type SignUpFormProps = {
  onSuccess: (result: RegisterResponse) => void;
  onSwitchToLogin: () => void;
  hideHeading?: boolean;
};

export function SignUpForm({
  onSuccess,
  onSwitchToLogin,
  hideHeading = false,
}: SignUpFormProps) {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [hasBlurredPassword, setHasBlurredPassword] = useState(false);
  const [hasBlurredConfirm, setHasBlurredConfirm] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [fullNameError, setFullNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const strength = calculatePasswordStrength(password);
  const rawPasswordError = validatePassword(password);
  const rawConfirmError = validateConfirmPassword(confirmPassword, password);

  const displayedPasswordError =
    (hasBlurredPassword || hasSubmitted) && rawPasswordError
      ? rawPasswordError
      : '';
  const displayedConfirmError =
    (hasBlurredConfirm || hasSubmitted) && rawConfirmError
      ? rawConfirmError
      : '';
  const isMatching =
    confirmPassword.length > 0 &&
    password.length > 0 &&
    password === confirmPassword;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasSubmitted(true);
    setError('');

    const nextFullNameError = validateFullName(fullName);
    const nextEmailError = validateEmail(email);
    const nextPhoneError = validatePhone(phoneNumber);
    const nextPasswordError = validatePassword(password);
    const nextConfirmError = validateConfirmPassword(confirmPassword, password);

    setFullNameError(nextFullNameError);
    setEmailError(nextEmailError);
    setPhoneError(nextPhoneError);

    if (
      nextFullNameError ||
      nextEmailError ||
      nextPhoneError ||
      nextPasswordError ||
      nextConfirmError
    ) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await register({
        fullName: fullName.trim(),
        email: email.trim(),
        phoneNumber:
          standardizeVietnamesePhoneNumber(phoneNumber.trim()) ||
          phoneNumber.trim(),
        password,
      });

      onSuccess(response);
    } catch (submitError) {
      if (submitError instanceof AuthApiError) {
        setError(submitError.message);
      } else {
        setError(t('auth.signUpGenericError', 'Có lỗi xảy ra trong quá trình đăng ký. Vui lòng thử lại.'));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {!hideHeading && (
        <header className="flex flex-col gap-1.5 text-center sm:text-left">
          <h2 className="m-0 font-sans text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {t('auth.signUpTitle', 'Tạo tài khoản mới')}
          </h2>
          <p className="m-0 font-sans text-xs sm:text-sm text-slate-600 leading-relaxed">
            {t('auth.signUpSubtitle', 'Đăng ký tài khoản để bắt đầu sử dụng và quản lý hệ thống Conversational CRM.')}
          </p>
        </header>
      )}

      <form className="flex flex-col gap-4 sm:gap-5" onSubmit={handleSubmit} noValidate>
        {/* Họ và tên */}
        <GlassInput
          label={t('auth.fullNameLabel', 'Họ và tên')}
          name="fullName"
          autoComplete="name"
          placeholder={t('auth.fullNamePlaceholder', 'Nguyen Van A')}
          leadingIcon={<UserIcon size={18} />}
          value={fullName}
          onChange={(event) => {
            const val = event.target.value;
            setFullName(val);
            if (fullNameError) setFullNameError(validateFullName(val));
            if (error) setError('');
          }}
          onBlur={() => {
            if (fullName) setFullNameError(validateFullName(fullName));
          }}
          errorMessage={fullNameError}
          disabled={isSubmitting}
          required
        />

        {/* Email */}
        <GlassInput
          label={t('auth.yourEmailLabel', 'Email của bạn')}
          name="email"
          type="email"
          autoComplete="email"
          placeholder="example@gmail.com"
          leadingIcon={<MailIcon size={18} />}
          value={email}
          onChange={(event) => {
            const val = event.target.value;
            setEmail(val);
            if (emailError) setEmailError(validateEmail(val));
            if (error) setError('');
          }}
          onBlur={() => {
            if (email) setEmailError(validateEmail(email));
          }}
          errorMessage={emailError}
          disabled={isSubmitting}
          required
        />

        {/* Số điện thoại */}
        <GlassInput
          label={t('auth.phoneLabel', 'Số điện thoại')}
          name="phoneNumber"
          type="tel"
          autoComplete="tel"
          placeholder={t('auth.phonePlaceholder', '0987654321')}
          leadingIcon={<PhoneIcon size={18} />}
          value={phoneNumber}
          onChange={(event) => {
            const val = event.target.value;
            setPhoneNumber(val);
            if (phoneError) setPhoneError(validatePhone(val));
            if (error) setError('');
          }}
          onBlur={() => {
            if (phoneNumber) setPhoneError(validatePhone(phoneNumber));
          }}
          errorMessage={phoneError}
          disabled={isSubmitting}
          required
        />

        {/* Mật khẩu & Strength Indicator */}
        <div className="flex flex-col gap-2">
          <GlassPasswordField
            label={t('auth.passwordLabel', 'Mật khẩu')}
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(value) => {
              setPassword(value);
              if (error) setError('');
            }}
            onBlur={() => setHasBlurredPassword(true)}
            errorMessage={displayedPasswordError}
            disabled={isSubmitting}
            required
          />

          {password.length > 0 && (
            <PasswordStrengthIndicator strength={strength} />
          )}
        </div>

        {/* Xác nhận mật khẩu */}
        <GlassPasswordField
          label={t('auth.confirmPasswordLabel', 'Xác nhận mật khẩu')}
          name="confirmPassword"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(value) => {
            setConfirmPassword(value);
            if (error) setError('');
          }}
          onBlur={() => setHasBlurredConfirm(true)}
          errorMessage={displayedConfirmError}
          successMessage={isMatching ? t('auth.passwordMatched', 'Mật khẩu trùng khớp') : undefined}
          disabled={isSubmitting}
          required
        />

        {/* Inline Server Error Notification */}
        {error && (
          <div
            className="rounded-xl border border-red-200 bg-red-50/90 p-3 text-xs sm:text-sm text-red-700 backdrop-blur-xs flex items-start gap-2.5 animate-in fade-in duration-200"
            role="alert"
          >
            <ShieldAlert size={18} className="shrink-0 text-red-600 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Primary Glass Button */}
        <GlassButton
          fullWidth
          type="submit"
          disabled={isSubmitting}
          loading={isSubmitting}
          className="mt-2"
        >
          {isSubmitting ? t('auth.signingUp', 'Đang tạo tài khoản…') : t('auth.signUpBtn', 'Đăng ký tài khoản')}
        </GlassButton>

        {/* Link to Login */}
        <div className="text-center font-sans text-xs sm:text-sm text-slate-500 pt-1">
          <span>{t('auth.alreadyHaveAccount', 'Đã có tài khoản?')}</span>{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-semibold text-[#1A5CFF] hover:text-[#1242bd] hover:underline transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1A5CFF] rounded-sm"
          >
            {t('auth.loginNowLink', 'Đăng nhập ngay')}
          </button>
        </div>
      </form>
    </div>
  );
}
