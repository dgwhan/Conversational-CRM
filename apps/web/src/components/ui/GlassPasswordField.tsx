import { useState, type ReactNode } from 'react';
import { EyeIcon, EyeOffIcon, LockIcon } from '../icons/AuthIcons.js';
import { GlassInput } from './GlassInput.js';

export type GlassPasswordFieldProps = {
  id?: string;
  label?: ReactNode;
  headerRight?: ReactNode;
  name?: string;
  autoComplete?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  errorMessage?: string;
  successMessage?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  containerClassName?: string;
};

/**
 * GlassPasswordField - Frosted glass password field with interior lock icon
 * and right-aligned visibility toggle button.
 */
export function GlassPasswordField({
  id,
  label = 'Mật khẩu',
  headerRight,
  name = 'password',
  autoComplete = 'current-password',
  value,
  onChange,
  onBlur,
  errorMessage,
  successMessage,
  placeholder = 'Nhập mật khẩu',
  disabled,
  required = true,
  containerClassName,
}: GlassPasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <GlassInput
      id={id}
      label={label}
      headerRight={headerRight}
      name={name}
      type={visible ? 'text' : 'password'}
      autoComplete={autoComplete}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      leadingIcon={<LockIcon size={18} />}
      trailingAdornment={
        <button
          type="button"
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          aria-pressed={visible}
          disabled={disabled}
          onClick={() => setVisible((cur) => !cur)}
          className="grid size-8 place-items-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A5CFF] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          {visible ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
        </button>
      }
      errorMessage={errorMessage}
      successMessage={successMessage}
      disabled={disabled}
      required={required}
      containerClassName={containerClassName}
    />
  );
}
