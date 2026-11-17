import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Printer } from 'lucide-react';
import type { LegalDocument } from '../types/legal.types.js';
import { LegalHeader } from './LegalHeader.js';
import { LegalToc } from './LegalToc.js';
import { LegalQuickSummary } from './LegalQuickSummary.js';
import { LegalSectionView } from './LegalSectionView.js';

export interface LegalLayoutProps {
  document: LegalDocument;
}

export const LegalLayout: React.FC<LegalLayoutProps> = ({ document }) => {
  const location = useLocation();

  // Lấy mục đầu tiên hoặc mục theo URL hash
  const getInitialSectionId = () => {
    const hashId = location.hash.replace('#', '');
    if (hashId && document.sections.some((s) => s.id === hashId)) {
      return hashId;
    }
    return document.sections[0]?.id ?? '';
  };

  const [selectedSectionId, setSelectedSectionId] = useState<string>(getInitialSectionId);

  // Cập nhật lại mục đang chọn khi chuyển đổi giữa /privacy và /terms
  useEffect(() => {
    setSelectedSectionId(getInitialSectionId());
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname, document]);

  const currentIndex = document.sections.findIndex((s) => s.id === selectedSectionId);
  const activeIndex = currentIndex >= 0 ? currentIndex : 0;
  const activeSection = document.sections[activeIndex];
  const prevSection = activeIndex > 0 ? document.sections[activeIndex - 1] : null;
  const nextSection =
    activeIndex < document.sections.length - 1 ? document.sections[activeIndex + 1] : null;

  const handleSelectSection = (id: string) => {
    setSelectedSectionId(id);
    window.history.replaceState(window.history.state, '', `${location.pathname}#${id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isPrivacy = document.documentType === 'privacy';

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased">
      {/* 1. Minimalist Docs Top Bar */}
      <header className="sticky top-0 z-30 h-14 border-b border-slate-200 bg-white/95 backdrop-blur-sm no-print">
        <div className="max-w-[1400px] mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-sm">
            <Link to="/" className="font-semibold tracking-tight text-slate-900">
              PolarisX
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500">Tài liệu pháp lý</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => window.print()}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              In mục này
            </button>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Về trang chủ
            </Link>
          </div>
        </div>
      </header>

      {/* 2. 3-Column Docs Container */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 flex items-start">
        {/* Cột trái: Điều hướng danh mục văn bản */}
        <aside className="hidden lg:block w-60 flex-shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] border-r border-slate-200 py-10 pr-6 no-print">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2.5">
            Văn bản pháp lý
          </div>
          <nav className="space-y-1" aria-label="Danh mục văn bản pháp lý">
            <Link
              to="/privacy"
              className={`block px-2.5 py-1.5 text-sm rounded-md transition-colors ${
                isPrivacy
                  ? 'bg-slate-100 text-slate-900 font-medium'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Chính sách bảo mật
            </Link>
            <Link
              to="/terms"
              className={`block px-2.5 py-1.5 text-sm rounded-md transition-colors ${
                !isPrivacy
                  ? 'bg-slate-100 text-slate-900 font-medium'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Điều khoản dịch vụ
            </Link>
          </nav>
        </aside>

        {/* Cột giữa: Chỉ hiển thị nội dung của mục đang chọn */}
        <main id="main-content" className="flex-1 min-w-0 py-8 sm:py-10 lg:px-14 max-w-3xl">
          {/* Mobile TOC */}
          <div className="xl:hidden no-print">
            <LegalToc
              sections={document.sections}
              activeId={activeSection?.id ?? ''}
              onSelect={handleSelectSection}
            />
          </div>

          <LegalHeader document={document} />

          {/* Chỉ hiện Tóm tắt nhanh khi đang ở mục đầu tiên (Mục 1) để tránh chiếm diện tích khi xem các mục sau */}
          {activeIndex === 0 && <LegalQuickSummary items={document.quickSummary} />}

          {/* Render duy nhất mục đang được chọn */}
          {activeSection && (
            <div role="tabpanel" className="min-h-[320px]">
              <LegalSectionView section={activeSection} />
            </div>
          )}

          {/* Điều hướng Mục trước / Mục tiếp theo chuẩn Docs (Prev / Next Pagination) */}
          <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 no-print">
            {prevSection ? (
              <button
                type="button"
                onClick={() => handleSelectSection(prevSection.id)}
                className="group flex flex-col items-start py-3 pr-3 text-left transition-colors hover:text-[#0969DA]"
              >
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 group-hover:text-slate-600">
                  <ArrowLeft className="w-3 h-3" /> Mục trước
                </span>
                <span className="mt-1 text-sm font-semibold text-slate-900 line-clamp-1">
                  {prevSection.title}
                </span>
              </button>
            ) : (
              <div />
            )}

            {nextSection ? (
              <button
                type="button"
                onClick={() => handleSelectSection(nextSection.id)}
                className="group flex flex-col items-end py-3 pl-3 text-right transition-colors hover:text-[#0969DA]"
              >
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 group-hover:text-slate-600">
                  Mục tiếp theo <ArrowRight className="w-3 h-3" />
                </span>
                <span className="mt-1 text-sm font-semibold text-slate-900 line-clamp-1">
                  {nextSection.title}
                </span>
              </button>
            ) : (
              <Link
                to={isPrivacy ? '/terms' : '/privacy'}
                className="group flex flex-col items-end py-3 pl-3 text-right transition-colors hover:text-[#0969DA]"
              >
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 group-hover:text-slate-600">
                  Văn bản tiếp theo <ArrowRight className="w-3 h-3" />
                </span>
                <span className="mt-1 text-sm font-semibold text-slate-900">
                  {isPrivacy ? 'Điều khoản dịch vụ' : 'Chính sách bảo mật'}
                </span>
              </Link>
            )}
          </div>
        </main>

        {/* Cột phải: Danh sách mục để click chuyển nội dung */}
        <div className="no-print">
          <LegalToc
            sections={document.sections}
            activeId={activeSection?.id ?? ''}
            onSelect={handleSelectSection}
          />
        </div>
      </div>

      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          main {
            max-width: 100% !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};
