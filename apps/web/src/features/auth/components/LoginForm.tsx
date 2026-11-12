import { useState, type FormEvent } from 'react';
import { MailIcon } from '../../../components/icons/AuthIcons.js';
import { GlassButton } from '../../../components/ui/GlassButton.js';
import { GlassCheckbox } from '../../../components/ui/GlassCheckbox.js';
import { GlassInput } from '../../../components/ui/GlassInput.js';
import { GlassPasswordField } from '../../../components/ui/GlassPasswordField.js';
import { AuthApiError, login } from '../api/auth.api.js';
import type { LoginResponse } from '../types/auth.types.js';
import { AUTH_MESSAGES } from '../validation/auth.validation.js';
import { useTranslation } from '../../../i18n/index.js';
import { ShieldAlert } from 'lucide-react';
import { STORAGE_KEYS } from '../../../config/storage-keys.js';

const REMEMBERED_IDENTIFIER_KEY = 'polarisx.rememberedIdentifier';
const REMEMBER_ME_KEY = STORAGE_KEYS.AUTH_REMEMBER_ME;

export type LoginFormProps = {
  onSuccess: (result: LoginResponse, rememberMe: boolean) => void;
  onForgotPassword: () => void;
  onSwitchToSignUp?: () => void;
  hideHeading?: boolean;
};

function readRememberedIdentifier(): string {
  try {
    return localStorage.getItem(REMEMBERED_IDENTIFIER_KEY) ?? '';
  } catch {
    return '';
  }
}

function readRememberMe(): boolean {
  try {
    return (
      localStorage.getItem(REMEMBER_ME_KEY) === 'true' ||
      Boolean(readRememberedIdentifier())
    );
  } catch {
    return false;
  }
}

export function LoginForm({
  onSuccess,
  onForgotPassword,
  onSwitchToSignUp,
  hideHeading = false,
}: LoginFormProps) {
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState(readRememberedIdentifier);
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(readRememberMe);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [identifierError, setIdentifierError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const nextIdentifierError = identifier.trim()
      ? ''
      : AUTH_MESSAGES.IDENTIFIER_REQUIRED;
    const nextPasswordError = password ? '' : AUTH_MESSAGES.PASSWORD_REQUIRED;
    setIdentifierError(nextIdentifierError);
    setPasswordError(nextPasswordError);

    if (nextIdentifierError || nextPasswordError) return;

    setIsSubmitting(true);

    try {
      const normalizedIdentifier = identifier.trim();
      const result = await login({
        identifier: normalizedIdentifier,
        password,
        rememberMe,
      });

      try {
        if (rememberMe) {
          localStorage.setItem(REMEMBERED_IDENTIFIER_KEY, normalizedIdentifier);
          localStorage.setItem(REMEMBER_ME_KEY, 'true');
        } else {
          localStorage.removeItem(REMEMBERED_IDENTIFIER_KEY);
          localStorage.removeItem(REMEMBER_ME_KEY);
        }
      } catch {
        // Remembrance is optional if browser storage is unavailable.
      }

      setPassword('');
      onSuccess(result, rememberMe);
    } catch (cause) {
      setError(
        cause instanceof AuthApiError
          ? cause.message
          : 'Không kết nối được máy chủ. Vui lòng kiểm tra kết nối mạng.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {!hideHeading && (
        <header className="flex flex-col gap-1.5 text-center sm:text-left">
          <h2 className="m-0 font-sans text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Chào mừng trở lại
          </h2>
          <p className="m-0 font-sans text-xs sm:text-sm text-slate-600 leading-relaxed">
            {t('auth.loginSubtitle', 'Đăng nhập để tiếp tục sử dụng hệ thống Conversational CRM.')}
          </p>
        </header>
      )}

      <form className="flex flex-col gap-5" noValidate onSubmit={handleSubmit}>
        {/* Email / SĐT Input */}
        <GlassInput
          label={t('auth.identifierLabel', 'Email hoặc Số điện thoại')}
          name="identifier"
          type="text"
          autoComplete="username"
          placeholder={t('auth.identifierPlaceholder', 'example@gmail.com')}
          value={identifier}
          onChange={(event) => {
            setIdentifier(event.target.value);
            if (identifierError) {
              setIdentifierError(
                event.target.value.trim() ? '' : AUTH_MESSAGES.IDENTIFIER_REQUIRED,
              );
            }
            if (error) setError('');
          }}
          onBlur={() => {
            if (identifierError) {
              setIdentifierError(
                identifier.trim() ? '' : AUTH_MESSAGES.IDENTIFIER_REQUIRED,
              );
            }
          }}
          leadingIcon={<MailIcon size={18} />}
          errorMessage={identifierError}
          required
          disabled={isSubmitting}
        />

        {/* Mật khẩu Input with interior toggle eye */}
        <GlassPasswordField
          label={t('auth.passwordLabel', '••••••••••')}
          value={password}
          onChange={(value) => {
            setPassword(value);
            if (passwordError) {
              setPasswordError(value ? '' : AUTH_MESSAGES.PASSWORD_REQUIRED);
            }
            if (error) setError('');
          }}
          errorMessage={passwordError}
          disabled={isSubmitting}
        />

        {/* Checkbox and Forgot Password link */}
        <div className="-mt-1 flex flex-wrap items-center justify-between gap-3 select-none">
          <GlassCheckbox
            checked={rememberMe}
            disabled={isSubmitting}
            onChange={(event) => setRememberMe(event.target.checked)}
          >
            {t('auth.rememberMe', 'Ghi nhớ đăng nhập')}
          </GlassCheckbox>

          <button
            className="text-xs sm:text-sm font-medium text-[#1A5CFF] hover:text-[#1242bd] hover:underline transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1A5CFF] rounded-sm"
            type="button"
            onClick={onForgotPassword}
          >
            Quên mật khẩu?
          </button>
        </div>

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
        <GlassButton fullWidth type="submit" disabled={isSubmitting} loading={isSubmitting}>
          {isSubmitting ? t('auth.loggingIn', 'Đang đăng nhập…') : t('auth.loginBtn', 'Đăng nhập')}
        </GlassButton>

        {/* Link to Sign Up */}
        {onSwitchToSignUp && (
          <div className="text-center font-sans text-xs sm:text-sm text-slate-500 pt-1">
            <span>{t('auth.dontHaveAccount', 'Chưa có tài khoản?')}</span>{' '}
            <button
              type="button"
              onClick={onSwitchToSignUp}
              className="font-semibold text-[#1A5CFF] hover:text-[#1242bd] hover:underline transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1A5CFF] rounded-sm"
            >
              Đăng ký ngay
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
