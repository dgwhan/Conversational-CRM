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
    <section className="my-8 py-6 border-y border-slate-200">
      <div className="mb-5">
        <h2 className="text-base font-bold tracking-tight text-slate-950">
          Tóm tắt các điểm cốt lõi
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Tổng quan nhanh về quyền lợi và nguyên tắc xử lý dữ liệu trên hệ thống
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-8">
        {items.map((item, idx) => {
          const IconComp = ICON_MAP[item.iconName] || Shield;
          return (
            <div
              key={idx}
              className="flex items-start gap-3 border-t border-slate-200 py-4 first:border-t-0 sm:[&:nth-child(2)]:border-t-0"
            >
              <IconComp className="mt-0.5 h-4 w-4 shrink-0 text-[#0969DA]" />
              <div>
                <h3 className="mb-1 text-sm font-bold text-slate-950">
                  {item.title}
                </h3>
                <p className="text-sm leading-6 text-slate-600">
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
