import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, CheckCircle2, Sparkles, Shield, Zap } from 'lucide-react';
import { MascotCusi } from './characters/MascotCusi.js';

export const FinalCtaSection: React.FC = () => {
  return (
    <section className="relative py-14 sm:py-20 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
      {/* Container with high-impact gradient glass */}
      <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-700 to-violet-800 p-5 sm:p-10 lg:p-16 text-white shadow-2xl shadow-indigo-900/30 overflow-hidden">
        {/* Ambient mesh background circles */}
        <div className="absolute -top-24 -right-24 w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-pink-500/20 blur-3xl pointer-events-none" />

        {/* Confetti particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(16)].map((_, i) => (
            <span
              key={i}
              className="absolute w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full opacity-60 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]"
              style={{
                top: `${(i * 19) % 90}%`,
                left: `${(i * 23) % 95}%`,
                backgroundColor: ['#67e8f9', '#f472b6', '#fde047', '#a78bfa', '#34d399'][i % 5],
                animationDelay: `${(i * 0.3).toFixed(1)}s`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
          {/* Left Text & CTA Action (8 cols) */}
          <div className="lg:col-span-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white/15 border border-white/20 backdrop-blur-md mb-4 sm:mb-6 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
              <span>Sẵn sàng chuyển đổi số cùng PolarisX</span>
            </div>

            <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
              Bứt phá chỉ tiêu tuyển sinh ngay hôm nay
            </h2>

            <p className="mt-3 sm:mt-4 text-sm sm:text-base lg:text-lg text-blue-100 max-w-2xl leading-relaxed">
              Trải nghiệm hệ thống CRM hội thoại đa kênh hoàn chỉnh: gom tin nhắn tự động, phân loại tức thì và tăng tốc độ chốt học viên lên gấp 3 lần.
            </p>

            {/* Checklist features */}
            <div className="mt-5 sm:mt-6 flex flex-wrap gap-2.5 sm:gap-4 justify-center lg:justify-start text-xs font-medium text-blue-100">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-300 shrink-0" />
                <span>Triển khai nhanh dưới 24h</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-cyan-300 shrink-0" />
                <span>Bảo mật RBAC & BOLA</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-cyan-300 shrink-0" />
                <span>Hỗ trợ kỹ thuật 24/7 Telegram</span>
              </span>
            </div>

            {/* CTA Buttons */}
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 w-full sm:w-auto">
              <a
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl text-xs sm:text-sm font-bold bg-white text-blue-700 hover:bg-blue-50 shadow-lg shadow-black/10 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <span>Bắt đầu dùng thử miễn phí</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#features"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3.5 sm:py-4 rounded-xl text-xs sm:text-sm font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md transition-colors"
              >
                Tìm hiểu thêm các tính năng
              </a>
            </div>
          </div>

          {/* Right Mascot Celebrating (4 cols) */}
          <div className="lg:col-span-4 flex justify-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="relative p-2 sm:p-4 flex items-center justify-center scale-90 sm:scale-100"
            >
              <MascotCusi
                mood="celebrating"
                size={180}
                showSpeechBubble={true}
                speechText="Sẵn sàng bứt phá! 🎉"
                className="drop-shadow-2xl"
              />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};
