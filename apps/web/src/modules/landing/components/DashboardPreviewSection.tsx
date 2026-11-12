import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  BarChart3,
  TrendingUp,
  Users,
  Award,
  DollarSign,
  ShieldCheck,
} from 'lucide-react';
import { useLandingContent } from '../hooks/useLandingContent.js';

const PRODUCT_BAR_STYLE = [
  { height: '85%', color: 'from-blue-600 to-indigo-600' },
  { height: '72%', color: 'from-indigo-600 to-purple-600' },
  { height: '56%', color: 'from-purple-600 to-pink-600' },
  { height: '80%', color: 'from-cyan-600 to-blue-600' },
];

const CHANNEL_SHARES = ['45% (2.169)', '35% (1.687)', '15% (723)', '5% (241)'];
const CHANNEL_DOTS = ['bg-blue-600', 'bg-sky-500', 'bg-purple-500', 'bg-emerald-500'];

export const DashboardPreviewSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'trends' | 'funnel' | 'channels'>('trends');
  const { dashboard: d } = useLandingContent();

  return (
    <section id="dashboard-preview" className="relative py-16 sm:py-28 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
      {/* Background illumination */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[700px] h-[250px] sm:h-[350px] bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50 backdrop-blur-md mb-4 shadow-sm">
          <BarChart3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>{d.pill}</span>
        </div>
        <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
          {d.titleLead}{' '}
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">
            {d.titleHighlight}
          </span>
        </h2>
        <p className="mt-3 sm:mt-4 text-sm sm:text-lg text-slate-600 dark:text-slate-300">
          {d.subtitle}
        </p>
      </div>

      {/* 4 Summary KPI Cards: 1 cột trên 360px, 2 cột trên sm (640px), 4 cột trên lg (1024px) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8">
        <div className="p-4 sm:p-5 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{d.kpis[0].label}</span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">{d.kpis[0].value}</div>
          <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
            <TrendingUp className="w-3 h-3 shrink-0" />
            <span>{d.kpis[0].note}</span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{d.kpis[1].label}</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">{d.kpis[1].value}</div>
          <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
            <TrendingUp className="w-3 h-3 shrink-0" />
            <span>{d.kpis[1].note}</span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{d.kpis[2].label}</span>
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">{d.kpis[2].value}</div>
          <div className="mt-1 text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1 font-semibold">
            <span>{d.kpis[2].note}</span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{d.kpis[3].label}</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">{d.kpis[3].value}</div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            <span>{d.kpis[3].note}</span>
          </div>
        </div>
      </div>

      {/* Main Glassmorphism Chart Container */}
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-xl shadow-blue-950/5">
        {/* Chart View Selector Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 sm:pb-6 border-b border-slate-200/60 dark:border-slate-800/60">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {d.chartTitle}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {d.chartSubtitle}
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 overflow-x-auto max-w-full scrollbar-none w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('trends')}
              className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'trends'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span className="sm:hidden">{d.tabs.trends.short}</span>
              <span className="hidden sm:inline">{d.tabs.trends.long}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('funnel')}
              className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'funnel'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span className="sm:hidden">{d.tabs.products.short}</span>
              <span className="hidden sm:inline">{d.tabs.products.long}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('channels')}
              className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'channels'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span className="sm:hidden">{d.tabs.channels.short}</span>
              <span className="hidden sm:inline">{d.tabs.channels.long}</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Area / Line SVG Chart */}
        {activeTab === 'trends' && (
          <div className="pt-4 sm:pt-6">
            <div className="h-56 sm:h-72 w-full">
              <svg className="w-full h-full" viewBox="0 0 600 220" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="50%" stopColor="#6366F1" />
                    <stop offset="100%" stopColor="#06B6D4" />
                  </linearGradient>
                </defs>

                {/* Grid horizontal guidelines */}
                <line x1="0" y1="40" x2="600" y2="40" stroke="#cbd5e1" strokeDasharray="3 3" opacity="0.35" />
                <line x1="0" y1="90" x2="600" y2="90" stroke="#cbd5e1" strokeDasharray="3 3" opacity="0.35" />
                <line x1="0" y1="140" x2="600" y2="140" stroke="#cbd5e1" strokeDasharray="3 3" opacity="0.35" />
                <line x1="0" y1="190" x2="600" y2="190" stroke="#cbd5e1" opacity="0.5" />

                {/* Filled Area */}
                <polygon
                  points="0,180 60,150 120,160 180,110 240,125 300,80 360,95 420,50 480,65 540,30 600,45 600,200 0,200"
                  fill="url(#areaGradient)"
                />

                {/* Line Path */}
                <polyline
                  fill="none"
                  stroke="url(#strokeGradient)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points="0,180 60,150 120,160 180,110 240,125 300,80 360,95 420,50 480,65 540,30 600,45"
                />

                {/* Highlight data points */}
                {[
                  { cx: 180, cy: 110 },
                  { cx: 300, cy: 80 },
                  { cx: 420, cy: 50 },
                  { cx: 540, cy: 30 },
                ].map((point, i) => (
                  <g key={i}>
                    <circle cx={point.cx} cy={point.cy} r="5" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="2.5" />
                  </g>
                ))}
              </svg>
            </div>
            <div className="flex justify-between text-[11px] sm:text-xs text-slate-400 font-medium px-1 sm:px-2 pt-2">
              {d.weekdays.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Pure SVG Bar Chart */}
        {activeTab === 'funnel' && (
          <div className="pt-4 sm:pt-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 h-64 sm:h-72 items-end pb-2 sm:pb-4">
              {d.products.map((product, i) => ({ ...product, ...PRODUCT_BAR_STYLE[i] })).map((bar, i) => (
                <div key={i} className="flex flex-col items-center h-full justify-end">
                  <span className="text-xs font-bold text-slate-800 dark:text-white mb-1 sm:mb-2">{bar.value}</span>
                  <div className="w-full max-w-[60px] sm:max-w-[80px] bg-slate-100 dark:bg-slate-800 rounded-t-xl overflow-hidden flex items-end h-40 sm:h-48">
                    <motion.div
                      className={`w-full bg-gradient-to-t ${bar.color} rounded-t-xl`}
                      initial={{ height: 0 }}
                      animate={{ height: bar.height }}
                      transition={{ duration: 0.6, delay: i * 0.1 }}
                    />
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-center font-medium text-slate-600 dark:text-slate-400 mt-2 truncate w-full px-1">
                    {bar.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Pure SVG Donut Chart */}
        {activeTab === 'channels' && (
          <div className="pt-4 sm:pt-6 flex flex-col md:flex-row items-center justify-around gap-6 sm:gap-8">
            <div className="relative w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle cx="50" cy="50" r="38" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="14" fill="transparent" />
                {/* Facebook 45% */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="#2563EB"
                  strokeWidth="14"
                  fill="transparent"
                  strokeDasharray="107.4 238.76"
                  strokeDashoffset="0"
                />
                {/* Zalo 35% */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="#0EA5E9"
                  strokeWidth="14"
                  fill="transparent"
                  strokeDasharray="83.5 238.76"
                  strokeDashoffset="-107.4"
                />
                {/* Excel & Manual 15% */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="#8B5CF6"
                  strokeWidth="14"
                  fill="transparent"
                  strokeDasharray="35.8 238.76"
                  strokeDashoffset="-190.9"
                />
                {/* Other 5% */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="#10B981"
                  strokeWidth="14"
                  fill="transparent"
                  strokeDasharray="12 238.76"
                  strokeDashoffset="-226.7"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">{d.kpis[0].value}</span>
                <p className="text-[9px] sm:text-[10px] text-slate-400">{d.totalLeads}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 sm:gap-3 w-full sm:w-auto">
              {d.channelLegend.map((label, i) => (
                <div key={label} className="flex items-center gap-2.5 text-xs">
                  <span className={`w-3 h-3 rounded-full shrink-0 ${CHANNEL_DOTS[i]}`} />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{label}</span>
                  <span className="font-bold text-slate-900 dark:text-white ml-auto sm:ml-0">{CHANNEL_SHARES[i]}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
