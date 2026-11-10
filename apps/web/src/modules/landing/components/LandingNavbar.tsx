import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, ArrowRight, Sun, Moon, Sparkles, LayoutDashboard } from 'lucide-react';
import { LANDING_NAV_LINKS } from '../constants/landing.constants.js';
import { useScrollProgress } from '../hooks/useLandingInteractions.js';
import { useUserRole } from '../../auth/UserRoleContext.js';
import { ROUTES } from '../../../config/routes.js';

export interface LandingNavbarProps {
  isDark?: boolean;
  onToggleTheme?: () => void;
}

export const LandingNavbar: React.FC<LandingNavbarProps> = ({
  isDark = false,
  onToggleTheme,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const scrollProgress = useScrollProgress();
  const { isAuthenticated } = useUserRole();
  const navigate = useNavigate();

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo PolarisX với chữ X xanh dương nổi bật */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group cursor-pointer"
            aria-label="Trang chủ PolarisX Conversational CRM"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 p-[1.5px] shadow-sm group-hover:shadow-blue-500/25 transition-all">
              <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[10px] flex items-center justify-center overflow-hidden p-1">
                <img
                  src="/logo.svg"
                  alt="PolarisX Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center font-black text-xl tracking-tight leading-none text-slate-900 dark:text-white">
                Polaris<span className="text-blue-600 text-2xl ml-0.5 inline-block font-black drop-shadow-[0_0_12px_rgba(37,99,235,0.4)]">X</span>
              </div>
              <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                Conversational CRM
              </span>
            </div>
          </Link>

          {/* Desktop Menu Links */}
          <nav className="hidden md:flex items-center gap-1.5 lg:gap-2 text-sm font-medium">
            {LANDING_NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop Right CTA Buttons */}
          <div className="hidden sm:flex items-center gap-2.5">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => navigate(ROUTES.REPORTS)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/35 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
              >
                <LayoutDashboard size={15} />
                <span>Vào trang CRM</span>
              </button>
            ) : (
              <>
                <Link
                  to={ROUTES.LOGIN}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-colors"
                >
                  Đăng nhập
                </Link>
                <Link
                  to={ROUTES.LOGIN}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all"
                >
                  <Sparkles size={14} />
                  <span>Dùng thử miễn phí</span>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Hamburger Button */}
          <div className="flex md:hidden items-center gap-2">
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 flex items-center justify-center text-slate-600 dark:text-slate-300"
                aria-label="Toggle Theme"
              >
                {isDark ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Menu"
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* 3. Mobile Dropdown Menu Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl px-4 py-4 space-y-2 animate-in slide-in-from-top-2 duration-200 shadow-xl">
            {LANDING_NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-600"
              >
                {link.label}
              </a>
            ))}

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
              <Link
                to={ROUTES.LOGIN}
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                Đăng nhập hệ thống
              </Link>
              <Link
                to={ROUTES.LOGIN}
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md flex items-center justify-center gap-2"
              >
                <span>Dùng thử PolarisX ngay</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
};
