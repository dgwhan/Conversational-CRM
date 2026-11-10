import type { ReactNode } from 'react';

type AuthLayoutProps = {
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthLayout({ children, footer }: AuthLayoutProps) {
  return (
    <main className="grid min-h-svh place-items-center bg-[image:var(--mesh-bg-gradient,#f8fafc)] px-4 py-8 sm:px-8">
      <section className="glass-modal w-full max-w-[548px] rounded-2xl border border-white/85 bg-white/85 px-6 py-8 shadow-[0_16px_36px_-6px_rgba(15,23,42,0.08),0_4px_12px_-2px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-md sm:px-10 sm:py-10 lg:px-12 transition-all duration-200">
        <div className="mx-auto w-full max-w-[436px]">
          {children}
          {footer}
        </div>
      </section>
    </main>
  );
}
