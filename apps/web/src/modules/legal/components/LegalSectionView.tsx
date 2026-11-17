import React from 'react';
import type { LegalSection } from '../types/legal.types.js';

export interface LegalSectionViewProps {
  section: LegalSection;
}

const renderFormattedLinks = (text: string): React.ReactNode => {
  const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = markdownLinkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const [, label, url] = match;
    parts.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-[#0969DA] hover:underline transition-colors"
      >
        {label}
      </a>
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
};

const renderEmphasizedLead = (text: string): React.ReactNode => {
  const colonIndex = text.indexOf(':');
  // Bỏ qua nếu dấu ':' thuộc về "https://"
  const isUrlColon = text.slice(colonIndex, colonIndex + 3) === '://';

  if (colonIndex <= 0 || colonIndex > 72 || isUrlColon) {
    return renderFormattedLinks(text);
  }

  return (
    <>
      <strong className="font-semibold text-slate-900">{text.slice(0, colonIndex + 1)}</strong>
      {renderFormattedLinks(text.slice(colonIndex + 1))}
    </>
  );
};

export const LegalSectionView: React.FC<LegalSectionViewProps> = ({ section }) => {
  return (
    <section
      id={section.id}
      aria-labelledby={`heading-${section.id}`}
      className="pt-8 pb-4"
    >
      {/* Heading */}
      <h2
        id={`heading-${section.id}`}
        className="mb-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-[1.75rem]"
      >
        {section.title}
      </h2>

      {/* Paragraphs */}
      {section.paragraphs && section.paragraphs.length > 0 && (
        <div className="mb-5 space-y-4 text-base leading-7 text-slate-700">
          {section.paragraphs.map((p, idx) => (
            <p key={idx}>{renderEmphasizedLead(p)}</p>
          ))}
        </div>
      )}

      {/* List items */}
      {section.list && section.list.length > 0 && (
        <ul className="mb-5 list-disc space-y-3 pl-5 text-base leading-7 text-slate-700 marker:text-slate-400">
          {section.list.map((item, idx) => (
            <li key={idx}>{renderEmphasizedLead(item)}</li>
          ))}
        </ul>
      )}

      {/* Paragraphs After List/Table */}
      {section.paragraphsAfter && section.paragraphsAfter.length > 0 && (
        <div className="mb-5 space-y-4 text-base leading-7 text-slate-700">
          {section.paragraphsAfter.map((p, idx) => (
            <p key={idx}>{renderEmphasizedLead(p)}</p>
          ))}
        </div>
      )}

      {/* Flat Data Table */}
      {section.table && (
        <div className="my-7 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-y border-slate-300 bg-slate-50 text-xs font-bold text-slate-800">
              <tr>
                {section.table.headers.map((header, hIdx) => (
                  <th key={hIdx} className="px-4 py-2.5 whitespace-nowrap">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {section.table.rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50/60 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className={`px-4 py-3 leading-relaxed text-slate-600 ${
                        cIdx === 0 ? 'font-semibold text-slate-900' : ''
                      }`}
                    >
                      {renderFormattedLinks(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Left-Border Callout Note */}
      {section.note && (
        <div className="mt-6 border-l-2 border-[#0969DA] py-1 pl-4 text-base leading-7 text-slate-700">
          <strong className="font-semibold text-slate-950">Lưu ý: </strong>
          {renderFormattedLinks(section.note)}
        </div>
      )}
    </section>
  );
};