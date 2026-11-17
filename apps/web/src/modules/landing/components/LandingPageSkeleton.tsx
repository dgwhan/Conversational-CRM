import React from 'react';

type LandingSkeletonVariant = 'page' | 'demo' | 'steps' | 'testimonials' | 'cta' | 'footer';

const LandingPageSkeleton: React.FC<{ variant?: LandingSkeletonVariant }> = ({ variant = 'page' }) => {
  let isDark = false;
  try {
    isDark = typeof window !== 'undefined' && window.localStorage.getItem('polarisx_landing_theme') === 'dark';
  } catch { /* Fall back to the landing light palette if storage is unavailable. */ }
  const line = (shape: string) => (
    <div className={`${shape} rounded-full bg-slate-200/80 landing-dark:bg-white/10`} />
  );

  return (
    <div
      data-landing-theme={isDark ? 'dark' : 'light'}
      role="status"
      aria-label="Đang tải PolarisX"
      className="min-h-screen overflow-hidden bg-slate-50 font-sans text-slate-900 landing-dark:bg-[#0B0F19] landing-dark:text-white"
    >
      <span className="sr-only">Đang tải PolarisX</span>
      <div className="animate-pulse motion-reduce:animate-none" aria-hidden="true">
        {variant === 'page' ? (
          <>
            <header className="mx-auto flex h-20 max-w-7xl items-center justify-between border-b border-slate-200/80 px-4 landing-dark:border-white/10 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">{line('h-10 w-10 rounded-xl')}{line('h-5 w-32')}</div>
              <div className="hidden items-center gap-8 md:flex">{line('h-4 w-16')}{line('h-4 w-20')}{line('h-4 w-16')}</div>
              {line('h-10 w-28 rounded-lg')}
            </header>
            <main>
              <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:px-8">
                <div className="space-y-6">{line('h-10 w-full max-w-xl')}{line('h-10 w-4/5 max-w-lg')}{line('h-5 w-full max-w-lg')}{line('h-5 w-4/5 max-w-md')}<div className="flex gap-3 pt-2">{line('h-12 w-40 rounded-xl')}{line('h-12 w-36 rounded-xl')}</div></div>
                <div className="min-h-[250px] rounded-3xl bg-slate-200/50 landing-dark:bg-white/[0.04] sm:min-h-[360px]" />
              </section>
              <section className="border-y border-slate-200/80 bg-white py-16 landing-dark:border-white/10 landing-dark:bg-[#081628] sm:py-20">
                <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
                  <div className="space-y-4">{line('h-8 w-72 max-w-full')}{line('h-4 w-96 max-w-full')}</div>
                  <div className="divide-y divide-slate-200 border-y border-slate-200 landing-dark:divide-white/10 landing-dark:border-white/10">
                    {[0, 1, 2].map((item) => <div key={item} className="grid grid-cols-[2.5rem_1fr] gap-5 py-6">{line('h-6 w-8') }<div className="space-y-3">{line('h-5 w-2/3')}{line('h-4 w-full')}{line('h-4 w-4/5')}</div></div>)}
                  </div>
                </div>
              </section>
              <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">{line('h-8 w-64 max-w-full')}<div className="mt-8 min-h-[260px] rounded-3xl bg-slate-200/50 landing-dark:bg-white/[0.04]" /></section>
            </main>
          </>
        ) : (
          <div className="mx-auto my-8 w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            {variant === 'demo' && <><div className="mb-8 space-y-3">{line('h-8 w-64')}{line('h-4 w-96 max-w-full')}</div><div className="grid min-h-[340px] grid-cols-1 overflow-hidden rounded-2xl bg-slate-100 landing-dark:bg-white/[0.04] md:grid-cols-[280px_1fr]"><div className="space-y-4 border-b border-slate-200 p-5 landing-dark:border-white/10 md:border-b-0 md:border-r">{line('h-4 w-32')}{line('h-14 w-full rounded-xl')}{line('h-14 w-full rounded-xl')}{line('h-14 w-full rounded-xl')}</div><div className="flex flex-col justify-between p-5 sm:p-8"><div className="space-y-5">{line('h-4 w-40')}{line('h-12 w-3/4 rounded-xl')}{line('h-12 w-2/3 rounded-xl')}</div>{line('h-12 w-full rounded-xl')}</div></div></>}
            {variant === 'steps' && <div className="grid gap-12 lg:grid-cols-12"><div className="space-y-4 lg:col-span-5">{line('h-10 w-3/4')}{line('h-4 w-full')}{line('h-4 w-2/3')}{line('h-11 w-40 rounded-lg')}</div><div className="space-y-7 lg:col-span-7">{[0, 1, 2, 3, 4].map((item) => <div key={item} className="space-y-3 border-b border-slate-200 pb-6 landing-dark:border-white/10">{line('h-6 w-1/2')}{line('h-4 w-full')}{line('h-4 w-4/5')}</div>)}</div></div>}
            {variant === 'testimonials' && <div className="space-y-7 py-8">{line('h-8 w-56')}{line('h-24 w-full rounded-2xl')}{line('h-4 w-48')}</div>}
            {variant === 'cta' && <div className="space-y-5 py-12">{line('h-10 w-2/3 max-w-xl')}{line('h-5 w-3/4 max-w-2xl')}{line('h-12 w-44 rounded-xl')}</div>}
            {variant === 'footer' && <div className="flex flex-wrap gap-8 border-t border-slate-200 pt-8 landing-dark:border-white/10">{line('h-6 w-40')}{line('h-4 w-24')}{line('h-4 w-28')}{line('h-4 w-32')}</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default LandingPageSkeleton;
