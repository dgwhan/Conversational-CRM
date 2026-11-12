import React from 'react';
import {
  Inbox,
  Sparkles,
  GitPullRequest,
  Users2,
  FileCheck2,
  BellRing,
  BarChart3,
  ShieldAlert,
} from 'lucide-react';
import { useLandingContent } from '../hooks/useLandingContent.js';

export const BentoFeatures: React.FC = () => {
  const { features: f } = useLandingContent();

  return (
    <section id="features" className="py-16 sm:py-24 px-3 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Header Mục Tính Năng */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-4 shadow-xs">
            <Sparkles size={13} className="text-blue-600" />
            {f.pill}
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            {f.titleLead}{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent">
              Polaris
            </span>
            <span className="text-blue-600 dark:text-blue-400 font-black">X</span>
          </h2>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed px-2">
            {f.subtitle}
          </p>
        </div>

        {/* Bento Grid 8 Thẻ Kính (Glass Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Card 1: Unified Inbox (Lớn, col-span-2 trên LG) */}
          <div className="lg:col-span-2 group rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-white/80 dark:border-slate-700/80 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/20 transition-all" />
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
                  <Inbox size={22} />
                </div>
                <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs font-bold">
                  {f.inbox.badge}
                </span>
              </div>
              <h3 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">
                {f.inbox.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                {f.inbox.description}
              </p>
            </div>
            {/* Visual preview nhỏ */}
            <div className="mt-5 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg bg-blue-100/80 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 text-xs font-semibold">
                {f.inbox.chips[0]}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-sky-100/80 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 text-xs font-semibold">
                {f.inbox.chips[1]}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100/80 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs font-semibold">
                {f.inbox.chips[2]}
              </span>
            </div>
          </div>

          {/* Card 2: Phân loại & Chấm điểm thông minh */}
          <div className="group rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-white/80 dark:border-slate-700/80 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-500/20 transition-all" />
            <div>
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/25 mb-4 shrink-0">
                <Sparkles size={22} />
              </div>
              <h3 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                {f.scoring.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {f.scoring.description}
              </p>
            </div>
            <div className="mt-5 flex items-center gap-2">
              <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-full w-[85%] rounded-full animate-pulse" />
              </div>
              <span className="text-xs font-bold text-purple-600 shrink-0">{f.scoring.meter}</span>
            </div>
          </div>

          {/* Card 3: Quản lý Phễu Kanban & SLA */}
          <div className="group rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-white/80 dark:border-slate-700/80 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 mb-4 shrink-0">
              <GitPullRequest size={22} />
            </div>
            <div>
              <h3 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                {f.pipeline.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {f.pipeline.description}
              </p>
            </div>
            <div className="mt-4 sm:mt-5 inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 text-amber-700 text-xs font-bold">
              {f.pipeline.footer}
            </div>
          </div>

          {/* Card 4: Hợp nhất hồ sơ khách hàng */}
          <div className="group rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-white/80 dark:border-slate-700/80 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-500/25 mb-4 shrink-0">
              <Users2 size={22} />
            </div>
            <div>
              <h3 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                {f.identity.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {f.identity.description}
              </p>
            </div>
            <div className="mt-4 sm:mt-5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              {f.identity.footer}
            </div>
          </div>

          {/* Card 5: Quản lý hồ sơ & Lịch sử tư vấn */}
          <div className="group rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-white/80 dark:border-slate-700/80 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-500/25 mb-4 shrink-0">
              <FileCheck2 size={22} />
            </div>
            <div>
              <h3 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                {f.timeline.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {f.timeline.description}
              </p>
            </div>
            <div className="mt-4 sm:mt-5 text-[11px] font-semibold text-slate-500">
              {f.timeline.footer}
            </div>
          </div>

          {/* Card 6: Thông báo Telegram & Email */}
          <div className="group rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-white/80 dark:border-slate-700/80 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-500/25 mb-4 shrink-0">
              <BellRing size={22} />
            </div>
            <div>
              <h3 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                {f.alerts.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {f.alerts.description}
              </p>
            </div>
            <div className="mt-4 sm:mt-5 text-[11px] font-bold text-rose-600 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
              <span>{f.alerts.footer}</span>
            </div>
          </div>

          {/* Card 7: Báo cáo Thống kê & KPI */}
          <div className="group rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-white/80 dark:border-slate-700/80 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/25 mb-4 shrink-0">
              <BarChart3 size={22} />
            </div>
            <div>
              <h3 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                {f.reports.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {f.reports.description}
              </p>
            </div>
            <div className="mt-4 sm:mt-5 text-[11px] font-semibold text-amber-600">
              {f.reports.footer}
            </div>
          </div>

          {/* Card 8: Phân quyền RBAC & Phòng chống Broken Access Control */}
          <div className="group rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-white/80 dark:border-slate-700/80 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 mb-4 shrink-0">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h3 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                {f.security.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {f.security.description}
              </p>
            </div>
            <div className="mt-4 sm:mt-5 text-[11px] font-bold text-emerald-700 flex items-center gap-1">
              {f.security.footer}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
