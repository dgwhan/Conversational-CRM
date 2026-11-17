import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  GraduationCap,
  Building2,
  Sparkles,
  ShoppingBag,
  Briefcase,
  SlidersHorizontal,
  Check,
  Lock,
} from 'lucide-react';
import { useLandingContent } from '../hooks/useLandingContent.js';
import type { IndustryId } from '../content/landing.content.js';
import { Reveal } from './Reveal.js';

const INDUSTRY_ICON: Record<IndustryId, React.ReactNode> = {
  education: <GraduationCap size={18} aria-hidden="true" />,
  realEstate: <Building2 size={18} aria-hidden="true" />,
  beauty: <Sparkles size={18} aria-hidden="true" />,
  retail: <ShoppingBag size={18} aria-hidden="true" />,
  b2b: <Briefcase size={18} aria-hidden="true" />,
};

const CARDS_PER_COLUMN = [3, 2, 2, 1, 1];

/** Bố cục 2 cột: danh sách ngành dọc bên trái, khung sản phẩm bên phải. */
export const IndustriesSection: React.FC<{ isDark?: boolean }> = ({ isDark: _isDark = false }) => {
  const { industries } = useLandingContent();
  const [activeId, setActiveId] = useState<IndustryId>(industries.items[0].id);
  const active = industries.items.find((i) => i.id === activeId) ?? industries.items[0];

  return (
    <section
      id="industries"
      aria-labelledby="industries-heading"
      className="bg-white py-20 font-['Roboto',ui-sans-serif,system-ui,sans-serif] sm:py-28 landing-dark:bg-[#081628]"
    >
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:gap-14 lg:px-8">
        <div className="lg:col-span-4">
          <Reveal>
            <h2
              id="industries-heading"
              className="text-[1.75rem] leading-[1.15] tracking-[-0.03em] text-[#0B1F3A] text-balance sm:text-4xl landing-dark:text-white"
              style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif", fontWeight: 800 }}
            >
              {industries.titleLead} {industries.titleHighlight}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg landing-dark:text-slate-300">
              {industries.subtitle}
            </p>
          </Reveal>

          <Reveal variant="slide-left" delay={100} className="-mx-4 mt-8 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div
              role="tablist"
              aria-orientation="vertical"
              aria-label={industries.pill}
              className="flex w-max gap-1 lg:w-auto lg:flex-col"
            >
              {industries.items.map((item) => {
                const selected = item.id === active.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    id={`industry-tab-${item.id}`}
                    aria-selected={selected}
                    aria-controls="industry-panel"
                    onClick={() => setActiveId(item.id)}
                    className={`flex shrink-0 cursor-pointer items-center gap-3 rounded-lg border-l-2 px-4 py-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0074F0] ${
                      selected
                        ? 'border-[#0074F0] bg-[#E8F2FE] text-[#0B1F3A] landing-dark:bg-white/10 landing-dark:text-white'
                        : 'border-transparent text-slate-600 hover:bg-slate-100 hover:text-[#0B1F3A] landing-dark:text-slate-300 landing-dark:hover:bg-white/5 landing-dark:hover:text-white'
                    }`}
                  >
                    <span className={selected ? 'text-[#0074F0] landing-dark:text-[#4DA3FF]' : ''}>
                      {INDUSTRY_ICON[item.id]}
                    </span>
                    {item.name}
                  </button>
                );
              })}
            </div>
          </Reveal>
        </div>

        <div className="lg:col-span-8">
          <Reveal variant="slide-right" delay={150}>
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
                  polarisx-crm.vn/pipeline
                </div>
              </div>

              <div
                id="industry-panel"
                role="tabpanel"
                aria-labelledby={`industry-tab-${active.id}`}
                className="p-5 sm:p-8"
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E8F2FE] text-[#0074F0] landing-dark:bg-white/10 landing-dark:text-[#4DA3FF]">
                        {INDUSTRY_ICON[active.id]}
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-[#0B1F3A] sm:text-lg landing-dark:text-white">
                          {active.name}
                        </h3>
                        <p className="text-sm leading-relaxed text-slate-600 landing-dark:text-slate-300">
                          {active.description}
                        </p>
                      </div>
                    </div>

                    <div className="-mx-5 mt-6 overflow-x-auto px-5 sm:mx-0 sm:px-0">
                      <ol
                        className="grid gap-3"
                        style={{ gridTemplateColumns: `repeat(${active.stages.length}, minmax(140px, 1fr))` }}
                        aria-label={industries.stagesLabel}
                      >
                        {active.stages.map((stage, idx) => {
                          const isLast = idx === active.stages.length - 1;
                          const cards = CARDS_PER_COLUMN[idx] ?? 1;
                          return (
                            <li key={stage} className="rounded-lg bg-[#F4F7FB] p-3 landing-dark:bg-white/5">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                                    isLast
                                      ? 'bg-[#0074F0] text-white'
                                      : 'bg-white text-slate-600 landing-dark:bg-white/10 landing-dark:text-slate-200'
                                  }`}
                                >
                                  {isLast ? <Check size={11} strokeWidth={3} aria-hidden="true" /> : idx + 1}
                                </span>
                                <span className="text-[13px] font-medium leading-tight text-[#0B1F3A] landing-dark:text-white">
                                  {stage}
                                </span>
                              </div>
                              <div className="mt-3 space-y-2" aria-hidden="true">
                                {Array.from({ length: cards }).map((_, c) => (
                                  <div key={c} className="rounded-md bg-white p-2.5 landing-dark:bg-white/10">
                                    <div className="h-1.5 w-3/4 rounded-full bg-slate-200 landing-dark:bg-white/25" />
                                    <div className="mt-2 h-1.5 w-1/2 rounded-full bg-slate-100 landing-dark:bg-white/15" />
                                  </div>
                                ))}
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-slate-200 pt-5 landing-dark:border-white/10">
                      <span className="text-sm font-medium text-[#0B1F3A] landing-dark:text-white">{industries.termsLabel}</span>
                      {active.terms.map((term) => (
                        <span
                          key={term}
                          className="rounded-md bg-[#E8F2FE] px-2.5 py-1 text-xs font-medium text-[#0B1F3A] landing-dark:bg-white/10 landing-dark:text-slate-100"
                        >
                          {term}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </Reveal>

          <Reveal delay={100} className="mt-6 flex items-start gap-3">
            <SlidersHorizontal size={20} className="mt-0.5 shrink-0 text-[#0074F0] landing-dark:text-[#4DA3FF]" aria-hidden="true" />
            <div className="max-w-3xl">
              <h3 className="text-base font-bold text-[#0B1F3A] landing-dark:text-white">{industries.customNoteTitle}</h3>
              <p className="mt-0.5 text-sm leading-relaxed text-slate-600 landing-dark:text-slate-300">{industries.customNote}</p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
};
