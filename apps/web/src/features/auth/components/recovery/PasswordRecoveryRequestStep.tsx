import { useState, type SubmitEvent } from 'react';
import { MailIcon } from '../../../../components/icons/AuthIcons.js';
import { GlassButton } from '../../../../components/ui/GlassButton.js';
import { GlassInput } from '../../../../components/ui/GlassInput.js';
import { requestPasswordRecoveryOtp } from '../../api/password-recovery.api.js';
import { getRequestErrorMessage, validateEmail } from './recovery.constants.js';
import { useTranslation } from '../../../../i18n/index.js';
import { ShieldAlert } from 'lucide-react';

type PasswordRecoveryRequestStepProps = {
  initialEmail?: string;
  onSuccess: (email: string) => void;
  onBackToLogin: () => void;
};

export function PasswordRecoveryRequestStep({
  initialEmail = '',
  onSuccess,
  onBackToLogin,
}: PasswordRecoveryRequestStepProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState(initialEmail);
  const [emailError, setEmailError] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRequest(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateEmail(email);
    setEmailError(validationError);
    if (validationError) return;

    setIsSubmitting(true);
    setError('');

    try {
      const normalizedEmail = email.trim().toLowerCase();
      await requestPasswordRecoveryOtp({ email: normalizedEmail });
      onSuccess(normalizedEmail);
    } catch (cause) {
      setError(getRequestErrorMessage(cause));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="animate-in fade-in duration-300">
      <header className="flex flex-col gap-1.5 text-center sm:text-left">
        <h2 className="m-0 font-sans text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          {t('auth.recovery.forgotTitle', 'Quên mật khẩu?')}
        </h2>
        <p className="m-0 font-sans text-xs sm:text-sm text-slate-600 leading-relaxed">
          {t('auth.recovery.forgotDesc', 'Nhập địa chỉ email của bạn. Hệ thống sẽ gửi mã xác minh.')}
        </p>
      </header>

      <form
        className="mt-6 flex flex-col gap-5"
        noValidate
        onSubmit={handleRequest}
      >
        <GlassInput
          autoComplete="email"
          disabled={isSubmitting}
          errorMessage={emailError}
          label="Email"
          leadingIcon={<MailIcon size={18} />}
          name="email"
          onBlur={() => setEmailError(validateEmail(email))}
          onChange={(event) => {
            setEmail(event.target.value);
            if (emailError) setEmailError(validateEmail(event.target.value));
            setError('');
          }}
          placeholder={t('auth.recovery.emailPlaceholder', 'Nhập địa chỉ email của bạn')}
          required
          type="email"
          value={email}
        />

        {error && (
          <div
            className="rounded-xl border border-red-200 bg-red-50/90 p-3 text-xs sm:text-sm text-red-700 backdrop-blur-xs flex items-start gap-2.5 animate-in fade-in duration-200"
            role="alert"
          >
            <ShieldAlert size={18} className="shrink-0 text-red-600 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        <GlassButton disabled={isSubmitting} loading={isSubmitting} fullWidth type="submit">
          {isSubmitting ? t('auth.recovery.sendingCode', 'Đang gửi mã…') : t('auth.recovery.sendCodeBtn', 'Gửi mã xác minh')}
        </GlassButton>

        <button
          className="text-xs sm:text-sm font-semibold text-[#1A5CFF] hover:text-[#1242bd] hover:underline transition-colors cursor-pointer text-center outline-none focus-visible:ring-2 focus-visible:ring-[#1A5CFF] rounded-sm pt-1"
          onClick={onBackToLogin}
          type="button"
        >
          {t('auth.recovery.backToLogin', 'Quay lại đăng nhập')}
        </button>
      </form>
    </section>
  );
}
