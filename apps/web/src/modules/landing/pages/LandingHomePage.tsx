import React from 'react';
import { useLandingTheme } from '../hooks/useLandingInteractions.js';
import { LandingNavbar } from '../components/LandingNavbar.js';
import { HeroSection } from '../components/HeroSection.js';
import { StatsStrip } from '../components/StatsStrip.js';
import { BentoFeatures } from '../components/BentoFeatures.js';
import { HowItWorksSection } from '../components/HowItWorksSection.js';
import { LiveDemoInbox } from '../components/LiveDemoInbox.js';
import { DashboardPreviewSection } from '../components/DashboardPreviewSection.js';
import { TestimonialsSection } from '../components/TestimonialsSection.js';
import { FinalCtaSection } from '../components/FinalCtaSection.js';
import { LandingFooter } from '../components/LandingFooter.js';

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
        {/* 2. Hero Section with 3D Tilt Mockup & Mascot Cusi */}
        <HeroSection />

        {/* 3. Trusted Stats Strip */}
        <StatsStrip />

        {/* 4. Bento Grid Features (8 cards) */}
        <BentoFeatures />

        {/* 5. How It Works (4-step timeline with 2D characters) */}
        <HowItWorksSection />

        {/* 6. Live Interactive Inbox Demo */}
        <LiveDemoInbox />

        {/* 7. Dashboard & SVG KPI Charts Preview */}
        <DashboardPreviewSection />

        {/* 8. Universities Testimonials Carousel */}
        <TestimonialsSection />

        {/* 9. Final CTA with Confetti & Celebrating Mascot */}
        <FinalCtaSection />
      </main>

      {/* 10. Footer */}
      <LandingFooter />
    </div>
  );
};

export default LandingHomePage;
