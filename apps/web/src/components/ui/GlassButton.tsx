import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export type GlassButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  fullWidth?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
};

/**
 * GlassButton - Primary action button with brand gradient, hover lift,
 * subtle glow shadow, and loading/disabled states.
 */
export function GlassButton({
  children,
  className = '',
  fullWidth = false,
  type = 'button',
  loading = false,
  disabled,
  icon,
  iconPosition = 'left',
  ...props
}: GlassButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`glass-btn-primary inline-flex items-center justify-center gap-2 px-5 py-3 text-sm sm:text-base font-semibold cursor-pointer select-none outline-none focus-visible:ring-3 focus-visible:ring-[#1A5CFF]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
        fullWidth ? 'w-full' : ''
      } ${className}`.trim()}
      {...props}
    >
      {loading && <Loader2 size={18} className="animate-spin text-white shrink-0" />}
      {!loading && icon && iconPosition === 'left' && (
        <span className="inline-flex shrink-0">{icon}</span>
      )}
      <span>{children}</span>
      {!loading && icon && iconPosition === 'right' && (
        <span className="inline-flex shrink-0">{icon}</span>
      )}
    </button>
  );
}
