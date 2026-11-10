import React from 'react';
import {
  Shield,
  Database,
  Lock,
  UserCheck,
  FileText,
  Scale,
  AlertTriangle,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { QuickSummaryItem } from '../types/legal.types.js';

export interface LegalQuickSummaryProps {
  items: QuickSummaryItem[];
}

const ICON_MAP = {
  shield: Shield,
  database: Database,
  lock: Lock,
  'user-check': UserCheck,
  'file-text': FileText,
  scale: Scale,
  'alert-triangle': AlertTriangle,
  clock: Clock,
};

export const LegalQuickSummary: React.FC<LegalQuickSummaryProps> = ({ items }) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="mb-12 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-cyan-500/10 border border-blue-200/60 dark:border-blue-800/40 backdrop-blur-xl shadow-lg shadow-blue-900/5">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
            Tóm tắt nhanh các điểm cốt lõi (Key Points)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Nội dung tóm lược bằng ngôn ngữ đại chúng giúp bạn nắm bắt nhanh quyền lợi và nguyên tắc hoạt động
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map((item, idx) => {
          const IconComp = ICON_MAP[item.iconName] || Shield;
          return (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-white/60 dark:border-white/10 shadow-sm flex items-start gap-3.5"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 border border-blue-200/40 dark:border-blue-800/40">
                <IconComp className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
