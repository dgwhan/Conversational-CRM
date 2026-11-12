import React from 'react';
import { motion } from 'motion/react';
import {
  GraduationCap,
  Building2,
  Sparkles,
  ShoppingBag,
  Briefcase,
  SlidersHorizontal,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { useLandingContent } from '../hooks/useLandingContent.js';
import type { IndustryId } from '../content/landing.content.js';

const INDUSTRY_STYLE: Record<IndustryId, { icon: React.ReactNode; accent: string; chip: string }> = {
  education: {
    icon: <GraduationCap size={20} />,
    accent: 'bg-blue-600 shadow-blue-500/25',
    chip: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  },
  realEstate: {
    icon: <Building2 size={20} />,
    accent: 'bg-emerald-600 shadow-emerald-500/25',
    chip: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  },
  beauty: {
    icon: <Sparkles size={20} />,
    accent: 'bg-rose-500 shadow-rose-500/25',
    chip: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
  },
  retail: {
    icon: <ShoppingBag size={20} />,
    accent: 'bg-amber-500 shadow-amber-500/25',
    chip: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  },
  b2b: {
    icon: <Briefcase size={20} />,
    accent: 'bg-indigo-600 shadow-indigo-500/25',
    chip: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300',
  },
};

export const IndustriesSection: React.FC = () => {
  const { industries } = useLandingContent();

  return (
    <section id="industries" className="relative py-16 sm:py-24 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[700px] h-[260px] sm:h-[360px] bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-rose-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50 backdrop-blur-md mb-4 shadow-sm">
          <Layers className="w-3.5 h-3.5" />
          <span>{industries.pill}</span>
        </div>
        <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
          {industries.titleLead}{' '}
          <span className="bg-gradient-to-r from-emerald-500 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {industries.titleHighlight}
          </span>
        </h2>
        <p className="mt-3 sm:mt-4 text-sm sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
          {industries.subtitle}
        </p>
      </div>

      {/* Industry cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {industries.items.map((item, index) => {
          const style = INDUSTRY_STYLE[item.id];
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              className="group rounded-2xl p-5 sm:p-6 border border-white/80 dark:border-slate-700/80 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-md shrink-0 ${style.accent}`}>
                  {style.icon}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                  {item.name}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                {item.description}
              </p>

              <div className="mt-auto space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    {industries.stagesLabel}
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {item.stages.map((stage, stageIdx) => (
                      <React.Fragment key={stage}>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${style.chip}`}>
                          {stage}
                        </span>
                        {stageIdx < item.stages.length - 1 && (
                          <ChevronRight size={12} className="text-slate-300 dark:text-slate-600 shrink-0" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    {industries.termsLabel}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {item.terms.map((term) => (
                      <span
                        key={term}
                        className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50"
                      >
                        {term}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Custom industry card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.45, delay: industries.items.length * 0.08 }}
          className="rounded-2xl p-5 sm:p-6 border-2 border-dashed border-blue-300/70 dark:border-blue-700/60 bg-blue-50/50 dark:bg-blue-950/20 flex flex-col justify-center"
        >
          <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center justify-center mb-3 shrink-0">
            <SlidersHorizontal size={20} />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-2">
            {industries.customNoteTitle}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {industries.customNote}
          </p>
        </motion.div>
      </div>
    </section>
  );
};
