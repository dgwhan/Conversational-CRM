import React, { lazy, Suspense } from 'react';
import { useLandingTheme } from '../hooks/useLandingInteractions.js';
import { LandingNavbar } from '../components/LandingNavbar.js';
import { HeroSection } from '../components/HeroSection.js';
import LandingPageSkeleton from '../components/LandingPageSkeleton.js';

// Lazy-load below-the-fold sections for blazing fast FCP and LCP
const HowItWorksSection = lazy(() =>
  import('../components/HowItWorksSection.js').then((m) => ({ default: m.HowItWorksSection }))
);
const LiveDemoInbox = lazy(() =>
  import('../components/LiveDemoInbox.js').then((m) => ({ default: m.LiveDemoInbox }))
);

const TestimonialsSection = lazy(() =>
  import('../components/TestimonialsSection.js').then((m) => ({ default: m.TestimonialsSection }))
);
const FinalCtaSection = lazy(() =>
  import('../components/FinalCtaSection.js').then((m) => ({ default: m.FinalCtaSection }))
);
const LandingFooter = lazy(() =>
  import('../components/LandingFooter.js').then((m) => ({ default: m.LandingFooter }))
);

export const LandingHomePage: React.FC = () => {
  const { isDark, toggleTheme } = useLandingTheme();

  return (
    <div
      data-landing-theme={isDark ? 'dark' : 'light'}
      className="min-h-screen bg-slate-50 landing-dark:bg-[#0B0F19] text-slate-800 landing-dark:text-slate-100 selection:bg-blue-600 selection:text-white font-sans antialiased relative transition-colors duration-300 overflow-x-hidden"
    >
      {/* Background ambient mesh gradient */}
      <div className="fixed inset-0 pointer-events-none -z-20 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-500/10 landing-dark:bg-blue-600/15 blur-[120px]" />
        <div className="absolute top-[30%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-indigo-500/10 landing-dark:bg-indigo-600/10 blur-[130px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-cyan-500/10 landing-dark:bg-cyan-600/10 blur-[140px]" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="fixed inset-0 pointer-events-none -z-10 opacity-[0.03] landing-dark:opacity-[0.05]"
        style={{
          backgroundImage: `radial-gradient(currentColor 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Sticky navigation */}
      <LandingNavbar isDark={isDark} onToggleTheme={toggleTheme} />

      {/* Main Content Sections */}
      <main id="main-content">
        {/* Hero: above the fold */}
        <HeroSection />

        {/* Interactive demo leads into the unified operating workflow. */}
        <Suspense fallback={<LandingPageSkeleton variant="demo" />}>
          <LiveDemoInbox />
        </Suspense>

        <Suspense fallback={<LandingPageSkeleton variant="steps" />}>
          <HowItWorksSection />
        </Suspense>

        <Suspense fallback={<LandingPageSkeleton variant="testimonials" />}>
          <TestimonialsSection />
        </Suspense>

        <Suspense fallback={<LandingPageSkeleton variant="cta" />}>
          <FinalCtaSection />
        </Suspense>
      </main>

      {/* Footer */}
      <Suspense fallback={<LandingPageSkeleton variant="footer" />}>
        <LandingFooter />
      </Suspense>
    </div>
  );
};

export default LandingHomePage;
