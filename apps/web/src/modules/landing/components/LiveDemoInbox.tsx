import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare,
  UserCheck,
  Send,
  Phone,
  Tag,
  Clock,
  Bot,
  CheckCircle2,
  Users,
  Award,
} from 'lucide-react';
import { useLandingContent } from '../hooks/useLandingContent.js';
import { INDUSTRY_ORDER, type IndustryId } from '../content/landing.content.js';
import { Reveal } from './Reveal.js';

const INDUSTRY_ROTATION_DURATION = 7000;

export const LiveDemoInbox: React.FC<{ isDark?: boolean }> = ({ isDark: _isDark = false }) => {
  const { demo } = useLandingContent();
  const [industry, setIndustry] = useState<IndustryId>('b2b');
  const [isIndustrySelectionLocked, setIsIndustrySelectionLocked] = useState(
    () => typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false),
  );
  const [channelFilter, setChannelFilter] = useState<'all' | 'zalo' | 'facebook'>('all');
  const [mobileTab, setMobileTab] = useState<'chat' | 'conversations' | 'lead'>('chat');

  const scenario = demo.scenarios[industry];
  const conversations = scenario.conversations.filter(
    (conversation) => channelFilter === 'all' || conversation.channel === channelFilter,
  );

  // Chuyển ngành theo tiến trình cho đến khi người dùng chủ động chọn một ngành.
  useEffect(() => {
    if (isIndustrySelectionLocked) return;
    const timer = window.setTimeout(() => {
      setIndustry((current) => {
        const currentIndex = INDUSTRY_ORDER.indexOf(current);
        return INDUSTRY_ORDER[(currentIndex + 1) % INDUSTRY_ORDER.length] ?? current;
      });
    }, INDUSTRY_ROTATION_DURATION);
    return () => clearTimeout(timer);
  }, [industry, isIndustrySelectionLocked]);

  const handleSelectIndustry = (id: IndustryId) => {
    setIndustry(id);
    setChannelFilter('all');
    setIsIndustrySelectionLocked(true);
  };

  const currentScore = 85;

  return (
    <section
      id="live-demo"
      aria-labelledby="live-demo-heading"
      className="relative overflow-hidden bg-white font-['Roboto',ui-sans-serif,system-ui,sans-serif] py-16 sm:py-24 landing-dark:bg-[#0B1F3A]"
    >

      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        {/* Header */}
        <Reveal className="mx-auto mb-7 max-w-3xl text-center sm:mb-8">
          <h2
            id="live-demo-heading"
            className="text-3xl leading-[1.12] tracking-[-0.035em] text-[#0B1F3A] text-balance antialiased sm:text-4xl sm:leading-[1.08] lg:text-5xl landing-dark:text-white"
            style={{
              fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
              fontWeight: 800,
            }}
          >
            {demo.titleLead} {demo.titleHighlight}
          </h2>
        </Reveal>

        {/* Industry picker */}
        <Reveal className="mx-auto mb-6 max-w-6xl">
          <div
            role="tablist"
            aria-label={demo.industryPickerLabel}
            className="scrollbar-none flex w-full gap-4 overflow-x-auto sm:gap-6"
          >
            {INDUSTRY_ORDER.map((id) => {
              const isActive = id === industry;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls="live-demo-workspace"
                  onClick={() => handleSelectIndustry(id)}
                  className={`min-w-[130px] flex-1 cursor-pointer text-left text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0969DA] focus-visible:ring-offset-2 sm:text-base landing-dark:focus-visible:ring-offset-[#0B1F3A] ${
                    isActive ? 'text-[#0B1F3A] landing-dark:text-white' : 'text-slate-500 hover:text-slate-800 landing-dark:text-slate-400 landing-dark:hover:text-slate-100'
                  }`}
                >
                  <span className="relative mb-2 block h-0.5 overflow-hidden bg-[#E2E8F0] landing-dark:bg-white/15">
                    <motion.span
                      className="absolute inset-0 origin-left bg-[#0969DA]"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: isActive ? 1 : 0 }}
                      transition={{
                        duration: isActive && !isIndustrySelectionLocked ? INDUSTRY_ROTATION_DURATION / 1000 : 0,
                        ease: 'linear',
                      }}
                    />
                  </span>
                  {demo.scenarios[id].label}
                </button>
              );
            })}
          </div>
        </Reveal>

        {/* Mobile Tab Switcher: Hiển thị trên màn hình nhỏ < md */}
        <div className="mx-auto mb-3 flex max-w-6xl items-center rounded-lg border border-[#D0D7DE] bg-[#F6F8FA] p-1 md:hidden landing-dark:border-white/10 landing-dark:bg-white/5">
          {(
            [
              { id: 'chat', icon: <MessageSquare className="h-3.5 w-3.5" />, label: demo.tabs.chat },
              { id: 'conversations', icon: <Users className="h-3.5 w-3.5" />, label: demo.tabs.conversations },
              { id: 'lead', icon: <Award className="h-3.5 w-3.5" />, label: demo.tabs.lead },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMobileTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-medium transition-all ${
                mobileTab === tab.id
                  ? 'bg-white text-[#0B1F3A] landing-dark:bg-[#081628] landing-dark:text-white'
                  : 'text-slate-600 landing-dark:text-slate-400'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Workspace app shell */}
        <Reveal variant="slide-right" delay={240}
          className="mx-auto max-w-6xl overflow-hidden rounded-xl border border-[#D0D7DE] bg-white landing-dark:border-white/10 landing-dark:bg-[#081628]">
          {/* Connected channel navigation */}
            <div className="flex min-h-14 items-center border-b border-[#D0D7DE] bg-white px-4 landing-dark:border-white/10 landing-dark:bg-[#081628] sm:px-6">
            <div role="tablist" aria-label={demo.channelFilterLabel} className="flex min-w-0 gap-5 overflow-x-auto sm:gap-7">
              {(['all', 'zalo', 'facebook'] as const).map((filter) => {
                const isActive = channelFilter === filter;
                return (
                  <button
                    key={filter}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls="live-demo-conversation-list"
                    onClick={() => setChannelFilter(filter)}
                    className={`shrink-0 border-b-2 py-4 text-sm font-semibold transition-colors sm:text-base ${
                      isActive
                        ? 'border-[#0969DA] text-[#0B1F3A] landing-dark:text-white'
                        : 'border-transparent text-slate-500 hover:text-slate-800 landing-dark:text-slate-400 landing-dark:hover:text-slate-100'
                    }`}
                  >
                    {demo.channelFilters[filter]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3 Columns Layout (Desktop) / Tab Content (Mobile) */}
          <div id="live-demo-workspace" className="grid min-h-[540px] grid-cols-1 md:grid-cols-12 lg:min-h-[580px]">
            {/* Left Column: Conversation List */}
            <div
              id="live-demo-conversation-list"
              className={`flex-col gap-3 border-r border-slate-100 bg-[#FAFAFA] p-4 md:col-span-3 landing-dark:border-white/10 landing-dark:bg-white/5 ${
                mobileTab === 'conversations' ? 'flex' : 'hidden md:flex'
              }`}
            >
              <div className="px-2 py-1 text-sm font-semibold text-slate-500 landing-dark:text-slate-400">
                {demo.recentConversations}
              </div>

              {conversations.map((conv, idx) => {
                const isSelected = idx === 0;
                return (
                  <div
                    key={conv.id}
                    className={`relative rounded-lg border p-3 transition-colors sm:p-3.5 ${
                      isSelected
                        ? 'border-[#D0D7DE] bg-[#F6F8FA] before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r before:bg-[#0969DA] landing-dark:border-white/15 landing-dark:bg-white/10'
                        : 'border-transparent bg-transparent hover:border-[#D0D7DE] hover:bg-white landing-dark:hover:border-white/10 landing-dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-[#0B1F3A] landing-dark:text-white">
                        <span className="truncate">{conv.name}</span>
                        <span className="shrink-0 rounded-full bg-[#F6F8FA] px-1.5 text-[9px] font-semibold text-slate-600 landing-dark:bg-white/10 landing-dark:text-slate-300">
                          {conv.channel === 'facebook' ? 'FB' : 'Zalo'}
                        </span>
                      </div>
                      <span className="shrink-0 text-[10px] text-slate-400">{conv.time}</span>
                    </div>
                    <p className="mb-2 truncate text-sm text-slate-500 landing-dark:text-slate-400">{conv.snippet}</p>
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <div className="flex flex-wrap gap-1">
                        {conv.tags.map((t) => (
                          <span
                            key={t}
                            className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600 landing-dark:border-white/15 landing-dark:bg-white/5 landing-dark:text-slate-300"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                      <span className="flex shrink-0 items-center gap-0.5 text-[10px] font-semibold text-slate-600 landing-dark:text-slate-300">
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
              className={`flex-col justify-between border-r border-slate-100 bg-white p-4 sm:p-6 md:col-span-6 landing-dark:border-white/10 landing-dark:bg-[#081628] ${
                mobileTab === 'chat' ? 'flex' : 'hidden md:flex'
              }`}
            >
              {/* Chat header */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 landing-dark:border-white/10">
                <div className="min-w-0">
                  <h4 className="flex items-center gap-1.5 text-base font-semibold text-[#0B1F3A] landing-dark:text-white">
                    <span className="truncate">{scenario.customerName}</span>
                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                  </h4>
                  <p className="truncate text-sm text-slate-500 landing-dark:text-slate-400">{scenario.sourceName}</p>
                </div>
                <span className="shrink-0 rounded-full bg-[#F6F8FA] px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 landing-dark:bg-white/10 landing-dark:text-slate-300">
                  SLA: 03:42
                </span>
              </div>

              {/* Chat message stream */}
              <div className="flex max-h-[280px] flex-1 flex-col gap-3 overflow-y-auto py-4 sm:max-h-none">
                {/* Customer initial message */}
                <motion.div
                  key={`${industry}-customer`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="max-w-[90%] self-start rounded-xl rounded-tl-sm bg-[#F6F8FA] p-3 text-sm text-[#0B1F3A] sm:max-w-[85%] sm:p-4 landing-dark:bg-white/10 landing-dark:text-slate-200"
                >
                  <div className="mb-1 text-[10px] font-semibold text-slate-500 landing-dark:text-slate-400">
                    {scenario.customerName} (14:20)
                  </div>
                  <p className="leading-relaxed">{scenario.customerText}</p>
                </motion.div>

                {/* Bot routing notification message */}
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={`${industry}-bot`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="flex w-full max-w-[95%] items-center gap-2 self-center rounded-lg bg-[#F6F8FA] p-2 text-center text-[10.5px] text-slate-700 sm:max-w-[90%] sm:p-2.5 sm:text-[11px] landing-dark:bg-white/10 landing-dark:text-slate-200"
                  >
                    <Bot className="h-4 w-4 shrink-0 text-slate-500 landing-dark:text-slate-300" />
                    <span className="text-left leading-tight sm:text-center">{scenario.botText}</span>
                  </motion.div>
                </AnimatePresence>

                {/* Agent response */}
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={`${industry}-agent`}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.2 }}
                    className="max-w-[90%] self-end rounded-2xl rounded-tr-sm bg-[#0969DA] p-3 text-sm text-white sm:max-w-[85%] sm:p-4"
                  >
                    <div className="mb-1 text-[10px] font-semibold text-white/80">
                      {scenario.agentName} (14:21)
                    </div>
                    <p className="leading-relaxed">{scenario.agentText}</p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Fake Reply Input Box */}
              <div className="pt-2">
                <div className="flex items-center gap-2 rounded-full border border-[#D0D7DE] bg-[#F6F8FA] p-1.5 landing-dark:border-white/10 landing-dark:bg-white/5">
                  <input
                    type="text"
                    readOnly
                    placeholder={demo.inputPlaceholder}
                    aria-label={demo.inputPlaceholder}
                    tabIndex={-1}
                    className="min-w-0 flex-1 appearance-none select-none border-0 bg-transparent px-3 text-sm text-slate-400 outline-none placeholder:text-slate-400 focus:outline-none focus:ring-0 sm:text-base"
                  />
                  <button
                    type="button"
                    className="shrink-0 rounded-full bg-[#0074F0] p-2 text-white transition-colors hover:bg-[#0063CC]"
                    aria-label={demo.sendAria}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Lead Classification & Score */}
            <div
              className={`flex-col justify-between bg-[#FAFAFA] p-4 sm:p-5 md:col-span-3 landing-dark:bg-white/5 ${
                mobileTab === 'lead' ? 'flex' : 'hidden md:flex'
              }`}
            >
              <div>
                <div className="mb-4 text-sm font-semibold text-slate-500 landing-dark:text-slate-400">
                  {demo.profileTitle}
                </div>

                {/* Customer Summary */}
                <div className="mb-3 rounded-lg border border-[#D0D7DE] bg-white p-3 sm:mb-4 landing-dark:border-white/10 landing-dark:bg-[#081628]">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-white">
                      {scenario.customerInitials}
                    </div>
                    <div className="min-w-0">
                      <h5 className="truncate text-sm font-semibold text-[#0B1F3A] landing-dark:text-white">
                        {scenario.customerName}
                      </h5>
                      <p className="flex items-center gap-1 truncate text-[10px] text-slate-400">
                        <Phone className="h-2.5 w-2.5 shrink-0" />
                        0948 ••• •••
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 landing-dark:text-slate-400">
                    <UserCheck className="h-3 w-3 shrink-0 text-slate-500 landing-dark:text-slate-400" />
                    <span>{demo.mergedFrom}</span>
                  </div>
                </div>

                {/* Lead Potential Gauge */}
                <div className="mb-3 rounded-lg border border-[#D0D7DE] bg-white p-3 text-center sm:mb-4 landing-dark:border-white/10 landing-dark:bg-[#081628]">
                  <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-600 landing-dark:text-slate-300">
                    <span>{demo.scoreLabel}</span>
                    <span className="font-semibold text-[#0969DA] landing-dark:text-[#4DA3FF]">{currentScore}/100</span>
                  </div>

                  {/* Animated Score Progress Bar */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 landing-dark:bg-slate-700">
                    <motion.div
                      className="h-full rounded-full bg-[#0074F0]"
                      key={`${industry}-score`}
                      initial={{ width: '0%' }}
                      animate={{ width: `${currentScore}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-center gap-1 text-[10px] font-medium text-slate-600 landing-dark:text-slate-300">
                    <CheckCircle2 className="h-3 w-3 shrink-0 text-slate-500 landing-dark:text-slate-400" />
                    <span>{demo.closeChance}</span>
                  </div>
                </div>

                {/* Auto-Tags */}
                <div>
                  <div className="mb-2 flex items-center gap-1 text-[11px] font-medium text-slate-600 landing-dark:text-slate-400">
                    <Tag className="h-3 w-3 text-slate-500 landing-dark:text-slate-400" />
                    <span>{demo.autoTags}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[10px] font-medium text-slate-700 landing-dark:border-white/15 landing-dark:bg-white/5 landing-dark:text-slate-200">
                      {scenario.tags[0]}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[10px] font-medium text-slate-700 landing-dark:border-white/15 landing-dark:bg-white/5 landing-dark:text-slate-200">
                      {scenario.tags[1]}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-[#F6F8FA] px-2.5 py-0.5 text-[10px] font-medium text-slate-600 landing-dark:border-white/10 landing-dark:bg-white/5 landing-dark:text-slate-300">
                      {scenario.followUpTag}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom SLA timer */}
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-[11px] text-slate-500 landing-dark:border-white/10 landing-dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 shrink-0 text-slate-500 landing-dark:text-slate-400" />
                  {demo.responseTime}
                </span>
                <span className="shrink-0 font-semibold text-[#0B1F3A] landing-dark:text-slate-200">{demo.responseValue}</span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};
