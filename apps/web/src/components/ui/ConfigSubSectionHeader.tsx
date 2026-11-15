import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, X, BookOpen } from 'lucide-react';

export interface ContextualHelpContent {
  title?: string;
  description: string;
  example?:
    | {
        label?: string;
        text: string;
      }
    | string;
  rules?: string[];
  tips?: string[];
}

export interface ConfigSubSectionHeaderProps {
  title: string;
  help?: ContextualHelpContent;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  titleClassName?: string;
  as?: 'h2' | 'h3' | 'h4' | 'div' | 'span';
  truncate?: boolean;
}

/**
 * Enterprise B2B SaaS Sub-Section Header with Progressive Disclosure
 * - Clean, crisp typography with zero emojis or decorative sparkle/bulb icons
 * - Flat visual hierarchy with single-layer callout (zero monospace prose)
 * - Opens professional Explanation Modal with documentation, scenarios, and operational rules
 */
export const ConfigSubSectionHeader: React.FC<ConfigSubSectionHeaderProps> = ({
  title,
  help,
  badge,
  actions,
  className = '',
  titleClassName = 'text-sm font-semibold text-slate-900',
  as: Component = 'h3',
  truncate = false,
}) => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Close modal on Escape
  useEffect(() => {
    if (!isHelpOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsHelpOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHelpOpen]);

  const exampleText =
    typeof help?.example === 'string'
      ? help.example
      : help?.example?.text;

  const exampleLabel =
    typeof help?.example === 'object' && help.example.label
      ? help.example.label
      : 'Tình huống minh họa';

  return (
    <>
      <div className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>
        <div className="inline-flex items-center gap-1.5 min-w-0 max-w-full">
          <Component
            className={`${titleClassName} m-0 leading-snug ${truncate ? 'truncate' : ''}`}
          >
            {title}
          </Component>
          {badge}
          {help && (
            <button
              type="button"
              onClick={() => setIsHelpOpen(true)}
              aria-label={`Trợ giúp: ${help.title || title}`}
              title="Xem hướng dẫn chi tiết và ví dụ"
              className="w-5 h-5 inline-flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer border-none bg-transparent shrink-0"
            >
              <HelpCircle size={14} />
            </button>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 max-w-full">{actions}</div>}
      </div>

      {/* Professional Contextual Help Modal */}
      {isHelpOpen &&
        help &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] bg-slate-900/20 backdrop-blur-[1px] flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsHelpOpen(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="help-modal-title"
              className="max-w-lg w-full bg-white rounded-xl border border-slate-200 shadow-xl p-6 relative animate-in zoom-in-95 duration-150 space-y-4 text-left"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-slate-200">
                <div className="min-w-0 flex items-start gap-2.5">
                  <BookOpen size={18} className="text-slate-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <h3
                      id="help-modal-title"
                      className="text-base font-semibold text-slate-950 m-0 truncate"
                    >
                      {help.title || title}
                    </h3>
                    <p className="text-xs text-slate-600 m-0 mt-0.5">
                      Hướng dẫn cấu hình & quy tắc vận hành
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsHelpOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer border-none bg-transparent shrink-0"
                  title="Đóng"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Structured Body (3 parts) */}
              <div className="space-y-4">
                {/* 1. Cơ chế hoạt động */}
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-900 uppercase tracking-wide block">
                    Cơ chế hoạt động
                  </span>
                  <p className="text-[13px] text-slate-700 leading-relaxed m-0">
                    {help.description}
                  </p>
                </div>

                {/* 2. Tình huống minh họa */}
                {exampleText && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-slate-900 uppercase tracking-wide block">
                      {exampleLabel}
                    </span>
                    <div className="bg-slate-50 border-l-2 border-blue-600 px-3.5 py-2.5 rounded-r-md text-[13px] leading-relaxed text-slate-700">
                      {exampleText}
                    </div>
                  </div>
                )}

                {/* 3. Nguyên tắc vận hành */}
                {help.rules && help.rules.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-900 uppercase tracking-wide block">
                      Nguyên tắc vận hành
                    </span>
                    <ul className="list-none m-0 p-0 space-y-2 text-[13px] text-slate-700">
                      {help.rules.map((rule, idx) => (
                        <li key={idx} className="flex items-start gap-2 leading-relaxed">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0" />
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsHelpOpen(false)}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-md h-9 px-4 text-[13px] font-medium transition-colors cursor-pointer border-none shadow-2xs"
                >
                  Đã hiểu
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
