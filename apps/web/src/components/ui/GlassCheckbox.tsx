import type { InputHTMLAttributes, ReactNode } from 'react';
import { Check } from 'lucide-react';

export type GlassCheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  children?: ReactNode;
};

/**
 * GlassCheckbox - Custom glass-themed checkbox matching the light frosted style.
 */
export function GlassCheckbox({
  children,
  className = '',
  disabled,
  checked,
  ...props
}: GlassCheckboxProps) {
  return (
    <label
      className={`inline-flex items-center gap-2.5 select-none font-sans text-sm text-slate-700 ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:text-slate-900'
      } ${className}`.trim()}
    >
      <div className="relative flex size-5 shrink-0 items-center justify-center">
        <input
          {...props}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          className="peer sr-only"
        />
        <div
          className={`glass-checkbox-box ${
            checked ? 'checked' : ''
          } peer-focus-visible:ring-2 peer-focus-visible:ring-[#1A5CFF]/30 peer-hover:border-slate-400`}
        >
          <Check
            className={`size-3.5 text-white stroke-[2.5] transition-opacity duration-150 ${
              checked ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </div>
      </div>
      {children && <span className="text-xs sm:text-sm font-medium text-slate-700">{children}</span>}
    </label>
  );
}
