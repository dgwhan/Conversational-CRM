import React from 'react';
import { Link } from 'react-router-dom';
import { useLandingContent } from '../hooks/useLandingContent.js';
import { Reveal } from './Reveal.js';
import polarisxLogo from '../../../assets/logo/polarisx-logo.svg';

const LINK_CLASS =
  'inline-block rounded-sm text-sm font-medium text-slate-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4DA3FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1F3A] sm:text-base';

export const LandingFooter: React.FC = () => {
  const { footer } = useLandingContent();

  return (
    <footer className="bg-[#0B1F3A] font-['Roboto',ui-sans-serif,system-ui,sans-serif] text-white landing-dark:bg-[#050F1E]">
      <div className="mx-auto max-w-7xl px-4 pb-8 pt-14 sm:px-6 sm:pt-16 lg:px-8">
        <Reveal className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md">
            <div className="flex items-center gap-2.5">
              <img src={polarisxLogo} alt="" aria-hidden="true" className="h-9 w-9 shrink-0 object-contain" />
              <div className="flex flex-col">
                <div
                  className="text-2xl leading-none tracking-[-0.03em] text-white sm:text-3xl"
                  style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif", fontWeight: 800 }}
                >
                  Polaris<span className="text-[#4DA3FF]">X</span>
                </div>
                <span className="mt-1 text-xs text-slate-400">Conversational CRM</span>
              </div>
            </div>
            <p className="mt-4 text-base leading-relaxed text-slate-300">{footer.description}</p>
          </div>

          <nav aria-label="Pháp lý">
            <ul className="flex flex-col gap-3">
              <li>
                <Link to="/privacy" className={LINK_CLASS}>
                  {footer.privacy}
                </Link>
              </li>
              <li>
                <Link to="/terms" className={LINK_CLASS}>
                  {footer.terms}
                </Link>
              </li>
            </ul>
          </nav>
        </Reveal>

        <div className="mt-12 border-t border-white/15 pt-6 text-sm text-slate-400 sm:mt-14">
          <p>
            © {new Date().getFullYear()} Polaris<span className="font-bold text-[#4DA3FF]">X</span> Conversational
            CRM. {footer.rights}
          </p>
        </div>
      </div>
    </footer>
  );
};
