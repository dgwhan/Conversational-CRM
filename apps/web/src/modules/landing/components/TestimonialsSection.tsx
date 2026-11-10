import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Quote,
  ChevronLeft,
  ChevronRight,
  Star,
  CheckCircle,
  Building2,
} from 'lucide-react';
import { TESTIMONIALS } from '../constants/landing.constants.js';

export const TestimonialsSection: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Auto sliding carousel with pause on hover
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5500);

    return () => clearInterval(timer);
  }, [isPaused]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? TESTIMONIALS.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % TESTIMONIALS.length);
  };

  const currentItem = TESTIMONIALS[currentIndex];

  return (
    <section
      id="testimonials"
      className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background soft glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50 backdrop-blur-md mb-4 shadow-sm">
          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span>Niềm tin từ các tổ chức giáo dục</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Được tin dùng bởi các trường{' '}
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">
            Đại học & Học viện hàng đầu
          </span>
        </h2>
        <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300">
          Lắng nghe chia sẻ từ những người trực tiếp vận hành công tác tuyển sinh và tư vấn học viên với Polaris<span className="text-blue-600 dark:text-blue-400 font-bold">X</span>.
        </p>
      </div>

      {/* Carousel Main Card */}
      <div className="max-w-4xl mx-auto relative">
        <div className="relative bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-3xl p-8 sm:p-12 shadow-2xl shadow-blue-950/5 min-h-[320px] flex flex-col justify-between">
          {/* Quote icon watermark */}
          <div className="absolute top-6 right-8 text-blue-500/10 dark:text-blue-400/10 pointer-events-none">
            <Quote className="w-24 h-24" />
          </div>

          {/* Stars */}
          <div className="flex items-center gap-1 mb-6 text-amber-400">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
            ))}
          </div>

          {/* Quote body */}
          <motion.p
            key={currentItem.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="text-lg sm:text-xl md:text-2xl font-medium text-slate-800 dark:text-slate-100 leading-relaxed italic relative z-10 mb-8"
          >
            "{currentItem.quote}"
          </motion.p>

          {/* Bottom author and outcome info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6 border-t border-slate-200/60 dark:border-slate-800/60">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-blue-500/20">
                {currentItem.avatarText}
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  {currentItem.author}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {currentItem.role} • {currentItem.organization}
                </p>
              </div>
            </div>

            {/* Achievement metric pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span>{currentItem.metricsResult}</span>
            </div>
          </div>
        </div>

        {/* Carousel Arrows and Dots */}
        <div className="flex items-center justify-between mt-8 px-2">
          {/* Dots */}
          <div className="flex items-center gap-2">
            {TESTIMONIALS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Đi tới đánh giá ${idx + 1}`}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  currentIndex === idx
                    ? 'w-8 bg-blue-600 dark:bg-blue-400'
                    : 'w-2.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>

          {/* Navigation Arrows */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              aria-label="Đánh giá trước"
              className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              aria-label="Đánh giá kế tiếp"
              className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
