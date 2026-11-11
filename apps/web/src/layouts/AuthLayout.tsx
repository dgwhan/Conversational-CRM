import type { ReactNode } from 'react';
import { GlassCard } from '../components/ui/GlassCard.js';

export type AuthLayoutProps = {
  children: ReactNode;
  footer?: ReactNode;
};

/**
 * AuthLayout - Glassmorphism layout for Login & Register screens
 * Features a soft off-white & ice-blue backdrop with subtle pastel refracting blobs
 * and a centered frosted glass card container.
 */
export function AuthLayout({ children, footer }: AuthLayoutProps) {
  return (
    <main className="auth-glass-bg relative flex min-h-svh w-full items-center justify-center overflow-x-hidden overflow-y-auto px-4 py-8 sm:px-6">
      {/* 1. Subtle Pastel Decorative Blobs behind the card for gentle refraction */}
      <div
        className="pointer-events-none absolute -top-20 -left-20 h-80 w-80 sm:h-96 sm:w-96 rounded-full bg-blue-300/40 blur-[100px] animate-blob-pulse"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-20 -right-20 h-80 w-80 sm:h-96 sm:w-96 rounded-full bg-indigo-300/35 blur-[110px] animate-blob-pulse-delayed"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-72 w-72 rounded-full bg-sky-200/50 blur-[90px]"
        aria-hidden="true"
      />

      {/* 2. Frosted Glass Card Container */}
      <GlassCard className="p-6 sm:p-8 my-auto">
        {children}
        {footer}
      </GlassCard>
    </main>
  );
}
