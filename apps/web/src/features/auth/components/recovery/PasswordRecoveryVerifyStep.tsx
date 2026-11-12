import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type SubmitEvent,
} from 'react';
import { GlassButton } from '../../../../components/ui/GlassButton.js';
import {
  requestPasswordRecoveryOtp,
  verifyPasswordRecoveryOtp,
} from '../../api/password-recovery.api.js';
import { useTranslation } from '../../../../i18n/index.js';
import { ShieldAlert } from 'lucide-react';
import {
  OTP_LENGTH,
  RESEND_COOLDOWN_SECONDS,
  getRequestErrorMessage,
  getVerificationErrorMessage,
} from './recovery.constants.js';

type PasswordRecoveryVerifyStepProps = {
  email: string;
  onSuccess: (resetToken: string) => void;
  onBackToRequest: () => void;
};

export function PasswordRecoveryVerifyStep({
  email,
  onSuccess,
  onBackToRequest,
}: PasswordRecoveryVerifyStepProps) {
  const { t } = useTranslation();
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(RESEND_COOLDOWN_SECONDS);
  const otpInputs = useRef<Array<HTMLInputElement | null>>([]);
  const otp = digits.join('');

  useEffect(() => {
    // Focus ô đầu tiên khi component mount
    otpInputs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendSeconds === 0) return;

    const timer = window.setTimeout(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  async function handleResend() {
    setIsSubmitting(true);
    setError('');

    try {
      await requestPasswordRecoveryOtp({ email });
      setResendSeconds(RESEND_COOLDOWN_SECONDS);
      setDigits(Array(OTP_LENGTH).fill(''));
      otpInputs.current[0]?.focus();
    } catch (cause) {
      setError(getRequestErrorMessage(cause));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerify(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (otp.length < OTP_LENGTH) {
      setError(t('auth.otpIncomplete', 'Vui lòng nhập đủ {n} chữ số của mã xác minh.', { n: OTP_LENGTH }));
      const firstEmptyIndex = digits.findIndex((digit) => !digit);
      otpInputs.current[firstEmptyIndex === -1 ? 0 : firstEmptyIndex]?.focus();
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await verifyPasswordRecoveryOtp({ email, otp });
      onSuccess(response.resetToken);
    } catch (cause) {
      setError(getVerificationErrorMessage(cause));
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateDigit(index: number, rawValue: string) {
    const value = rawValue.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    setError('');

    if (value && index < OTP_LENGTH - 1) {
      otpInputs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
      return;
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      otpInputs.current[index - 1]?.focus();
      return;
    }

    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      event.preventDefault();
      otpInputs.current[index + 1]?.focus();
    }
  }

  function handleOtpPaste(event: ClipboardEvent<HTMLInputElement>) {
    const pastedDigits = event.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, OTP_LENGTH);
    if (!pastedDigits) return;

    event.preventDefault();
    const next = Array.from({ length: OTP_LENGTH }, (_, index) => pastedDigits[index] ?? '');
    setDigits(next);
    setError('');
    otpInputs.current[Math.min(pastedDigits.length, OTP_LENGTH) - 1]?.focus();
  }

  const formattedCountdown = `00:${String(resendSeconds).padStart(2, '0')}`;

  return (
    <section className="animate-in fade-in duration-300">
      <header className="flex flex-col gap-1.5 text-center sm:text-left">
        <h2 className="m-0 font-sans text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          {t('auth.recovery.verifyTitle', 'Xác minh email')}
        </h2>
        <p className="m-0 font-sans text-xs sm:text-sm text-slate-600 leading-relaxed">
          {t('auth.recovery.verifyDescPrefix', 'Mã xác minh đã được gửi đến')}{' '}
          <span className="font-semibold text-slate-900">{email}</span>.{' '}
          {t('auth.recovery.verifyDescSuffix', 'Nhập mã gồm 6 chữ số để xác minh email.')}
        </p>
      </header>

      <form
        className="mt-6 flex flex-col gap-6"
        noValidate
        onSubmit={handleVerify}
      >
        <fieldset className="min-w-0 border-0 p-0">
          <legend className="mb-2 font-sans text-sm font-medium text-slate-700">
            {t('auth.recovery.otpLegend', 'Mã xác minh')}
          </legend>
          <div
            className="grid grid-cols-6 gap-2 sm:gap-3"
            role="group"
            aria-label={t('auth.otpGroupLabel', 'Mã xác minh gồm {n} chữ số', { n: OTP_LENGTH })}
          >
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  otpInputs.current[index] = element;
                }}
                aria-label={t('auth.otpDigitLabel', 'Chữ số {n} của mã xác minh', { n: index + 1 })}
                aria-invalid={error ? true : undefined}
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                className="glass-field-input h-12 min-w-0 rounded-xl border border-slate-300 bg-white/80 text-center font-sans text-lg sm:text-xl font-bold text-slate-900 outline-none focus:border-[#1A5CFF] focus:ring-3 focus:ring-[#1A5CFF]/20 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                disabled={isSubmitting}
                inputMode="numeric"
                maxLength={1}
                onChange={(event) => updateDigit(index, event.target.value)}
                onKeyDown={(event) => handleOtpKeyDown(index, event)}
                onPaste={handleOtpPaste}
                pattern="[0-9]*"
                required
                type="text"
                value={digit}
              />
            ))}
          </div>
        </fieldset>

        {/* Thông báo lỗi khi xác minh thất bại */}
        {!isSubmitting && error && (
          <div
            className="rounded-xl border border-red-200 bg-red-50/90 p-3 text-xs sm:text-sm text-red-700 backdrop-blur-xs flex items-start gap-2.5 animate-in fade-in duration-200"
            role="alert"
          >
            <ShieldAlert size={18} className="shrink-0 text-red-600 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        <GlassButton
          disabled={isSubmitting}
          fullWidth
          loading={isSubmitting}
          type="submit"
        >
          {isSubmitting ? t('auth.recovery.verifying', 'Đang xác minh mã…') : t('auth.recovery.verifyBtn', 'Xác minh mã')}
        </GlassButton>

        <div className="flex flex-col items-center gap-2 text-center pt-1">
          <button
            className="text-xs sm:text-sm font-medium disabled:cursor-not-allowed disabled:text-slate-400 enabled:text-[#1A5CFF] enabled:hover:text-[#1242bd] enabled:hover:underline transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1A5CFF] rounded-sm"
            disabled={resendSeconds > 0 || isSubmitting}
            onClick={() => void handleResend()}
            type="button"
          >
            {t('auth.recovery.resendCode', 'Gửi lại mã')}
          </button>
          <p
            className="text-xs text-slate-500 font-sans"
            aria-live="polite"
          >
            {resendSeconds > 0
              ? `${t('auth.recovery.resendIn', 'Có thể gửi lại sau')} ${formattedCountdown}`
              : t('auth.recovery.canResend', 'Bạn có thể yêu cầu gửi lại mã.')}
          </p>
          <button
            className="mt-2 text-xs sm:text-sm font-semibold text-[#1A5CFF] hover:text-[#1242bd] hover:underline transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1A5CFF] rounded-sm"
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
