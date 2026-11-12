import { Check } from 'lucide-react';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_SPECIAL_CHAR_LABEL,
  type PasswordStrength,
} from '../validation/auth.validation.js';
import { useTranslation } from '../../../i18n/index.js';

export type PasswordStrengthIndicatorProps = {
  strength: PasswordStrength;
  className?: string;
};

/**
 * PasswordStrengthIndicator - Checklist tiêu chuẩn mật khẩu hiển thị rõ ràng trên nền sáng
 */
export function PasswordStrengthIndicator({
  strength,
  className = '',
}: PasswordStrengthIndicatorProps) {
  const { t } = useTranslation();
  const criteria = [
    {
      id: 'min-length',
      label: t('auth.strength.minLength', 'Tối thiểu {n} ký tự', { n: PASSWORD_MIN_LENGTH }),
      passed: strength.hasMinLength,
    },
    {
      id: 'uppercase',
      label: t('auth.strength.uppercase', 'Ít nhất 1 chữ hoa'),
      passed: strength.hasUppercase,
    },
    {
      id: 'lowercase',
      label: t('auth.strength.lowercase', 'Ít nhất 1 chữ thường'),
      passed: strength.hasLowercase,
    },
    {
      id: 'number',
      label: t('auth.strength.number', 'Ít nhất 1 số'),
      passed: strength.hasNumber,
    },
    {
      id: 'special',
      label: t('auth.strength.special', 'Ít nhất 1 ký tự đặc biệt ({chars})', { chars: PASSWORD_SPECIAL_CHAR_LABEL }),
      passed: strength.hasSpecial,
    },
  ];

  return (
    <div
      className={`space-y-2.5 pt-1 animate-in fade-in duration-200 ${className}`}
    >
      {/* Tiêu đề quy tắc */}
      <p className="font-sans text-xs font-medium text-slate-700">
        {t('auth.strength.mustInclude', 'Mật khẩu phải bao gồm:')}
      </p>

      {/* Danh sách 5 tiêu chuẩn xếp dọc */}
      <div className="flex flex-col gap-2 font-sans text-xs">
        {criteria.map((item) => (
          <div
            key={item.id}
            className={`flex items-center gap-2.5 transition-colors duration-200 ${
              item.passed ? 'font-medium text-emerald-700' : 'text-slate-400'
            }`}
          >
            <div
              className={`flex size-4.5 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
                item.passed
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'border border-slate-300 bg-white text-transparent'
              }`}
            >
              <Check className="size-3 stroke-[3]" />
            </div>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
