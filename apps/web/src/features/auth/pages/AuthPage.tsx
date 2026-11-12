import { useState } from 'react';
import { AuthLayout } from '../../../layouts/AuthLayout.js';
import { LoginForm } from '../components/LoginForm.js';
import { SignUpForm } from '../components/SignUpForm.js';
import { AUTH_TAB, type AuthTab } from '../constants/auth.constants.js';
import type { LoginResponse } from '../types/auth.types.js';
import { PasswordRecoveryFlow } from '../components/PasswordRecoveryFlow.js';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation, LanguageSwitcher } from '../../../i18n/index.js';
import { ROUTES } from '../../../config/routes.js';

export type AuthPageProps = {
  onLoginSuccess?: (session: LoginResponse) => void;
  defaultTab?: AuthTab;
};

export { AUTH_TAB, type AuthTab };

export function AuthPage({
  onLoginSuccess,
  defaultTab = AUTH_TAB.LOGIN,
}: AuthPageProps = {}) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<AuthTab>(defaultTab);
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const handleTabChange = (tab: AuthTab) => {
    if (tab !== activeTab) {
      setHasInteracted(true);
      setActiveTab(tab);
    }
  };

  const isLoginActive = activeTab === AUTH_TAB.LOGIN;
  const isSignUpActive = activeTab === AUTH_TAB.SIGN_UP;

  return (
    <AuthLayout
      topBar={
        <>
          <Link
            to={ROUTES.HOME}
            className="inline-flex h-8 min-w-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white/85 px-3 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-md transition-colors hover:text-[#1A5CFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A5CFF] sm:text-sm"
          >
            <ArrowLeft size={15} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{t('auth.backToHome', 'Quay lại trang chủ')}</span>
          </Link>
          <LanguageSwitcher />
        </>
      }
    >
      {/* Logo in a frosted glass rounded container with subtle brand glow */}
      <div className="flex flex-col items-center justify-center mb-6">
        <div className="relative p-2.5 rounded-2xl bg-white/85 border border-white shadow-[0_4px_16px_rgba(26,92,255,0.12),0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-md flex items-center justify-center">
          <img
            src="/logo.svg"
            alt="Conversational CRM Logo"
            className="h-12 w-12 object-contain rounded-xl"
            width={48}
            height={48}
          />
        </div>
        <h1 className="mt-3.5 text-xl sm:text-2xl font-bold text-slate-900 tracking-tight text-center">
          Conversational CRM
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
              className="absolute -bottom-px left-0 h-[2.5px] w-1/2 rounded-full bg-[#1A5CFF] shadow-[0_2px_8px_rgba(26,92,255,0.45)] transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none"
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
                onSuccess={(res) => onLoginSuccess?.(res)}
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
                onSuccess={(res: any) =>
                  onLoginSuccess?.({
                    ...res,
                    staff: {
                      id: res.staff?.id || res.id || 'staff-new',
                      email: res.staff?.email || res.email || '',
                      fullName: res.staff?.fullName || res.fullName || '',
                      phoneNumber: res.staff?.phoneNumber || res.phoneNumber || null,
                      ...res.staff,
                      mustChangePassword: false,
                    },
                  })
                }
                onSwitchToLogin={() => handleTabChange(AUTH_TAB.LOGIN)}
              />
            </div>
          )}
        </>
      )}
    </AuthLayout>
  );
}
