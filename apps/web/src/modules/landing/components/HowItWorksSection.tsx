import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Clock, Sparkles } from 'lucide-react';
import { useLandingContent } from '../hooks/useLandingContent.js';
import { MascotCusi } from './characters/MascotCusi.js';
import {
  MessengerBird,
  RecruiterCharacter,
  StudentCharacter,
} from './characters/SupportCharacters.js';

export const HowItWorksSection: React.FC = () => {
  const { how } = useLandingContent();

  return (
    <section id="how-it-works" className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50 backdrop-blur-md mb-4 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>{how.pill}</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {how.titleLead}{' '}
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">
            {how.titleHighlight}
          </span>
        </h2>
        <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300">
          {how.subtitleBefore}
          <span className="text-blue-600 dark:text-blue-400 font-bold">X</span>
          {how.subtitleAfter}
        </p>
      </div>

      {/* Process Steps Container */}
      <div className="relative">
        {/* Desktop Connecting SVG Line */}
        <div className="hidden lg:block absolute top-[110px] left-[10%] right-[10%] h-1 z-0 pointer-events-none">
          <svg className="w-full h-8 overflow-visible" preserveAspectRatio="none">
            <defs>
              <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                <stop offset="35%" stopColor="#6366F1" stopOpacity="0.8" />
                <stop offset="70%" stopColor="#8B5CF6" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.4" />
              </linearGradient>
            </defs>
            <line
              x1="0"
              y1="4"
              x2="100%"
              y2="4"
              stroke="url(#line-gradient)"
              strokeWidth="3"
              strokeDasharray="6 6"
              className="animate-[pulse_3s_ease-in-out_infinite]"
            />
          </svg>
        </div>

        {/* 4 Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 relative z-10">
          {how.steps.map((item, index) => {
            return (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="group relative flex flex-col items-center bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl p-6 shadow-lg shadow-blue-900/5 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1.5 transition-all duration-300"
              >
                {/* Step badge */}
                <div className="absolute -top-3 left-6 px-3 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
                  {how.stepLabel} 0{item.step}
                </div>

                {/* Character preview container */}
                <div className="h-28 flex items-center justify-center mb-4 mt-2">
                  {item.step === 1 && (
                    <div className="relative p-2 rounded-2xl bg-sky-50/80 dark:bg-sky-950/30 border border-sky-200/50 dark:border-sky-800/50 group-hover:scale-105 transition-transform duration-300">
                      <MessengerBird size={80} className="drop-shadow-md" ariaLabel={how.characterLabels.messenger} />
                    </div>
                  )}
                  {item.step === 2 && (
                    <div className="relative p-1 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-800/50 group-hover:scale-105 transition-transform duration-300">
                      <MascotCusi
                        mood="typing"
                        size={84}
                        showSpeechBubble={false}
                        className="drop-shadow-md"
                      />
                    </div>
                  )}
                  {item.step === 3 && (
                    <div className="relative p-2 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/50 group-hover:scale-105 transition-transform duration-300">
                      <RecruiterCharacter size={80} className="drop-shadow-md" ariaLabel={how.characterLabels.agent} />
                    </div>
                  )}
                  {item.step === 4 && (
                    <div className="relative p-2 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/50 group-hover:scale-105 transition-transform duration-300">
                      <StudentCharacter size={80} className="drop-shadow-md" ariaLabel={how.characterLabels.customer} />
                    </div>
                  )}
                </div>

                {/* Subtitle & Title */}
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">
                  {item.subtitle}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center mb-3">
                  {item.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-slate-600 dark:text-slate-300 text-center leading-relaxed mb-4 flex-1">
                  {item.description}
                </p>

                {/* Channel tags */}
                <div className="flex flex-wrap gap-1.5 justify-center mt-auto w-full pt-3 border-t border-slate-100 dark:border-slate-800/60">
                  {item.channelTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Bottom Process SLA Guarantee Note */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-12 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-200/40 dark:border-blue-800/40 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-400/10 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              {how.slaTitle}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {how.slaDescription}
            </p>
          </div>
        </div>
        <a
          href="#live-demo"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 bg-white/80 dark:bg-slate-800/80 border border-blue-200/60 dark:border-blue-700/60 hover:bg-blue-50 dark:hover:bg-slate-700/50 transition-colors shadow-sm whitespace-nowrap"
        >
          {how.slaCta}
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </motion.div>
    </section>
  );
};
