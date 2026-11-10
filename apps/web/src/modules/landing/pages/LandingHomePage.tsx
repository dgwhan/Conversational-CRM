import React, { lazy, Suspense } from 'react';
import { useLandingTheme } from '../hooks/useLandingInteractions.js';
import { LandingNavbar } from '../components/LandingNavbar.js';
import { HeroSection } from '../components/HeroSection.js';
import { StatsStrip } from '../components/StatsStrip.js';
import { BentoFeatures } from '../components/BentoFeatures.js';

// Lazy-load below-the-fold sections for blazing fast FCP and LCP
const HowItWorksSection = lazy(() =>
  import('../components/HowItWorksSection.js').then((m) => ({ default: m.HowItWorksSection }))
);
const LiveDemoInbox = lazy(() =>
  import('../components/LiveDemoInbox.js').then((m) => ({ default: m.LiveDemoInbox }))
);
const DashboardPreviewSection = lazy(() =>
  import('../components/DashboardPreviewSection.js').then((m) => ({ default: m.DashboardPreviewSection }))
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

const SectionPlaceholder: React.FC = () => (
  <div className="w-full min-h-[160px] animate-pulse bg-slate-100/50 dark:bg-slate-900/30 rounded-3xl my-8" />
);

export const LandingHomePage: React.FC = () => {
  const { isDark, toggleTheme } = useLandingTheme();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-800 dark:text-slate-100 selection:bg-blue-600 selection:text-white font-sans antialiased relative transition-colors duration-300 overflow-x-hidden">
      {/* Background ambient mesh gradient */}
      <div className="fixed inset-0 pointer-events-none -z-20 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-500/10 dark:bg-blue-600/15 blur-[120px]" />
        <div className="absolute top-[30%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-indigo-500/10 dark:bg-indigo-600/10 blur-[130px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-cyan-500/10 dark:bg-cyan-600/10 blur-[140px]" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="fixed inset-0 pointer-events-none -z-10 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `radial-gradient(currentColor 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* 1. Sticky Glass Navbar */}
      <LandingNavbar isDark={isDark} onToggleTheme={toggleTheme} />

      {/* Main Content Sections */}
      <main id="main-content">
        {/* 2. Hero Section (Above the fold, Critical Rendering Path) */}
        <HeroSection />

        {/* 3. Trusted Stats Strip */}
        <StatsStrip />

        {/* 4. Bento Grid Features (8 cards) */}
        <BentoFeatures />

        {/* 5-9. Below-the-fold Lazy Loaded Sections */}
        <Suspense fallback={<SectionPlaceholder />}>
          <HowItWorksSection />
        </Suspense>

        <Suspense fallback={<SectionPlaceholder />}>
          <LiveDemoInbox />
        </Suspense>

        <Suspense fallback={<SectionPlaceholder />}>
          <DashboardPreviewSection />
        </Suspense>

        <Suspense fallback={<SectionPlaceholder />}>
          <TestimonialsSection />
        </Suspense>

        <Suspense fallback={<SectionPlaceholder />}>
          <FinalCtaSection />
        </Suspense>
      </main>

      {/* 10. Footer */}
      <Suspense fallback={<div className="h-20" />}>
        <LandingFooter />
      </Suspense>
    </div>
  );
};

export default LandingHomePage;
