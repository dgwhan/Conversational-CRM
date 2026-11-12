import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  MessageSquare,
  Layers,
} from 'lucide-react';
import { MascotCusi } from './characters/MascotCusi.js';
import { useMouseTarget } from '../hooks/useLandingInteractions.js';
import { useLandingContent } from '../hooks/useLandingContent.js';
import { useUserRole } from '../../auth/UserRoleContext.js';
import { ROUTES } from '../../../config/routes.js';

const LIST_SOURCE_COLORS = ['text-blue-600', 'text-sky-600', 'text-amber-600'];

export const HeroSection: React.FC<{ isDark?: boolean }> = ({ isDark: _isDark = false }) => {
  const mouseTarget = useMouseTarget();
  const { isAuthenticated } = useUserRole();
  const navigate = useNavigate();
  const { hero } = useLandingContent();
  const { mock } = hero;

  return (
    <section className="relative pt-24 pb-14 sm:pt-36 sm:pb-24 overflow-hidden px-3 sm:px-6 lg:px-8">
      {/* 1. Nền Ambient Aurora Glow mờ ảo */}
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[650px] lg:w-[900px] h-[300px] sm:h-[450px] bg-gradient-to-tr from-blue-500/20 via-indigo-500/18 to-cyan-400/15 rounded-full blur-[80px] sm:blur-[110px]" />
        <div className="absolute top-1/3 left-4 sm:left-10 w-48 sm:w-72 h-48 sm:h-72 bg-sky-400/15 rounded-full blur-[60px] sm:blur-[80px]" />
        <div className="absolute bottom-10 right-4 sm:right-10 w-48 sm:w-80 h-48 sm:h-80 bg-purple-500/15 rounded-full blur-[70px] sm:blur-[90px]" />
      </div>

      {/* Floating Channel Badges (Zalo, Facebook, Telegram) trôi lơ lửng */}
      <div className="absolute top-28 left-4 sm:left-16 hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-white/60 dark:border-slate-700 shadow-md animate-[float_4s_ease-in-out_infinite] pointer-events-none z-10">
        <div className="w-5 h-5 rounded-full bg-[#0068FF] flex items-center justify-center text-white text-[9px] font-black">
          Z
        </div>
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{hero.floatingBadges[0]}</span>
      </div>

      <div className="absolute top-36 right-4 sm:right-20 hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-white/60 dark:border-slate-700 shadow-md animate-[float_4.5s_ease-in-out_infinite_1s] pointer-events-none z-10">
        <div className="w-5 h-5 rounded-full bg-[#1877F2] flex items-center justify-center text-white text-[10px] font-black">
          f
        </div>
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{hero.floatingBadges[1]}</span>
      </div>

      <div className="absolute bottom-20 left-12 hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-white/60 dark:border-slate-700 shadow-md animate-[float_5s_ease-in-out_infinite_2s] pointer-events-none z-10">
        <div className="w-5 h-5 rounded-full bg-[#229ED9] flex items-center justify-center text-white text-[10px] font-black">
          ✈
        </div>
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{hero.floatingBadges[2]}</span>
      </div>

      {/* 2. Khung Nội dung Trung tâm */}
      <div className="max-w-7xl mx-auto text-center relative z-10">
        {/* Pill giới thiệu */}
        <div className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-full bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-5 sm:mb-6 shadow-xs backdrop-blur-sm animate-fade-in max-w-[95%]">
          <Sparkles size={14} className="text-blue-600 animate-spin-slow shrink-0" />
          <span className="truncate">{hero.pill}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping shrink-0" />
        </div>

        {/* Headline lớn với chữ X xanh dương rực rỡ */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-[1.2] sm:leading-[1.15]">
          {hero.titleLead}{' '}
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent">
            Polaris
          </span>
          <span className="text-blue-600 dark:text-blue-400 font-black drop-shadow-[0_0_20px_rgba(37,99,235,0.45)]">
            X
          </span>
        </h1>

        {/* Subheading mô tả giá trị cốt lõi */}
        <p className="mt-4 sm:mt-5 text-sm sm:text-lg lg:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed px-2">
          {hero.subtitle}
        </p>

        {/* 2 Nút CTA chính */}
        <div className="mt-7 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto px-4 sm:px-0">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => navigate(ROUTES.REPORTS)}
              className="w-full sm:w-auto px-6 sm:px-7 py-3 sm:py-3.5 rounded-2xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{hero.ctaDashboard}</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <Link
              to={ROUTES.LOGIN}
              className="w-full sm:w-auto px-6 sm:px-7 py-3 sm:py-3.5 rounded-2xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2"
            >
              <span>{hero.ctaTry}</span>
              <ArrowRight size={16} />
            </Link>
          )}

          <a
            href="#live-demo"
            className="w-full sm:w-auto px-5 sm:px-6 py-3 sm:py-3.5 rounded-2xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            <MessageSquare size={16} className="text-blue-600 dark:text-blue-400" />
            <span>{hero.ctaDemo}</span>
          </a>
        </div>

        {/* Cam kết tin cậy */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-5 text-xs text-slate-500 dark:text-slate-400 px-2">
          <div className="flex items-center gap-1.5">
            <Layers size={13} className="text-emerald-500 shrink-0" />
            <span>{hero.trust[0]}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-blue-500 shrink-0" />
            <span>{hero.trust[1]}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-indigo-500 shrink-0" />
            <span>{hero.trust[2]}</span>
          </div>
        </div>

        {/* 3. Floating Dashboard Mockup + Mascot Robot Cusi tương tác */}
        <div className="mt-12 sm:mt-16 relative max-w-5xl mx-auto">
          {/* Mascot Robot Cusi vẫy tay và theo dõi con trỏ chuột */}
          <div className="absolute -top-12 sm:-top-20 -right-1 sm:-right-6 z-30 pointer-events-auto scale-75 sm:scale-100 origin-bottom-right">
            <MascotCusi
              mood="waving"
              size={120}
              eyeTarget={mouseTarget}
              showSpeechBubble={true}
              speechText={hero.mascot}
            />
          </div>

          {/* Hộp kính mockup của Dashboard */}
          <div
            className="relative rounded-2xl sm:rounded-3xl border border-white/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/80 p-2 sm:p-3.5 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.12),0_0_0_1px_rgba(255,255,255,0.8)] backdrop-blur-xl transform transition-transform duration-300"
            style={{
              transform: `perspective(1000px) rotateX(${mouseTarget.y * -2.5}deg) rotateY(${mouseTarget.x * 2.5}deg)`,
            }}
          >
            {/* Header thanh cửa sổ giả lập browser/app */}
            <div className="flex items-center justify-between pb-2 mb-2 px-2 sm:px-3 border-b border-slate-200/70 dark:border-slate-800">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-400/90 inline-block" />
                <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-400/90 inline-block" />
                <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-400/90 inline-block" />
                <span className="ml-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
                  https://polarisx-crm.vn/inbox
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{mock.online}</span>
              </div>
            </div>

            {/* Nội dung giao diện CRM 3 cột giả lập */}
            <div className="grid grid-cols-12 gap-2 sm:gap-3 rounded-xl overflow-hidden bg-slate-50/70 dark:bg-slate-950/70 p-1.5 sm:p-3 text-left">
              {/* Cột 1: Danh sách hội thoại giả lập (Ẩn trên mobile siêu nhỏ để ưu tiên chat) */}
              <div className="hidden sm:block sm:col-span-4 lg:col-span-3 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800 p-2 sm:p-2.5 space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{mock.conversations}</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">{mock.newCount}</span>
                </div>
                {mock.list.map((item, idx) => (
                  <div
                    key={item.name}
                    className={
                      idx === 0
                        ? 'p-1.5 rounded-md bg-blue-50 dark:bg-blue-950/40 border-l-2 border-blue-600'
                        : 'p-1.5 rounded-md bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
                    }
                  >
                    <div
                      className={`flex items-center justify-between gap-1 text-[11px] font-bold ${
                        idx === 0 ? 'text-slate-800 dark:text-white' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="truncate">{item.name}</span>
                      <span className={`text-[9px] font-bold shrink-0 ${LIST_SOURCE_COLORS[idx]}`}>{item.source}</span>
                    </div>
                    <div className={`text-[10px] truncate ${idx === 0 ? 'text-slate-500' : 'text-slate-400'}`}>
                      {item.snippet}
                    </div>
                  </div>
                ))}
              </div>

              {/* Cột 2: Khung Chat giả lập */}
              <div className="col-span-12 sm:col-span-8 lg:col-span-6 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800 p-2 sm:p-3 flex flex-col justify-between min-h-[170px] sm:min-h-[220px]">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[11px] sm:text-xs shrink-0">
                      Q
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{mock.chatName}</div>
                      <div className="text-[9px] sm:text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {mock.typing}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">
                      {mock.score}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 sm:space-y-2 py-2 text-[10.5px] sm:text-[11px]">
                  <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl rounded-tl-none max-w-[90%] text-slate-800 dark:text-slate-200">
                    {mock.customerMsg}
                  </div>
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-2 rounded-xl rounded-tr-none max-w-[90%] ml-auto shadow-xs">
                    {mock.botMsgBefore}
                    <b>{mock.botTag}</b>
                    {mock.botMsgAfter}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400">
                  <span className="truncate">{mock.inputHint}</span>
                  <span className="text-[9px] text-blue-600 font-semibold shrink-0 ml-1">SLA: 03:42</span>
                </div>
              </div>

              {/* Cột 3: Chi tiết khách hàng & chấm điểm (chỉ hiện trên LG) */}
              <div className="hidden lg:block lg:col-span-3 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800 p-2.5 space-y-2">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  {mock.leadPanelTitle}
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between gap-2 text-slate-500">
                    <span>{mock.sourceLabel}</span>
                    <span className="font-semibold text-blue-600">{mock.sourceValue}</span>
                  </div>
                  <div className="flex justify-between gap-2 text-slate-500">
                    <span>{mock.phoneLabel}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">0948 ••• •••</span>
                  </div>
                  <div className="flex justify-between gap-2 text-slate-500">
                    <span>{mock.zaloLabel}</span>
                    <span className="font-semibold text-emerald-600">{mock.zaloValue}</span>
                  </div>
                </div>
                <div className="pt-1.5">
                  <div className="text-[10px] text-slate-400 mb-1">{mock.autoTagsLabel}</div>
                  <div className="flex flex-wrap gap-1">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold">{mock.tags[0]}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-semibold">{mock.tags[1]}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
