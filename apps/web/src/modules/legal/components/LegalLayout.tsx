import React, { useMemo, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUp, ArrowRightLeft, Printer } from 'lucide-react';
import type { LegalDocument } from '../types/legal.types.js';
import { useActiveSection } from '../hooks/useActiveSection.js';
import { useScrollProgress, useLandingTheme } from '../../landing/hooks/useLandingInteractions.js';
import { LandingNavbar } from '../../landing/components/LandingNavbar.js';
import { LandingFooter } from '../../landing/components/LandingFooter.js';
import { LegalHeader } from './LegalHeader.js';
import { LegalToc } from './LegalToc.js';
import { LegalQuickSummary } from './LegalQuickSummary.js';
import { LegalSectionView } from './LegalSectionView.js';

export interface LegalLayoutProps {
  document: LegalDocument;
}

export const LegalLayout: React.FC<LegalLayoutProps> = ({ document }) => {
  const { isDark, toggleTheme } = useLandingTheme();
  const scrollProgress = useScrollProgress();
  const location = useLocation();

  // Tự động scroll lên đỉnh trang khi chuyển trang sang Privacy hoặc Terms
  useEffect(() => {
    if (location.hash) {
      const targetId = location.hash.replace('#', '');
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  const sectionIds = useMemo(() => document.sections.map((s) => s.id), [document.sections]);
  const activeSectionId = useActiveSection(sectionIds, 120);

  const isPrivacy = document.documentType === 'privacy';
  const otherPageUrl = isPrivacy ? '/terms' : '/privacy';
  const otherPageTitle = isPrivacy ? 'Xem Điều khoản dịch vụ' : 'Xem Chính sách bảo mật';

  const handlePrint = () => {
    window.print();
  };

  const handleBackToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-800 dark:text-slate-100 font-sans antialiased relative transition-colors duration-300">
      {/* 1. Thanh tiến trình đọc (Reading Progress Bar) */}
      <div
        className="fixed top-0 left-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-400 z-50 transition-all duration-75 no-print"
        style={{ width: `${scrollProgress * 100}%` }}
        role="progressbar"
        aria-valuenow={Math.round(scrollProgress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Tiến trình đọc tài liệu"
      />

      {/* 2. Sticky Glass Navbar tái sử dụng từ Landing */}
      <div className="no-print">
        <LandingNavbar isDark={isDark} onToggleTheme={toggleTheme} />
      </div>

      {/* 3. Header tài liệu pháp lý */}
      <LegalHeader document={document} />

      {/* 4. Thân trang: Bố cục 2 cột (Desktop) và 1 cột (Mobile) */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="flex flex-col lg:flex-row gap-12 items-start">
          {/* Cột trái: Mục lục nội dung (Table of Contents) */}
          <div className="w-full lg:w-auto no-print">
            <LegalToc sections={document.sections} activeId={activeSectionId} />
          </div>

          {/* Cột phải: Toàn văn tài liệu với độ rộng tối ưu khoảng 72ch */}
          <article className="flex-1 w-full max-w-[76ch] mx-auto lg:mx-0">
            {/* Tóm tắt nhanh các điểm quan trọng */}
            <LegalQuickSummary items={document.quickSummary} />

            {/* Danh sách các phần điều khoản / chính sách */}
            <div className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
              {document.sections.map((section) => (
                <LegalSectionView key={section.id} section={section} />
              ))}
            </div>

            {/* Thanh công cụ phụ cuối bài (Print, Switch page, Back to top) */}
            <div className="mt-12 pt-8 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 no-print">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  In văn bản này
                </button>

                <Link
                  to={otherPageUrl}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100/60 transition-colors shadow-sm"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  {otherPageTitle}
                </Link>
              </div>

              <button
                type="button"
                onClick={handleBackToTop}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <ArrowUp className="w-3.5 h-3.5" />
                Về đầu trang
              </button>
            </div>
          </article>
        </div>
      </main>

      {/* 5. Footer tái sử dụng */}
      <div className="no-print">
        <LandingFooter />
      </div>

      {/* Print stylesheet - ẩn navbar, footer, mục lục khi in ấn */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          article {
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};
