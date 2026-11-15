import React from 'react';
import { CheckSquare, Check, X, Trash2 } from 'lucide-react';

export interface KeywordBulkActionBarProps {
  selectedCount: number;
  isBulkOperating: boolean;
  onBulkToggleActive: (active: boolean) => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
}

export const KeywordBulkActionBar: React.FC<KeywordBulkActionBarProps> = ({
  selectedCount,
  isBulkOperating,
  onBulkToggleActive,
  onBulkDelete,
  onClearSelection,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2 bg-blue-50/95 backdrop-blur-xs border border-blue-200 text-slate-800 rounded-md shadow-xs transition-all my-2 animate-in fade-in slide-in-from-top-1">
      {/* Left: Selected count */}
      <div className="flex items-center gap-2 text-xs font-medium text-slate-800">
        <CheckSquare size={14} className="text-blue-600 shrink-0" />
        <span>
          Đã chọn <strong className="text-blue-900 font-semibold">{selectedCount}</strong> từ khóa
        </span>
      </div>

      {/* Right: Light-tinted Action Buttons */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onBulkToggleActive(true)}
          disabled={isBulkOperating}
          className="inline-flex flex-row items-center justify-center gap-1 h-7 px-2.5 text-xs font-medium rounded bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
        >
          <Check size={12} className="text-emerald-600 shrink-0" />
          <span>Bật</span>
        </button>

        <button
          type="button"
          onClick={() => onBulkToggleActive(false)}
          disabled={isBulkOperating}
          className="inline-flex flex-row items-center justify-center gap-1 h-7 px-2.5 text-xs font-medium rounded bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
        >
          <X size={12} className="text-amber-600 shrink-0" />
          <span>Tắt</span>
        </button>

        <button
          type="button"
          onClick={onBulkDelete}
          disabled={isBulkOperating}
          className="inline-flex flex-row items-center justify-center gap-1 h-7 px-2.5 text-xs font-medium rounded bg-white border border-red-200 text-red-600 hover:bg-red-50 shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
        >
          <Trash2 size={12} className="shrink-0" />
          <span>Xóa</span>
        </button>

        <button
          type="button"
          onClick={onClearSelection}
          disabled={isBulkOperating}
          className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 transition-colors cursor-pointer bg-transparent border-none"
        >
          Bỏ chọn
        </button>
      </div>
    </div>
  );
};
