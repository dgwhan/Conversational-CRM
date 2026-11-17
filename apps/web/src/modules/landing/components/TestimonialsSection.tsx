import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Quote, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { useLandingContent } from '../hooks/useLandingContent.js';
import { Reveal } from './Reveal.js';

export const TestimonialsSection: React.FC<{ isDark?: boolean }> = ({ isDark: _isDark = false }) => {
  const { testimonials: tm } = useLandingContent();
  const TESTIMONIALS = tm.items;
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Auto sliding carousel with pause on hover
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5500);

    return () => clearInterval(timer);
  }, [isPaused, TESTIMONIALS.length]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? TESTIMONIALS.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % TESTIMONIALS.length);
  };

  const currentItem = TESTIMONIALS[currentIndex % TESTIMONIALS.length];

  return (
    <section
      id="testimonials"
      aria-labelledby="testimonials-heading"
      className="relative overflow-hidden bg-[#F4F7FB] font-['Roboto',ui-sans-serif,system-ui,sans-serif] py-16 sm:py-28 landing-dark:bg-[#0B1F3A]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >

      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        {/* Header */}
        <Reveal className="mx-auto mb-10 max-w-3xl text-center sm:mb-16">
          <h2
            id="testimonials-heading"
            className="text-[1.75rem] leading-[1.15] tracking-[-0.03em] text-[#0B1F3A] text-balance antialiased sm:text-4xl sm:leading-[1.1] lg:text-[2.75rem] landing-dark:text-white"
            style={{
              fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
              fontWeight: 800,
            }}
          >
            {tm.titleLead} {tm.titleHighlight}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg landing-dark:text-slate-300">
            {tm.subtitleBefore}
            <span className="font-bold text-[#0074F0] landing-dark:text-[#4DA3FF]">X</span>
            {tm.subtitleAfter}
          </p>
        </Reveal>

        {/* Carousel Main Card */}
        <Reveal variant="slide-left" delay={100} className="relative mx-auto max-w-4xl">
          <div className="relative flex min-h-[280px] flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 sm:min-h-[320px]  sm:p-8 md:p-12 landing-dark:border-white/10 landing-dark:bg-[#081628]">
            {/* Quote icon watermark */}
            <div className="pointer-events-none absolute right-6 top-4 text-[#0074F0]/10 sm:right-8 sm:top-6 landing-dark:text-[#4DA3FF]/10">
              <Quote className="h-16 w-16 sm:h-24 sm:w-24" />
            </div>

            {/* Stars */}
            <div className="mb-4 flex items-center gap-1 sm:mb-6" aria-hidden="true">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-[#0074F0] text-[#0074F0] landing-dark:fill-[#4DA3FF] landing-dark:text-[#4DA3FF]" />
              ))}
            </div>

            {/* Quote body */}
            <motion.p
              key={currentItem.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="relative z-10 mb-6 text-base font-medium italic leading-relaxed text-[#0B1F3A] sm:mb-8 sm:text-xl md:text-2xl landing-dark:text-slate-100"
            >
              “{currentItem.quote}”
            </motion.p>

            {/* Bottom author info */}
            <div className="flex items-center gap-3 border-t border-slate-200 pt-4 sm:pt-6 landing-dark:border-white/10">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0074F0] text-xs font-bold text-white sm:h-12 sm:w-12 sm:text-sm">
                {currentItem.avatarText}
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#0B1F3A] sm:text-base landing-dark:text-white">
                  {currentItem.author}
                </h4>
                <p className="text-[11px] text-slate-500 sm:text-xs landing-dark:text-slate-400">
                  {currentItem.role} • {currentItem.organization}
                </p>
              </div>
            </div>
          </div>

          {/* Carousel Arrows and Dots */}
          <div className="mt-6 flex items-center justify-between px-2 sm:mt-8">
            {/* Dots */}
            <div className="flex items-center gap-2">
              {TESTIMONIALS.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`${tm.goTo} ${idx + 1}`}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    currentIndex === idx
                      ? 'w-7 bg-[#0074F0] sm:w-8 landing-dark:bg-[#4DA3FF]'
                      : 'w-2.5 bg-slate-300 hover:bg-slate-400 landing-dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>

            {/* Navigation Arrows */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrev}
                aria-label={tm.prev}
                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 transition-colors hover:bg-[#E8F2FE] sm:p-2.5 landing-dark:border-white/20 landing-dark:bg-transparent landing-dark:text-slate-200 landing-dark:hover:bg-white/10"
              >
                <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label={tm.next}
                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 transition-colors hover:bg-[#E8F2FE] sm:p-2.5 landing-dark:border-white/20 landing-dark:bg-transparent landing-dark:text-slate-200 landing-dark:hover:bg-white/10"
              >
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};
