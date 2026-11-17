import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { useScrollProgress } from '../hooks/useLandingInteractions.js';
import { useLandingContent } from '../hooks/useLandingContent.js';
import { useUserRole } from '../../auth/UserRoleContext.js';
import { useTranslation, type Locale } from '../../../i18n/index.js';
import { ROUTES } from '../../../config/routes.js';
import polarisxLogo from '../../../assets/logo/polarisx-logo.svg';

export interface LandingNavbarProps {
  isDark?: boolean;
  onToggleTheme?: () => void;
}

const LOCALES: Locale[] = ['vi', 'en'];

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0074F0] focus-visible:ring-offset-2 focus-visible:ring-offset-white landing-dark:focus-visible:ring-offset-[#081628]';

/** Nút chính: màu phẳng, không bóng, không phát sáng. */
const BTN_PRIMARY = `inline-flex h-9 cursor-pointer items-center justify-center whitespace-nowrap rounded-lg bg-[#0074F0] px-4 text-sm font-medium text-white transition-colors hover:bg-[#0063CC] ${FOCUS_RING}`;

/** Nút phụ: chỉ chữ, không viền. */
const BTN_GHOST = `inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 landing-dark:text-slate-200 landing-dark:hover:bg-white/10 ${FOCUS_RING}`;

/** Chuyển ngôn ngữ VI/EN: dạng chữ đơn giản, không icon, không viền. */
const LandingLanguageToggle: React.FC<{ ariaLabel: string }> = ({ ariaLabel }) => {
  const { locale, setLocale } = useTranslation();

  return (
    <div role="group" aria-label={ariaLabel} className="inline-flex items-center gap-0.5">
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          aria-pressed={locale === code}
          className={`cursor-pointer rounded-md px-2 py-1 text-xs font-medium uppercase transition-colors ${FOCUS_RING} ${
            locale === code
              ? 'text-[#0B1F3A] landing-dark:text-white'
              : 'text-slate-400 hover:text-slate-700 landing-dark:text-slate-500 landing-dark:hover:text-slate-200'
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );
};

export const LandingNavbar: React.FC<LandingNavbarProps> = ({
  isDark = false,
  onToggleTheme,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const scrollProgress = useScrollProgress();
  const { isAuthenticated } = useUserRole();
  const navigate = useNavigate();
  const { nav } = useLandingContent();

  return (
    <>
      {/* Thanh tiến trình cuộn: mảnh, phẳng, không glow */}
      <div className="fixed left-0 top-0 z-[100] h-0.5 w-full bg-transparent">
        <div
          className="h-full bg-[#0074F0] transition-[width] duration-75 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <header
        className={`fixed left-0 top-0 z-50 w-full border-b font-['Roboto',ui-sans-serif,system-ui,sans-serif] ${
          isDark
            ? 'border-white/10 bg-[#081628] text-white'
            : 'border-slate-200 bg-white text-[#0B1F3A]'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6 lg:px-8">
          {/* Logo: không khung, không viền, không bóng */}
          <Link
            to="/"
            className={`flex min-w-0 cursor-pointer items-center gap-2.5 rounded-lg ${FOCUS_RING}`}
            aria-label={nav.homeAria}
          >
            <img
              src={polarisxLogo}
              alt="PolarisX Logo"
              className="h-8 w-8 shrink-0 object-contain"
            />
            <div className="flex min-w-0 flex-col">
              <div
                className={`text-xl leading-none tracking-[-0.03em] ${isDark ? 'text-white' : 'text-[#0B1F3A] landing-dark:text-white'}`}
                style={{
                  fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
                  fontWeight: 800,
                }}
              >
                Polaris<span className={isDark ? 'text-[#4DA3FF]' : 'text-[#0074F0] landing-dark:text-[#4DA3FF]'}>X</span>
              </div>
              <span className={`truncate text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500 landing-dark:text-slate-400'}`}>
                {nav.brandSubtitle}
              </span>
            </div>
          </Link>

          {/* Desktop links */}
          <nav className="hidden items-center gap-1 text-sm font-medium lg:flex">
            {nav.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-slate-600 transition-colors hover:text-[#0074F0] landing-dark:text-slate-300 landing-dark:hover:text-[#4DA3FF] ${FOCUS_RING}`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop right */}
          <div className="hidden items-center gap-2 sm:flex">
            <LandingLanguageToggle ariaLabel={nav.languageAria} />
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className={`hidden h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 lg:flex landing-dark:text-slate-300 landing-dark:hover:bg-white/10 ${FOCUS_RING}`}
                aria-label={nav.themeAria}
              >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            )}
            {isAuthenticated ? (
              <button type="button" onClick={() => navigate(ROUTES.REPORTS)} className={BTN_PRIMARY}>
                {nav.goToCrm}
              </button>
            ) : (
              <>
                <Link to={ROUTES.LOGIN} className={`${BTN_GHOST} lg:hidden xl:inline-flex`}>
                  {nav.login}
                </Link>
                <Link to={ROUTES.LOGIN} className={BTN_PRIMARY}>
                  {nav.tryFree}
                </Link>
              </>
            )}
          </div>

          {/* Mobile */}
          <div className="flex items-center gap-1 lg:hidden">
            <div className="sm:hidden">
              <LandingLanguageToggle ariaLabel={nav.languageAria} />
            </div>
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className={`flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 landing-dark:text-slate-300 landing-dark:hover:bg-white/10 ${FOCUS_RING}`}
                aria-label={nav.themeAria}
              >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 landing-dark:text-slate-200 landing-dark:hover:bg-white/10 ${FOCUS_RING}`}
              aria-label={nav.menuAria}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="animate-in slide-in-from-top-2 space-y-1 border-t border-slate-200 bg-white px-4 py-4 duration-200 lg:hidden landing-dark:border-white/10 landing-dark:bg-[#081628]">
            {nav.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 landing-dark:text-slate-200 landing-dark:hover:bg-white/10"
              >
                {link.label}
              </a>
            ))}

            <div className="flex flex-col gap-2 border-t border-slate-200 pt-3 sm:hidden landing-dark:border-white/10">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate(ROUTES.REPORTS);
                  }}
                  className="flex h-11 w-full items-center justify-center rounded-lg bg-[#0074F0] text-sm font-medium text-white hover:bg-[#0063CC]"
                >
                  {nav.goToCrm}
                </button>
              ) : (
                <>
                  <Link
                    to={ROUTES.LOGIN}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex h-11 w-full items-center justify-center rounded-lg text-sm font-medium text-slate-800 hover:bg-slate-100 landing-dark:text-slate-100 landing-dark:hover:bg-white/10"
                  >
                    {nav.loginMobile}
                  </Link>
                  <Link
                    to={ROUTES.LOGIN}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex h-11 w-full items-center justify-center rounded-lg bg-[#0074F0] text-sm font-medium text-white hover:bg-[#0063CC]"
                  >
                    {nav.tryMobile}
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
};
