import React from 'react';
import { Inbox, UserRound, UsersRound } from 'lucide-react';
import { Reveal } from './Reveal.js';

const CAPABILITIES = [
  { icon: Inbox, title: 'Omnichannel Inbox', desc: 'Tập trung hội thoại từ nhiều kênh giao tiếp.' },
  { icon: UserRound, title: 'Customer Management', desc: 'Quản lý thông tin và lịch sử tương tác khách hàng.' },
  { icon: UsersRound, title: 'Team Collaboration', desc: 'Phân công và theo dõi trách nhiệm của nhân sự.' },
] as const;

export const StatsStrip: React.FC<{ isDark?: boolean }> = () => (
  <section
    aria-label="Năng lực cốt lõi của PolarisX"
    className="border-y border-slate-200 bg-white font-['Roboto',ui-sans-serif,system-ui,sans-serif] landing-dark:border-white/10 landing-dark:bg-[#081628]"
  >
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <ul className="grid divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0 landing-dark:divide-white/10">
        {CAPABILITIES.map(({ icon: Icon, title, desc }, i) => (
          <li key={title} className="first:sm:pl-0 last:sm:pr-0 sm:px-8 lg:px-10">
            <Reveal delay={i * 100} className="py-8 sm:py-10">
              <Icon size={24} strokeWidth={1.6} className="text-[#0074F0] landing-dark:text-[#4DA3FF]" aria-hidden="true" />
              <h3 className="mt-4 text-base font-bold text-[#0B1F3A] landing-dark:text-white">{title}</h3>
              <p className="mt-1.5 max-w-xs text-sm leading-6 text-slate-600 text-pretty landing-dark:text-slate-400">{desc}</p>
            </Reveal>
          </li>
        ))}
      </ul>
    </div>
  </section>
);
