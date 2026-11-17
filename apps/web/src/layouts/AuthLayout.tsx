import type { ReactNode } from 'react';
import { GlassCard } from '../components/ui/GlassCard.js';

export type AuthLayoutProps = {
  children: ReactNode;
  footer?: ReactNode;
  /** Thanh hành động phía trên card (vd: quay lại trang chủ, đổi ngôn ngữ) */
  topBar?: ReactNode;
};

/**
 * AuthLayout - Glassmorphism layout for Login & Register screens
 * Features a soft off-white & ice-blue backdrop with subtle pastel refracting blobs
 * and a centered frosted glass card container.
 */
export function AuthLayout({ children, footer, topBar }: AuthLayoutProps) {
  return (
    <main className="auth-page auth-glass-bg relative flex min-h-svh w-full flex-col items-center overflow-x-clip overflow-y-visible px-4 py-4 sm:px-6 sm:py-6">
      {topBar && (
        <div className="relative z-20 flex w-full max-w-5xl items-center justify-between gap-2">
          {topBar}
        </div>
      )}

      {/* Auth content stays in the document flow so long forms use the page scroll. */}
      <GlassCard className="auth-page-card p-6 sm:p-8 my-auto">
        {children}
        {footer}
      </GlassCard>
    </main>
  );
}
