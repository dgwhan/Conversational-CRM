import { useState, type ReactNode } from "react";
import {
  EyeIcon,
  EyeOffIcon,
  LockIcon,
} from "../icons/AuthIcons.js";
import { TextField } from "./TextField.js";

import { useOptionalTranslation } from '../../i18n/index.js';
import { translate } from '../../i18n/translate.js';
type PasswordFieldProps = {
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
};

export function PasswordField({
  id,
  label = translate('auth.passwordFieldLabel', 'Mật khẩu'),
  headerRight,
  name = "password",
  autoComplete = "current-password",
  value,
  onChange,
  onBlur,
  errorMessage,
  successMessage,
  placeholder = translate('auth.passwordFieldPlaceholder', 'Nhập mật khẩu'),
  disabled,
}: PasswordFieldProps) {
  const { t } = useOptionalTranslation();
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      id={id}
      label={label}
      headerRight={headerRight}
      name={name}
      type={visible ? "text" : "password"}
      autoComplete={autoComplete}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      leadingIcon={<LockIcon />}
      trailingAdornment={
        <button
          className="grid size-8 place-items-center rounded-sm text-text-secondary hover:bg-bg-page disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          aria-label={visible ? t('auth.hidePassword', 'Ẩn mật khẩu') : t('auth.showPassword', 'Hiện mật khẩu')}
          aria-pressed={visible}
          disabled={disabled}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      }
      errorMessage={errorMessage}
      successMessage={successMessage}
      disabled={disabled}
      required
    />
  );
}
