import type { ElementType, HTMLAttributes, ReactNode } from 'react';

export type GlassCardProps<T extends ElementType = 'section'> = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  as?: T;
  className?: string;
  hasHighlight?: boolean;
};

/**
 * GlassCard - Reusable frosted glass container with luminous white glass and soft blue shadow
 */
export function GlassCard<T extends ElementType = 'section'>({
  children,
  as,
  className = '',
  hasHighlight = true,
  ...props
}: GlassCardProps<T>) {
  const Component = as || 'section';

  return (
    <Component
      className={`glass-card relative z-10 w-full max-w-[min(440px,92vw)] rounded-[24px] border border-white/95 bg-white/95 shadow-[0_20px_48px_-12px_rgba(26,92,255,0.08),0_6px_20px_-4px_rgba(15,23,42,0.04),inset_0_1px_0_#ffffff] backdrop-blur-[20px] backdrop-saturate-[160%] [-webkit-backdrop-filter:blur(20px)_saturate(160%)] overflow-hidden ring-1 ring-slate-200/50 ${
        hasHighlight ? 'glass-card-highlight' : ''
      } ${className}`}
      {...props}
    >
      {/* Subtle top-left highlight using linear-gradient overlay */}
      {hasHighlight && (
        <div
          className="pointer-events-none absolute inset-0 z-0 rounded-[24px] bg-[linear-gradient(135deg,rgba(255,255,255,0.7)_0%,rgba(255,255,255,0.2)_40%,transparent_70%)]"
          aria-hidden="true"
        />
      )}

      {/* Content wrapper with relative z-10 so interactions and focus states sit above the highlight */}
      <div className="relative z-10 w-full">
        {children}
      </div>
    </Component>
  );
}
