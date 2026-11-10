import React, { useState } from 'react';
import { ChevronDown, ChevronRight, List, Bookmark } from 'lucide-react';
import type { LegalSection } from '../types/legal.types.js';
import { scrollToSection } from '../hooks/useActiveSection.js';

export interface LegalTocProps {
  sections: LegalSection[];
  activeId: string;
}

export const LegalToc: React.FC<LegalTocProps> = ({ sections, activeId }) => {
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  const activeSection = sections.find((s) => s.id === activeId) || sections[0];

  const handleSelect = (id: string) => {
    scrollToSection(id, 80);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Collapsible Dropdown (hiển thị trên màn hình nhỏ) */}
      <div className="lg:hidden sticky top-16 z-30 mb-8 -mx-4 px-4 py-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 shadow-sm">
        <button
          type="button"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 text-xs font-bold text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
          aria-expanded={isMobileOpen}
          aria-label="Mở mục lục văn bản"
        >
          <div className="flex items-center gap-2 truncate">
            <List className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="truncate">
              Mục lục: <strong>{activeSection?.title || 'Chọn mục'}</strong>
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-500 transition-transform ${
              isMobileOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isMobileOpen && (
          <div className="mt-2 max-h-60 overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 shadow-xl divide-y divide-slate-100 dark:divide-slate-800">
            {sections.map((section) => {
              const isActive = section.id === activeId;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => handleSelect(section.id)}
                  className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate">{section.title}</span>
                  {isActive && <Bookmark className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop Sticky Sidebar Table of Contents */}
      <aside className="hidden lg:block w-72 flex-shrink-0">
        <nav
          aria-label="Mục lục văn bản pháp lý"
          className="sticky top-24 p-5 rounded-3xl bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-lg shadow-blue-950/5 max-h-[calc(100vh-8rem)] flex flex-col"
        >
          <div className="flex items-center gap-2 pb-3 mb-2 border-b border-slate-200/60 dark:border-slate-800/60">
            <List className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Mục lục nội dung
            </span>
          </div>

          <div className="overflow-y-auto pr-1 space-y-1 text-xs">
            {sections.map((section) => {
              const isActive = section.id === activeId;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => handleSelect(section.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between group ${
                    isActive
                      ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20 translate-x-1'
                      : 'text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span className="truncate pr-2">{section.title}</span>
                  <ChevronRight
                    className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${
                      isActive ? 'opacity-100 translate-x-0.5' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </nav>
      </aside>
    </>
  );
};
