import React from 'react';
import { Link } from 'react-router-dom';
import { PlayCircle, Lock } from 'lucide-react';
import { useUserRole } from '../../auth/UserRoleContext.js';
import { ROUTES } from '../../../config/routes.js';
import { Reveal } from './Reveal.js';
import { useTranslation } from '../../../i18n/index.js';

import desktopUI from '../../../assets/images/reponsive/DesktopUI.png';
import mobileUI from '../../../assets/images/reponsive/MobileUI.png';

const CONTENT = {
  vi: {
    headline: 'Quản lý mọi hội thoại khách hàng',
    supporting: 'Gom tin nhắn, quản lý khách hàng và theo dõi tư vấn trên một nền tảng duy nhất.',
    ctaPrimary: 'Truy cập hệ thống',
    ctaSecondary: 'Xem demo trực tiếp',
    desktopAlt: 'Giao diện Inbox PolarisX trên máy tính: danh sách hội thoại, nội dung trao đổi và thông tin khách hàng',
    mobileAlt: 'Giao diện PolarisX trên điện thoại',
  },
  en: {
    headline: 'Manage Every Customer Conversation',
    supporting: 'Bring messages, customer profiles, and sales follow-ups together in one workspace.',
    ctaPrimary: 'Open your workspace',
    ctaSecondary: 'Explore the live demo',
    desktopAlt: 'PolarisX desktop inbox showing conversations, messages, and customer details',
    mobileAlt: 'PolarisX mobile interface',
  },
} as const;

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0074F0] focus-visible:ring-offset-2 landing-dark:focus-visible:ring-offset-[#081628]';

export const HeroSection: React.FC<{ isDark?: boolean }> = ({ isDark: _isDark = false }) => {
  const { isAuthenticated } = useUserRole();
  const { locale } = useTranslation();
  const content = CONTENT[locale] ?? CONTENT.vi;

  return (
    <section
      aria-labelledby="hero-heading"
      className="bg-white pb-16 pt-28 font-['Roboto',ui-sans-serif,system-ui,sans-serif] sm:pb-24 sm:pt-36 landing-dark:bg-[#081628]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <Reveal>
            <h1
              id="hero-heading"
              className="text-4xl leading-[1.05] tracking-[-0.04em] text-[#0B1F3A] text-balance sm:text-6xl sm:leading-[1.02] lg:text-[4.75rem] landing-dark:text-white"
              style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif", fontWeight: 800 }}
            >
              {content.headline}
            </h1>
          </Reveal>

          <Reveal delay={100}>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-slate-600 sm:text-xl landing-dark:text-slate-300">
              {content.supporting}
            </p>
          </Reveal>

          <Reveal delay={200}>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to={isAuthenticated ? ROUTES.REPORTS : ROUTES.LOGIN}
                className={`inline-flex h-11 w-full items-center justify-center rounded-lg bg-[#0074F0] px-6 text-sm font-medium text-white transition-colors hover:bg-[#0063CC] sm:w-auto ${FOCUS}`}
              >
                {content.ctaPrimary}
              </Link>
              <a
                href="#live-demo"
                className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-6 text-sm font-medium text-[#0B1F3A] transition-colors hover:border-[#0B1F3A] sm:w-auto landing-dark:border-white/20 landing-dark:text-white landing-dark:hover:border-white ${FOCUS}`}
              >
                <PlayCircle size={18} className="text-[#0074F0] landing-dark:text-[#4DA3FF]" aria-hidden="true" />
                {content.ctaSecondary}
              </a>
            </div>
          </Reveal>
        </div>

        {/* Showcase: desktop ở giữa, mobile gối lên mép trái */}
        <Reveal variant="slide-right" delay={300} className="relative mx-auto mt-14 w-full max-w-6xl pb-12 sm:mt-16 sm:pb-16">
          <div className="ml-auto w-[90%] sm:mx-auto sm:w-[80%]">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white landing-dark:border-white/15 landing-dark:bg-[#0B1F3A]">
              <div className="relative flex h-8 items-center border-b border-slate-200 bg-slate-100 px-3.5 sm:h-10 landing-dark:border-white/10 landing-dark:bg-[#0B1F3A]">
                <div className="flex items-center gap-1.5 sm:gap-2" aria-hidden="true">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300 sm:h-3 sm:w-3 landing-dark:bg-white/25" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300 sm:h-3 sm:w-3 landing-dark:bg-white/25" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300 sm:h-3 sm:w-3 landing-dark:bg-white/25" />
                </div>
                <div
                  className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1.5 rounded-md bg-white px-4 py-1 text-[11px] text-slate-500 sm:flex landing-dark:bg-white/10 landing-dark:text-slate-300"
                  aria-hidden="true"
                >
                  <Lock size={10} />
                  polarisx-crm.vn/inbox
                </div>
              </div>
              <img
                src={desktopUI}
                alt={content.desktopAlt}
                className="block h-auto w-full"
                width={1600}
                height={1000}
                fetchPriority="high"
                decoding="async"
              />
            </div>
          </div>

          <div className="absolute bottom-0 left-0 w-[32%] max-w-[210px] sm:left-[1%] sm:w-[22%] lg:left-auto lg:right-0">
            <div className="rounded-[2rem] bg-[#0B1F3A] p-[5px] sm:rounded-[2.4rem] sm:p-[6px]">
              <div className="relative overflow-hidden rounded-[1.6rem] bg-white sm:rounded-[2rem]">
                <img
                  src={mobileUI}
                  alt={content.mobileAlt}
                  className="block h-auto w-full"
                  width={540}
                  height={1170}
                  loading="eager"
                  decoding="async"
                />
                <span
                  aria-hidden="true"
                  className="absolute left-1/2 top-[1.8%] h-[2.6%] w-[28%] -translate-x-1/2 rounded-full bg-black"
                />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};
