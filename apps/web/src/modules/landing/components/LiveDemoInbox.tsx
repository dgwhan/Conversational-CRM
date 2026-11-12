import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare,
  Sparkles,
  UserCheck,
  Send,
  Phone,
  Tag,
  Clock,
  RotateCcw,
  Bot,
  Flame,
  CheckCircle2,
  Users,
  Award,
} from 'lucide-react';
import { useLandingContent } from '../hooks/useLandingContent.js';
import { INDUSTRY_ORDER, type IndustryId } from '../content/landing.content.js';

/** Số bước của chu trình: tin nhắn khách → bot định tuyến → nhân viên trả lời. */
const STREAM_STEPS = 3;

export const LiveDemoInbox: React.FC = () => {
  const { demo } = useLandingContent();
  const [industry, setIndustry] = useState<IndustryId>('education');
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [mobileTab, setMobileTab] = useState<'chat' | 'conversations' | 'lead'>('chat');

  const scenario = demo.scenarios[industry];

  // Auto-play loop sequence
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % (STREAM_STEPS + 1));
    }, 3800);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleSelectIndustry = (id: IndustryId) => {
    setIndustry(id);
    setActiveStep(0);
  };

  // Lead score calculation based on active step
  const currentScore = activeStep === 0 ? 45 : activeStep === 1 ? 85 : 95;
  const cycleLabel = demo.cycleLabel
    .replace('{current}', String(Math.min(activeStep + 1, STREAM_STEPS)))
    .replace('{total}', String(STREAM_STEPS));

  return (
    <section id="live-demo" className="relative py-16 sm:py-24 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/4 w-72 sm:w-96 h-72 sm:h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-72 sm:w-96 h-72 sm:h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-cyan-50/80 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200/50 dark:border-cyan-800/50 backdrop-blur-md mb-4 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
          <span>{demo.pill}</span>
        </div>
        <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
          {demo.titleLead}{' '}
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">
            {demo.titleHighlight}
          </span>
        </h2>
        <p className="mt-3 sm:mt-4 text-sm sm:text-lg text-slate-600 dark:text-slate-300">
          {demo.subtitle}
        </p>
      </div>

      {/* Industry picker */}
      <div
        role="tablist"
        aria-label={demo.industryPickerLabel}
        className="max-w-5xl mx-auto mb-5 flex gap-2 overflow-x-auto scrollbar-none px-1 pb-1 sm:flex-wrap sm:justify-center"
      >
        {INDUSTRY_ORDER.map((id) => {
          const isActive = id === industry;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleSelectIndustry(id)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'bg-white/70 dark:bg-slate-800/70 border-slate-200/70 dark:border-slate-700/70 text-slate-600 dark:text-slate-300 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              {demo.scenarios[id].label}
            </button>
          );
        })}
      </div>

      {/* Interactive Controls Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 max-w-5xl mx-auto mb-4 px-2">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{cycleLabel}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveStep(0)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            <RotateCcw className="w-3 h-3" />
            {demo.reset}
          </button>
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100/60 transition-colors shadow-sm"
          >
            {isPlaying ? demo.pause : demo.resume}
          </button>
        </div>
      </div>

      {/* Mobile Tab Switcher: Hiển thị trên màn hình nhỏ < md */}
      <div className="md:hidden max-w-5xl mx-auto mb-3 flex items-center p-1 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl border border-slate-300/50 dark:border-slate-700/50">
        {(
          [
            { id: 'chat', icon: <MessageSquare className="w-3.5 h-3.5" />, label: demo.tabs.chat },
            { id: 'conversations', icon: <Users className="w-3.5 h-3.5" />, label: demo.tabs.conversations },
            { id: 'lead', icon: <Award className="w-3.5 h-3.5" />, label: demo.tabs.lead },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMobileTab(tab.id)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mobileTab === tab.id
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 3-Column Glassmorphism Demo Container */}
      <div className="max-w-5xl mx-auto bg-white/75 dark:bg-slate-900/75 backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl shadow-blue-950/10 overflow-hidden">
        {/* Mockup Window Top Header */}
        <div className="h-9 sm:h-10 px-3 sm:px-4 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
          </div>
          <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
            <MessageSquare className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="truncate">Polaris<strong className="text-blue-600 font-bold">X</strong> {demo.windowTitle}</span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 font-mono shrink-0">v2.4.0</div>
        </div>

        {/* 3 Columns Layout (Desktop) / Tab Content (Mobile) */}
        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[420px] sm:min-h-[460px]">
          {/* Left Column: Conversation List */}
          <div
            className={`md:col-span-4 border-r border-slate-200/60 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-900/40 p-3 flex-col gap-2 ${
              mobileTab === 'conversations' ? 'flex' : 'hidden md:flex'
            }`}
          >
            <div className="px-2 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">
              {demo.recentConversations}
            </div>

            {scenario.conversations.map((conv, idx) => {
              const isSelected = idx === 0;
              return (
                <div
                  key={conv.id}
                  className={`p-2.5 sm:p-3 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700/60 shadow-sm'
                      : 'bg-white/60 dark:bg-slate-800/40 border-slate-200/40 dark:border-slate-800/40 hover:bg-slate-100/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800 dark:text-white min-w-0">
                      <span className="truncate">{conv.name}</span>
                      {conv.channel === 'facebook' ? (
                        <span className="text-[9px] font-bold px-1.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 shrink-0">
                          FB
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 rounded bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300 shrink-0">
                          Zalo
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">{conv.time}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mb-2">
                    {conv.snippet}
                  </p>
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <div className="flex gap-1 flex-wrap">
                      {conv.tags.map((t) => (
                        <span
                          key={t}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200/70 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <span className="font-bold text-amber-500 text-[10px] flex items-center gap-0.5 shrink-0">
                      <Flame className="w-3 h-3" />
                      {conv.score}
                      {demo.scoreSuffix}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Center Column: Live Chat Dialogue */}
          <div
            className={`md:col-span-5 p-3 sm:p-4 flex-col justify-between bg-white/40 dark:bg-slate-900/20 border-r border-slate-200/60 dark:border-slate-800/60 ${
              mobileTab === 'chat' ? 'flex' : 'hidden md:flex'
            }`}
          >
            {/* Chat header */}
            <div className="pb-3 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="truncate">{scenario.customerName}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                </h4>
                <p className="text-[10px] text-slate-400 truncate">{scenario.sourceName}</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold shrink-0">
                SLA: 03:42
              </span>
            </div>

            {/* Chat message stream */}
            <div className="flex-1 py-4 flex flex-col gap-3 overflow-y-auto max-h-[280px] sm:max-h-none">
              {/* Customer initial message */}
              <motion.div
                key={`${industry}-customer`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="max-w-[90%] sm:max-w-[85%] self-start bg-slate-100/90 dark:bg-slate-800/90 rounded-2xl rounded-tl-sm p-2.5 sm:p-3 text-xs text-slate-800 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700/50 shadow-sm"
              >
                <div className="font-semibold text-[10px] text-blue-600 dark:text-blue-400 mb-1">
                  {scenario.customerName} (14:20)
                </div>
                <p className="leading-relaxed">{scenario.customerText}</p>
              </motion.div>

              {/* Bot routing notification message */}
              <AnimatePresence>
                {activeStep >= 1 && (
                  <motion.div
                    key={`${industry}-bot`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="self-center w-full max-w-[95%] sm:max-w-[90%] bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/70 rounded-xl p-2 sm:p-2.5 text-center text-[10.5px] sm:text-[11px] text-blue-800 dark:text-blue-300 flex items-center gap-2"
                  >
                    <Bot className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="leading-tight text-left sm:text-center">{scenario.botText}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Agent response */}
              <AnimatePresence>
                {activeStep >= 2 && (
                  <motion.div
                    key={`${industry}-agent`}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="max-w-[90%] sm:max-w-[85%] self-end bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl rounded-tr-sm p-2.5 sm:p-3 text-xs shadow-md shadow-blue-600/20"
                  >
                    <div className="font-semibold text-[10px] text-blue-100 mb-1">
                      {scenario.agentName} (14:21)
                    </div>
                    <p className="leading-relaxed">{scenario.agentText}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Fake Reply Input Box */}
            <div className="pt-2">
              <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                <input
                  type="text"
                  readOnly
                  value={demo.inputPlaceholder}
                  className="bg-transparent text-[11px] sm:text-xs text-slate-400 flex-1 px-2 outline-none select-none min-w-0"
                />
                <button
                  type="button"
                  className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shrink-0"
                  aria-label={demo.sendAria}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Lead Classification & Score */}
          <div
            className={`md:col-span-3 p-3 sm:p-4 bg-slate-50/50 dark:bg-slate-900/50 flex-col justify-between ${
              mobileTab === 'lead' ? 'flex' : 'hidden md:flex'
            }`}
          >
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                {demo.profileTitle}
              </div>

              {/* Customer Summary */}
              <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 mb-3 sm:mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {scenario.customerInitials}
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {scenario.customerName}
                    </h5>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                      <Phone className="w-2.5 h-2.5 shrink-0" />
                      0948 ••• •••
                    </p>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span>{demo.mergedFrom}</span>
                </div>
              </div>

              {/* Lead Potential Gauge */}
              <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 mb-3 sm:mb-4 text-center">
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center justify-between">
                  <span>{demo.scoreLabel}</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{currentScore}/100</span>
                </div>

                {/* Animated Score Progress Bar */}
                <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 rounded-full"
                    initial={{ width: '45%' }}
                    animate={{ width: `${currentScore}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>

                <div className="mt-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span>{demo.closeChance}</span>
                </div>
              </div>

              {/* Auto-Tags */}
              <div>
                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-blue-500" />
                  <span>{demo.autoTags}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200/60">
                    {scenario.tags[0]}
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200/60">
                    {scenario.tags[1]}
                  </span>
                  {activeStep >= 2 && (
                    <motion.span
                      key={`${industry}-follow-up`}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60"
                    >
                      {scenario.followUpTag}
                    </motion.span>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom SLA timer */}
            <div className="mt-3 pt-2.5 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                {demo.responseTime}
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200 shrink-0">{demo.responseValue}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
