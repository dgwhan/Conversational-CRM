import React from 'react';
import { TrendingUp, Clock, Award, Layers } from 'lucide-react';
import { useLandingContent } from '../hooks/useLandingContent.js';

const statIcons = [
  <TrendingUp key="1" size={20} className="text-blue-600 dark:text-blue-400" />,
  <Clock key="2" size={20} className="text-emerald-600 dark:text-emerald-400" />,
  <Award key="3" size={20} className="text-indigo-600 dark:text-indigo-400" />,
  <Layers key="4" size={20} className="text-purple-600 dark:text-purple-400" />,
];

export const StatsStrip: React.FC<{ isDark?: boolean }> = () => {
  const { stats } = useLandingContent();

  return (
    <section className="relative py-12 border-y border-slate-200/70 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center sm:items-start text-center sm:text-left group transition-transform hover:-translate-y-1 duration-200"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-slate-800 border border-blue-100 dark:border-slate-700 flex items-center justify-center shrink-0">
                  {statIcons[idx]}
                </div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {stat.value}
                </div>
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                {stat.label}
              </div>
              <p className="mt-1 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">
                {stat.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
