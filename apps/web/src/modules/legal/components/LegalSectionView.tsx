import React, { useState } from 'react';
import { Check, Info, Link as LinkIcon } from 'lucide-react';
import type { LegalSection } from '../types/legal.types.js';

export interface LegalSectionViewProps {
  section: LegalSection;
}

export const LegalSectionView: React.FC<LegalSectionViewProps> = ({ section }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#${section.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <section
      id={section.id}
      aria-labelledby={`heading-${section.id}`}
      className="scroll-mt-24 pt-8 pb-10 border-b border-slate-200/50 dark:border-slate-800/50 last:border-b-0"
    >
      {/* Heading with Copy Anchor Link */}
      <div className="group flex items-center justify-between gap-3 mb-4">
        <h2
          id={`heading-${section.id}`}
          className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight"
        >
          {section.title}
        </h2>
        <button
          type="button"
          onClick={handleCopyLink}
          aria-label={`Sao chép liên kết tới mục ${section.title}`}
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Sao chép liên kết mục này"
        >
          {copied ? (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <Check className="w-3.5 h-3.5" /> Đã chép
            </span>
          ) : (
            <LinkIcon className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Paragraphs */}
      {section.paragraphs && section.paragraphs.length > 0 && (
        <div className="space-y-3 mb-4 text-slate-600 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
          {section.paragraphs.map((p, idx) => (
            <p key={idx}>{p}</p>
          ))}
        </div>
      )}

      {/* List items */}
      {section.list && section.list.length > 0 && (
        <ul className="space-y-2 mb-4 pl-2 text-slate-600 dark:text-slate-300 text-sm sm:text-base">
          {section.list.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mt-2 flex-shrink-0" />
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Paragraphs After List/Table */}
      {section.paragraphsAfter && section.paragraphsAfter.length > 0 && (
        <div className="space-y-3 mb-4 text-slate-600 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
          {section.paragraphsAfter.map((p, idx) => (
            <p key={idx}>{p}</p>
          ))}
        </div>
      )}

      {/* Data Table */}
      {section.table && (
        <div className="my-6 overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md shadow-sm">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                {section.table.headers.map((header, hIdx) => (
                  <th key={hIdx} className="px-4 py-3 whitespace-nowrap">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
              {section.table.rows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className={`px-4 py-3 leading-relaxed text-slate-600 dark:text-slate-300 ${
                        cIdx === 0 ? 'font-semibold text-slate-900 dark:text-white' : ''
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Callout Note */}
      {section.note && (
        <div className="mt-4 p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/50 flex items-start gap-3 text-xs sm:text-sm text-blue-900 dark:text-blue-200">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed font-medium">{section.note}</p>
        </div>
      )}
    </section>
  );
};
