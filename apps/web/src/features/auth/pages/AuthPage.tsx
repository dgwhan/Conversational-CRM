import { useState } from 'react';
import { AuthLayout } from '../../../layouts/AuthLayout.js';
import { LoginForm } from '../components/LoginForm.js';
import { SignUpForm } from '../components/SignUpForm.js';
import { AUTH_TAB, type AuthTab } from '../constants/auth.constants.js';
import type { LoginResponse } from '../types/auth.types.js';
import { PasswordRecoveryFlow } from '../components/PasswordRecoveryFlow.js';
import { Link } from 'react-router-dom';
import { ArrowLeft, Moon, Sun } from 'lucide-react';
import { useTranslation, LanguageSwitcher } from '../../../i18n/index.js';
import { ROUTES } from '../../../config/routes.js';
import polarisxLogo from '../../../assets/logo/polarisx-logo.svg';

export type AuthPageProps = {
  onLoginSuccess?: (session: LoginResponse, rememberMe?: boolean) => void;
  defaultTab?: AuthTab;
};

export { AUTH_TAB, type AuthTab };

export function AuthPage({
  onLoginSuccess,
  defaultTab = AUTH_TAB.LOGIN,
}: AuthPageProps = {}) {
  const { t } = useTranslation();
  const [isDark, setIsDark] = useState(() => {
    try {
      const savedTheme = localStorage.getItem('polarisx_auth_theme');
      if (savedTheme) return savedTheme === 'dark';
      const landingTheme = localStorage.getItem('polarisx_landing_theme');
      if (landingTheme) return landingTheme === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });
  const [activeTab, setActiveTab] = useState<AuthTab>(defaultTab);
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const handleTabChange = (tab: AuthTab) => {
    if (tab !== activeTab) {
      setHasInteracted(true);
      setActiveTab(tab);
    }
  };

  const handleThemeToggle = () => {
    setIsDark((current) => {
      const next = !current;
      try {
        localStorage.setItem('polarisx_auth_theme', next ? 'dark' : 'light');
      } catch {
        // Keep the control usable when storage is unavailable.
      }
      return next;
    });
  };

  const isLoginActive = activeTab === AUTH_TAB.LOGIN;
  const isSignUpActive = activeTab === AUTH_TAB.SIGN_UP;

  return (
    <div className="contents" data-theme={isDark ? 'dark' : 'light'}>
    <AuthLayout
      topBar={
        <>
          <Link
            to={ROUTES.HOME}
            className="inline-flex h-9 min-w-0 items-center gap-2 px-2 text-sm font-medium text-slate-600 transition-colors hover:text-[#2563eb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] sm:px-0"
          >
            <ArrowLeft size={15} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{t('auth.backToHome', 'Quay lại trang chủ')}</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={handleThemeToggle}
              className="auth-theme-toggle inline-flex size-9 items-center justify-center text-slate-600 transition-colors hover:text-[#2563eb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]"
              aria-label={isDark ? t('auth.switchToLight', 'Chuyển sang giao diện sáng') : t('auth.switchToDark', 'Chuyển sang giao diện tối')}
              title={isDark ? t('auth.switchToLight', 'Chuyển sang giao diện sáng') : t('auth.switchToDark', 'Chuyển sang giao diện tối')}
            >
              {isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
            </button>
          </div>
        </>
      }
    >
      {/* Keep the original brand asset intact; use a quiet lockup matching the app shell. */}
      <div className="auth-brand flex flex-col items-center justify-center mb-6">
        <div className="auth-brand-mark relative flex items-center justify-center">
          <img
            src={polarisxLogo}
            alt="PolarisX"
            className="h-12 w-12 object-contain"
            width={48}
            height={48}
          />
        </div>
        <h1 className="mt-3.5 text-xl sm:text-2xl font-bold text-slate-900 tracking-tight text-center">
          PolarisX
        </h1>
      </div>

      {isRecoveryOpen ? (
        <PasswordRecoveryFlow
          onBackToLogin={() => {
            setIsRecoveryOpen(false);
            handleTabChange(AUTH_TAB.LOGIN);
          }}
        />
      ) : (
        <>
          {/* Tab switcher with clear contrast & glowing blue sliding underline */}
          <div
            className="relative mb-6 flex border-b border-slate-200"
            role="tablist"
            aria-label="Authentication tabs"
          >
            <button
              id="auth-tab-login"
              type="button"
              role="tab"
              aria-selected={isLoginActive}
              aria-controls="auth-panel-login"
              tabIndex={isLoginActive ? 0 : -1}
              onClick={() => handleTabChange(AUTH_TAB.LOGIN)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  handleTabChange(AUTH_TAB.SIGN_UP);
                  document.getElementById('auth-tab-signup')?.focus();
                }
              }}
              className={`relative z-10 flex-1 pb-3 text-center font-sans text-sm font-medium transition-colors duration-200 cursor-pointer rounded-t-md outline-none focus-visible:ring-2 focus-visible:ring-[#1A5CFF] ${
                isLoginActive ? 'text-[#1A5CFF] font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t('auth.loginTab', 'Đăng nhập')}
            </button>

            <button
              id="auth-tab-signup"
              type="button"
              role="tab"
              aria-selected={isSignUpActive}
              aria-controls="auth-panel-signup"
              tabIndex={isSignUpActive ? 0 : -1}
              onClick={() => handleTabChange(AUTH_TAB.SIGN_UP)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft') {
                  e.preventDefault();
                  handleTabChange(AUTH_TAB.LOGIN);
                  document.getElementById('auth-tab-login')?.focus();
                }
              }}
              className={`relative z-10 flex-1 pb-3 text-center font-sans text-sm font-medium transition-colors duration-200 cursor-pointer rounded-t-md outline-none focus-visible:ring-2 focus-visible:ring-[#1A5CFF] ${
                isSignUpActive ? 'text-[#1A5CFF] font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t('auth.signUpTab', 'Đăng ký')}
            </button>

            {/* Glowing Blue Sliding Tab Indicator */}
            <span
              className="absolute -bottom-px left-0 h-[2.5px] w-1/2 rounded-full bg-[#2563eb] transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none"
              style={{
                transform: isLoginActive ? 'translateX(0%)' : 'translateX(100%)',
              }}
              aria-hidden="true"
            />
          </div>

          {/* LoginForm & SignUpForm Panels */}
          {isLoginActive ? (
            <div
              key="auth-panel-login"
              id="auth-panel-login"
              role="tabpanel"
              aria-labelledby="auth-tab-login"
              className={hasInteracted ? 'animate-auth-slide-left' : ''}
            >
              <LoginForm
                onSuccess={(res, rememberMe) => onLoginSuccess?.(res, rememberMe)}
                onForgotPassword={() => setIsRecoveryOpen(true)}
                onSwitchToSignUp={() => handleTabChange(AUTH_TAB.SIGN_UP)}
              />
            </div>
          ) : (
            <div
              key="auth-panel-signup"
              id="auth-panel-signup"
              role="tabpanel"
              aria-labelledby="auth-tab-signup"
              className={hasInteracted ? 'animate-auth-slide-right' : ''}
            >
              <SignUpForm
                onSuccess={(res: any) => onLoginSuccess?.(res, false)}
                onSwitchToLogin={() => handleTabChange(AUTH_TAB.LOGIN)}
              />
            </div>
          )}
        </>
      )}
    </AuthLayout>
    </div>
  );
}
