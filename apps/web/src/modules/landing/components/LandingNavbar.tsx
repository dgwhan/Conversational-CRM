import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, ArrowRight, Sun, Moon, Sparkles, LayoutDashboard, Globe } from 'lucide-react';
import { useScrollProgress } from '../hooks/useLandingInteractions.js';
import { useLandingContent } from '../hooks/useLandingContent.js';
import { useUserRole } from '../../auth/UserRoleContext.js';
import { useTranslation, type Locale } from '../../../i18n/index.js';
import { ROUTES } from '../../../config/routes.js';

export interface LandingNavbarProps {
  isDark?: boolean;
  onToggleTheme?: () => void;
}

const LOCALES: Locale[] = ['vi', 'en'];

/** Nút chuyển ngôn ngữ VI/EN theo phong cách landing (hỗ trợ sáng/tối). */
const LandingLanguageToggle: React.FC<{ ariaLabel: string }> = ({ ariaLabel }) => {
  const { locale, setLocale } = useTranslation();

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-0.5 h-9 px-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70"
    >
      <Globe size={13} className="text-slate-400 mx-0.5 shrink-0" aria-hidden="true" />
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          aria-pressed={locale === code}
          className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold uppercase transition-colors cursor-pointer ${
            locale === code
              ? 'bg-blue-600 text-white'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
      {/* 1. Thanh tiến trình cuộn trang trên cùng (Scroll Progress Indicator) */}
      <div className="fixed top-0 left-0 w-full h-[3px] z-[100] bg-transparent">
        <div
          className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-400 transition-[width] duration-75 ease-out shadow-[0_0_8px_rgba(37,99,235,0.6)]"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* 2. Thanh điều hướng Kính mờ (Sticky Frosted Glass Navbar) */}
      <header
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-200 border-b ${
          isDark
            ? 'bg-slate-900/80 border-slate-800/80 text-white'
            : 'bg-white/80 border-white/60 text-slate-800 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.03)]'
        } backdrop-blur-md`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo PolarisX với chữ X xanh dương nổi bật */}
          <Link
            to="/"
            className="flex items-center gap-2 sm:gap-2.5 group cursor-pointer min-w-0"
            aria-label={nav.homeAria}
          >
            <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 p-[1.5px] shadow-sm group-hover:shadow-blue-500/25 transition-all">
              <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[10px] flex items-center justify-center overflow-hidden p-1">
                <img
                  src="/logo.svg"
                  alt="PolarisX Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center font-black text-xl tracking-tight leading-none text-slate-900 dark:text-white">
                Polaris<span className="text-blue-600 text-2xl ml-0.5 inline-block font-black drop-shadow-[0_0_12px_rgba(37,99,235,0.4)]">X</span>
              </div>
              <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400 truncate">
                {nav.brandSubtitle}
              </span>
            </div>
          </Link>

          {/* Desktop Menu Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-sm font-medium">
            {nav.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-2.5 xl:px-3 py-1.5 rounded-lg whitespace-nowrap text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop Right: Language + CTA Buttons */}
          <div className="hidden sm:flex items-center gap-2.5">
            <LandingLanguageToggle ariaLabel={nav.languageAria} />
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => navigate(ROUTES.REPORTS)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/35 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer whitespace-nowrap"
              >
                <LayoutDashboard size={15} />
                <span>{nav.goToCrm}</span>
              </button>
            ) : (
              <>
                <Link
                  to={ROUTES.LOGIN}
                  className="lg:hidden xl:inline-block px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-colors"
                >
                  {nav.login}
                </Link>
                <Link
                  to={ROUTES.LOGIN}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all"
                >
                  <Sparkles size={14} />
                  <span>{nav.tryFree}</span>
                </Link>
              </>
            )}
          </div>

          {/* Mobile: Language + Theme + Hamburger */}
          <div className="flex lg:hidden items-center gap-1.5 sm:gap-2">
            <div className="sm:hidden">
              <LandingLanguageToggle ariaLabel={nav.languageAria} />
            </div>
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 flex items-center justify-center text-slate-600 dark:text-slate-300"
                aria-label={nav.themeAria}
              >
                {isDark ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label={nav.menuAria}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* 3. Mobile Dropdown Menu Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl px-4 py-4 space-y-2 animate-in slide-in-from-top-2 duration-200 shadow-xl">
            {nav.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-600"
              >
                {link.label}
              </a>
            ))}

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2 sm:hidden">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate(ROUTES.REPORTS);
                  }}
                  className="w-full text-center py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md flex items-center justify-center gap-2"
                >
                  <LayoutDashboard size={15} />
                  <span>{nav.goToCrm}</span>
                </button>
              ) : (
                <>
                  <Link
                    to={ROUTES.LOGIN}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    {nav.loginMobile}
                  </Link>
                  <Link
                    to={ROUTES.LOGIN}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md flex items-center justify-center gap-2"
                  >
                    <span>{nav.tryMobile}</span>
                    <ArrowRight size={15} />
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
