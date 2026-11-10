import React from 'react';
import { Calendar, CheckCircle2, FileText, Info, ShieldAlert, Sparkles } from 'lucide-react';
import type { LegalDocument } from '../types/legal.types.js';
import { MascotCusiLegal } from './MascotCusiLegal.js';

export interface LegalHeaderProps {
  document: LegalDocument;
}

export const LegalHeader: React.FC<LegalHeaderProps> = ({ document }) => {
  const isPrivacy = document.documentType === 'privacy';

  return (
    <header className="relative pt-28 pb-12 px-4 sm:px-6 lg:px-8 border-b border-slate-200/60 dark:border-slate-800/60 bg-gradient-to-b from-blue-50/40 via-transparent to-transparent dark:from-blue-950/20">
      {/* Dev Mode Banner (chỉ hiển thị khi chạy môi trường phát triển) */}
      {import.meta.env.DEV && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-semibold backdrop-blur-md shadow-sm">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span>
              <strong>[Lưu ý nội bộ]:</strong> Đây là văn bản mẫu cho hệ thống PolarisX CRM, cần được bộ phận pháp chế / luật sư rà soát trước khi công bố chính thức.
            </span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        {/* Tiêu đề & Thông tin cơ bản */}
        <div className="flex-1 max-w-3xl">
          {/* Badge phân loại */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 mb-4 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Văn bản pháp lý chính thức</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            {document.title}{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">
              PolarisX
            </span>
          </h1>

          <p className="mt-3 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            {document.subtitle}
          </p>

          {/* Badges thông tin phiên bản & thời gian hiệu lực */}
          <div className="mt-6 flex flex-wrap items-center gap-3 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 shadow-sm">
              <FileText className="w-3.5 h-3.5 text-blue-500" />
              Phiên bản: <strong className="font-bold text-blue-600 dark:text-blue-400">{document.version}</strong>
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Có hiệu lực từ: <strong>{document.effectiveDate}</strong>
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 shadow-sm">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              Cập nhật lần cuối: <strong>{document.lastUpdated}</strong>
            </span>
          </div>
        </div>

        {/* Mascot Cusi biểu tượng pháp lý */}
        <div className="flex-shrink-0 self-center md:self-auto p-3 rounded-3xl bg-white/60 dark:bg-slate-800/40 border border-white/60 dark:border-white/10 backdrop-blur-xl shadow-xl shadow-blue-900/5">
          <MascotCusiLegal variant={document.documentType} size={120} />
        </div>
      </div>
    </header>
  );
};
