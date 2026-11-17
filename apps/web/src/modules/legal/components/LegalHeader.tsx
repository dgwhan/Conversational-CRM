import React from 'react';
import { AlertCircle } from 'lucide-react';
import type { LegalDocument } from '../types/legal.types.js';

export interface LegalHeaderProps {
  document: LegalDocument;
}

export const LegalHeader: React.FC<LegalHeaderProps> = ({ document }) => {
  return (
    <header className="pb-8 border-b border-slate-200">
      {/* Dev Mode Notice (Phẳng, không bo tròn quá mức) */}
      {import.meta.env.DEV && (
        <div className="mb-6 flex items-start gap-2.5 border-l-2 border-amber-500 py-1 pl-3 text-sm leading-6 text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <span>
            <strong className="font-semibold">Lưu ý nội bộ:</strong> Đây là văn bản mẫu cho hệ thống PolarisX CRM, cần được bộ phận pháp chế / luật sư rà soát trước khi công bố chính thức.
          </span>
        </div>
      )}

      <div className="mb-2 text-sm font-semibold text-slate-600">
        Trung tâm Pháp lý &amp; Tuân thủ
      </div>

      <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-4xl">
        {document.title}
      </h1>

      <p className="mt-3 text-lg leading-7 text-slate-700">
        {document.subtitle}
      </p>

      {/* Metadata gộp thành 1 dòng text sạch sẽ */}
      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
        <span>
          Phiên bản <strong className="font-semibold text-slate-950">{document.version}</strong>
        </span>
        <span aria-hidden="true">•</span>
        <span>
          Có hiệu lực từ <strong className="font-semibold text-slate-950">{document.effectiveDate}</strong>
        </span>
        <span aria-hidden="true">•</span>
        <span>
          Cập nhật lần cuối <strong className="font-semibold text-slate-950">{document.lastUpdated}</strong>
        </span>
      </div>
    </header>
  );
};
