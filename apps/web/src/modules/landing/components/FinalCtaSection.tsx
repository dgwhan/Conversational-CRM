import React from 'react';
import { ArrowRight, CheckCircle2, Shield, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MascotCusi } from './characters/MascotCusi.js';
import { useLandingContent } from '../hooks/useLandingContent.js';
import { ROUTES } from '../../../config/routes.js';
import { Reveal } from './Reveal.js';

const ICONS = [CheckCircle2, Shield, Zap];

export const FinalCtaSection: React.FC<{ isDark?: boolean }> = ({ isDark: _isDark = false }) => {
  const { cta } = useLandingContent();

  return (
    <section
      aria-labelledby="final-cta-heading"
      className="bg-white py-16 font-['Roboto',ui-sans-serif,system-ui,sans-serif] text-[#0B1F3A] sm:py-24 landing-dark:bg-[#081628] landing-dark:text-white"
    >
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
        <div className="text-center lg:col-span-8 lg:text-left">
          <Reveal>
            <h2
              id="final-cta-heading"
              className="text-[1.9rem] leading-[1.15] tracking-[-0.03em] text-balance text-[#0B1F3A] sm:text-5xl sm:leading-[1.1] lg:text-[3.25rem] landing-dark:text-white"
              style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif", fontWeight: 800 }}
            >
              {cta.title}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg lg:mx-0 landing-dark:text-slate-300">
              {cta.subtitle}
            </p>
          </Reveal>

          <Reveal delay={100}>
            <ul className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2.5 text-sm font-medium lg:justify-start">
              {ICONS.map((Icon, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{cta.checklist[i]}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={200}>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
              <Link
                to={ROUTES.LOGIN}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0074F0] px-6 text-sm font-medium text-white transition-colors hover:bg-[#0063CC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0074F0] focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:w-auto landing-dark:focus-visible:ring-offset-[#081628]"
              >
                <span>{cta.primary}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-slate-300 px-6 text-sm font-medium text-[#0B1F3A] transition-colors hover:bg-[#E8F2FE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0074F0] focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:w-auto landing-dark:border-white/20 landing-dark:text-white landing-dark:hover:bg-white/10 landing-dark:focus-visible:ring-offset-[#081628]"
              >
                {cta.secondary}
              </a>
            </div>
          </Reveal>
        </div>

        <Reveal variant="slide-right" delay={150} className="flex justify-center lg:col-span-4">
          <MascotCusi mood="celebrating" size={180} showSpeechBubble={true} speechText={cta.mascot} />
        </Reveal>
      </div>
    </section>
  );
};
