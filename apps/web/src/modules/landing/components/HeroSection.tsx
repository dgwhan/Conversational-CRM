import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  MessageSquare,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { MascotCusi } from './characters/MascotCusi.js';
import { useMouseTarget } from '../hooks/useLandingInteractions.js';
import { useUserRole } from '../../auth/UserRoleContext.js';
import { ROUTES } from '../../../config/routes.js';

export const HeroSection: React.FC<{ isDark?: boolean }> = ({ isDark = false }) => {
  const mouseTarget = useMouseTarget();
  const { isAuthenticated } = useUserRole();
  const navigate = useNavigate();

  return (
    <section className="relative pt-28 pb-16 sm:pt-36 sm:pb-24 overflow-hidden">
      {/* 1. Nền Ambient Aurora Glow mờ ảo */}
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] sm:w-[900px] h-[450px] bg-gradient-to-tr from-blue-500/20 via-indigo-500/18 to-cyan-400/15 rounded-full blur-[110px]" />
        <div className="absolute top-1/3 left-10 w-72 h-72 bg-sky-400/15 rounded-full blur-[80px]" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-purple-500/15 rounded-full blur-[90px]" />
      </div>

      {/* Floating Channel Badges (Zalo, Facebook, Telegram) trôi lơ lửng */}
      <div className="absolute top-28 left-6 sm:left-16 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-white/60 dark:border-slate-700 shadow-md animate-[float_4s_ease-in-out_infinite] pointer-events-none z-10">
        <div className="w-5 h-5 rounded-full bg-[#0068FF] flex items-center justify-center text-white text-[9px] font-black">
          Z
        </div>
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Zalo OA & Personal</span>
      </div>

      <div className="absolute top-36 right-8 sm:right-20 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-white/60 dark:border-slate-700 shadow-md animate-[float_4.5s_ease-in-out_infinite_1s] pointer-events-none z-10">
        <div className="w-5 h-5 rounded-full bg-[#1877F2] flex items-center justify-center text-white text-[10px] font-black">
          f
        </div>
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Facebook Lead Ads</span>
      </div>

      <div className="absolute bottom-20 left-12 hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-white/60 dark:border-slate-700 shadow-md animate-[float_5s_ease-in-out_infinite_2s] pointer-events-none z-10">
        <div className="w-5 h-5 rounded-full bg-[#229ED9] flex items-center justify-center text-white text-[10px] font-black">
          ✈
        </div>
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Telegram Instant Bot</span>
      </div>

      {/* 2. Khung Nội dung Trung tâm */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        {/* Pill giới thiệu phát hành */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-6 shadow-xs backdrop-blur-sm animate-fade-in">
          <Sparkles size={14} className="text-blue-600 animate-spin-slow" />
          <span>Thế hệ CRM Tuyển sinh & Hội thoại đột phá 2026</span>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
        </div>

        {/* Headline lớn với chữ X xanh dương rực rỡ */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-[1.15]">
          Quản Lý Hội Thoại & Tuyển Sinh Thông Minh Cùng{' '}
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent">
            Polaris
          </span>
          <span className="text-blue-600 dark:text-blue-400 font-black drop-shadow-[0_0_20px_rgba(37,99,235,0.45)]">
            X
          </span>
        </h1>

        {/* Subheading mô tả giá trị cốt lõi */}
        <p className="mt-5 text-base sm:text-lg lg:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Gom trọn tin nhắn từ <strong>Zalo</strong>, <strong>Facebook Fanpage</strong> và <strong>Excel</strong> vào
          một hộp thư duy nhất. Tự động gắn thẻ, phân loại tiềm năng và định tuyến tư vấn viên với cam kết SLA thần tốc.
        </p>

        {/* 2 Nút CTA chính */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => navigate(ROUTES.REPORTS)}
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <span>Vào Bảng Điều Khiển CRM</span>
              <ArrowRight size={17} />
            </button>
          ) : (
            <Link
              to={ROUTES.LOGIN}
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2.5"
            >
              <span>Trải nghiệm PolarisX miễn phí</span>
              <ArrowRight size={17} />
            </Link>
          )}
        </div>

        {/* Cam kết tin cậy */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <span>Không cần cài đặt phức tạp</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-blue-500" />
            <span>Bảo mật RBAC & chống Broken Access Control</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingUp size={14} className="text-indigo-500" />
            <span>Tối ưu mượt mà 60fps trên máy cấu hình thấp</span>
          </div>
        </div>

        {/* 3. Floating Dashboard Mockup + Mascot Robot Cusi tương tác */}
        <div className="mt-12 sm:mt-16 relative max-w-5xl mx-auto">
          {/* Mascot Robot Cusi vẫy tay và theo dõi con trỏ chuột */}
          <div className="absolute -top-14 sm:-top-20 -right-2 sm:-right-8 z-30 pointer-events-auto">
            <MascotCusi
              mood="waving"
              size={135}
              eyeTarget={mouseTarget}
              showSpeechBubble={true}
              speechText="PolarisX chào bạn! 👋"
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
            <div className="flex items-center justify-between pb-2.5 mb-2.5 px-3 border-b border-slate-200/70 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400/90 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-400/90 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-400/90 inline-block" />
                <span className="ml-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
                  https://polarisx-crm.cusc.vn/inbox
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Hệ thống trực tuyến (Realtime)</span>
              </div>
            </div>

            {/* Nội dung giao diện CRM 3 cột giả lập tinh xảo */}
            <div className="grid grid-cols-12 gap-2 sm:gap-3 rounded-xl overflow-hidden bg-slate-50/70 dark:bg-slate-950/70 p-2 sm:p-3 text-left">
              {/* Cột 1: Danh sách hội thoại giả lập */}
              <div className="col-span-4 sm:col-span-3 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800 p-2 sm:p-2.5 space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Hội thoại (24)</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">5 mới</span>
                </div>
                <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-950/40 border-l-2 border-blue-600">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 dark:text-white">
                    <span>Nguyễn Minh Quân</span>
                    <span className="text-[9px] text-blue-600 font-bold">Facebook</span>
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">Em muốn tư vấn khóa Web Fullstack...</div>
                </div>
                <div className="p-1.5 rounded-md bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    <span>Trần Bảo Ngọc</span>
                    <span className="text-[9px] text-sky-600 font-bold">Zalo OA</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">Học phí đợt tuyển sinh này...</div>
                </div>
                <div className="p-1.5 rounded-md bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    <span>Lê Hoàng Nam</span>
                    <span className="text-[9px] text-amber-600 font-bold">Excel</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">Hồ sơ xét tuyển học bổng 50%...</div>
                </div>
              </div>

              {/* Cột 2: Khung Chat giả lập */}
              <div className="col-span-8 sm:col-span-6 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800 p-2.5 sm:p-3 flex flex-col justify-between min-h-[180px] sm:min-h-[220px]">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                      Q
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100">Nguyễn Minh Quân</div>
                      <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Đang nhắn tin
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">
                      Điểm: 85/100
                    </span>
                  </div>
                </div>

                <div className="space-y-2 py-2 text-[11px]">
                  <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl rounded-tl-none max-w-[85%] text-slate-800 dark:text-slate-200">
                    Chào ban tư vấn, em quan tâm học bổng ngành Lập trình Web Fullstack ạ!
                  </div>
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-2 rounded-xl rounded-tr-none max-w-[85%] ml-auto shadow-xs">
                    Chào Quân! AI đã tự động gán nhãn <b>#Lập trình Web</b> và thông báo cho chuyên viên Lan Anh phản hồi em ngay nhé.
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Nhập tin nhắn phản hồi nhanh theo mẫu...</span>
                  <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs">
                    ↵
                  </div>
                </div>
              </div>

              {/* Cột 3: Thông tin phân loại Lead & Hồ sơ */}
              <div className="hidden sm:block sm:col-span-3 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800 p-2.5 space-y-2.5">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Phân Tích AI</div>
                <div className="space-y-1.5">
                  <div className="text-[10px] text-slate-500">Giai đoạn phễu:</div>
                  <div className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-md border border-amber-200/80">
                    Phỏng vấn / Hẹn gặp
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-500">Nhãn quan tâm:</div>
                  <div className="flex flex-wrap gap-1">
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold">
                      #Fullstack
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-bold">
                      #Học bổng 30%
                    </span>
                  </div>
                </div>
                <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] text-slate-500">Định tuyến tư vấn:</div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Cô Lan Anh (CNTT)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
