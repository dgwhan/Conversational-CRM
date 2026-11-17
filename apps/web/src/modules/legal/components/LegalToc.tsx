import React, { useState } from 'react';
import { ChevronDown, List } from 'lucide-react';
import type { LegalSection } from '../types/legal.types.js';

export interface LegalTocProps {
  sections: LegalSection[];
  activeId: string;
  onSelect: (id: string) => void;
}

export const LegalToc: React.FC<LegalTocProps> = ({ sections, activeId, onSelect }) => {
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);
  const activeSection = sections.find((s) => s.id === activeId) || sections[0];

  const handleSelect = (id: string) => {
    onSelect(id);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Collapsible Selector */}
      <div className="xl:hidden sticky top-14 z-20 mb-6 -mx-4 px-4 py-2.5 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <button
          type="button"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="flex w-full items-center justify-between py-2 text-sm font-medium text-slate-800"
          aria-expanded={isMobileOpen}
        >
          <span className="flex items-center gap-2 truncate">
            <List className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span className="truncate">
              Đang xem: <strong className="font-semibold">{activeSection?.title}</strong>
            </span>
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-500 transition-transform ${
              isMobileOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isMobileOpen && (
          <div className="mt-2 max-h-64 overflow-y-auto border-y border-slate-200 bg-white py-1">
            {sections.map((section) => {
              const isActive = section.id === activeId;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => handleSelect(section.id)}
                  className={`w-full text-left px-2 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {section.title}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop Right-Hand Section Switcher */}
      <aside className="hidden xl:block w-60 flex-shrink-0 sticky top-14 py-10 pl-4">
        <div className="text-xs font-semibold text-slate-900 mb-3">
          Nội dung văn bản
        </div>
        <ul className="space-y-2 border-l border-slate-200 text-xs" role="tablist">
          {sections.map((section) => {
            const isActive = section.id === activeId;
            return (
              <li key={section.id} role="presentation">
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleSelect(section.id)}
                  className={`w-full text-left pl-3 -ml-px border-l-2 transition-colors leading-snug ${
                    isActive
                      ? 'border-slate-900 text-slate-900 font-semibold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {section.title}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>
    </>
  );
};
