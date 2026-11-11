import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';

export type GlassInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'prefix'
> & {
  label?: ReactNode;
  headerRight?: ReactNode;
  leadingIcon?: ReactNode;
  trailingAdornment?: ReactNode;
  errorMessage?: string;
  successMessage?: string;
  containerClassName?: string;
};

/**
 * GlassInput - Reusable glassmorphic input with integrated interior icon,
 * clear high-contrast typography, and smooth focus states.
 */
export function GlassInput({
  id,
  label,
  headerRight,
  leadingIcon,
  trailingAdornment,
  errorMessage,
  successMessage,
  className = '',
  containerClassName = '',
  disabled,
  required,
  ...inputProps
}: GlassInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const successId = `${inputId}-success`;

  const describedBy =
    [
      inputProps['aria-describedby'],
      errorMessage ? errorId : undefined,
      successMessage ? successId : undefined,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div className={`flex flex-col gap-1.5 w-full ${containerClassName}`}>
      {label && (
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor={inputId}
            className="font-sans text-sm font-medium text-slate-700 select-none"
          >
            {label}
            {required && <span className="ml-1 text-red-500" aria-hidden="true">*</span>}
          </label>
          {headerRight}
        </div>
      )}

      <div className="relative flex items-center w-full">
        {leadingIcon && (
          <span
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 flex items-center justify-center size-5 transition-colors duration-150 z-10"
            aria-hidden="true"
          >
            {leadingIcon}
          </span>
        )}

        <input
          {...inputProps}
          id={inputId}
          disabled={disabled}
          required={required}
          aria-invalid={errorMessage ? true : undefined}
          aria-describedby={describedBy}
          className={`glass-field-input h-12 w-full rounded-[12px] bg-slate-50/90 text-slate-900 font-sans text-sm placeholder:text-slate-400 outline-none border transition-all duration-150 ${
            leadingIcon ? 'pl-11' : 'pl-4'
          } ${
            trailingAdornment ? 'pr-11' : 'pr-4'
          } ${
            errorMessage
              ? 'has-error border-red-500 focus:border-red-500 focus:ring-3 focus:ring-red-400/25 bg-red-50/30'
              : 'border-slate-300 focus:border-[#1A5CFF] focus:ring-3 focus:ring-[#1A5CFF]/20 focus:bg-white'
          } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        />

        {trailingAdornment && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center z-10">
            {trailingAdornment}
          </div>
        )}
      </div>

      {errorMessage && (
        <p
          id={errorId}
          role="alert"
          className="m-0 text-xs text-red-600 font-medium tracking-normal"
        >
          {errorMessage}
        </p>
      )}

      {!errorMessage && successMessage && (
        <p
          id={successId}
          className="m-0 text-xs text-emerald-600 font-medium tracking-normal"
        >
          {successMessage}
        </p>
      )}
    </div>
  );
}
