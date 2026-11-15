import React from 'react';
import { Edit2, Trash2, Check, Loader2, Eye, EyeOff } from 'lucide-react';
import type { KeywordRuleItem } from '../../../../../../../lib/api-client/keyword-rules.js';
import type { RuleDraft } from './types.js';
import { KeywordWeightBadge } from './KeywordWeightBadge.js';

export interface KeywordRuleRowProps {
  rule: KeywordRuleItem;
  isOwner: boolean;
  isSelected: boolean;
  isEditing: boolean;
  editingDraft: RuleDraft;
  isSavingEdit: boolean;
  onToggleSelect: (id: string) => void;
  onToggleActive: (rule: KeywordRuleItem) => void;
  onStartEdit: (rule: KeywordRuleItem) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string) => void;
  onDraftChange: (patch: Partial<RuleDraft>) => void;
  onDelete: (rule: KeywordRuleItem) => void;
}

export const KeywordRuleRow: React.FC<KeywordRuleRowProps> = ({
  rule,
  isOwner,
  isSelected,
  isEditing,
  editingDraft,
  isSavingEdit,
  onToggleSelect,
  onToggleActive,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDraftChange,
  onDelete,
}) => {
  // Inline editing mode: expands full row in the grid for comfortable editing
  if (isEditing) {
    return (
      <div className="col-span-1 md:col-span-2 lg:col-span-3 p-2 bg-blue-50/60 rounded-md border border-blue-200 flex flex-wrap items-center gap-2 animate-in fade-in">
        <input
          type="text"
          value={editingDraft.keyword}
          onChange={(e) => onDraftChange({ keyword: e.target.value })}
          placeholder="Từ khóa..."
          maxLength={200}
          className="flex-1 min-w-[140px] h-7 bg-white rounded border border-slate-300 px-2 text-xs font-medium text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          autoFocus
        />
        <input
          type="number"
          step="1"
          value={editingDraft.weight}
          onChange={(e) => onDraftChange({ weight: Number(e.target.value) })}
          placeholder="Điểm"
          className="w-16 h-7 bg-white rounded border border-slate-300 px-1 text-center text-xs font-semibold tabular-nums text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        />
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            disabled={isSavingEdit}
            onClick={() => onSaveEdit(rule.id)}
            className="h-7 px-2.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium inline-flex items-center gap-1 cursor-pointer border-none shadow-2xs"
          >
            {isSavingEdit ? (
              <Loader2 size={12} className="animate-spin shrink-0" />
            ) : (
              <Check size={12} className="shrink-0" />
            )}
            <span>Lưu</span>
          </button>
          <button
            type="button"
            onClick={onCancelEdit}
            className="h-7 px-2 rounded bg-white hover:bg-slate-100 text-slate-600 text-xs font-medium cursor-pointer border border-slate-200"
          >
            Hủy
          </button>
        </div>
      </div>
    );
  }

  // Normal mode: high-density compact flat tile in 3-column grid
  return (
    <div
      className={`h-9 px-2.5 rounded-md flex items-center justify-between gap-2 transition-colors border select-none ${
        isSelected
          ? 'bg-blue-50/80 border-blue-200 shadow-2xs'
          : rule.isActive
          ? 'bg-slate-50 hover:bg-slate-100/90 border-transparent hover:border-slate-200/60'
          : 'bg-slate-50/50 hover:bg-slate-100/70 border-dashed border-slate-200/80 opacity-75'
      }`}
    >
      {/* Left side: Checkbox + Weight Tag + Truncated Keyword */}
      <div className="flex items-center gap-2 min-w-0">
        {isOwner && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(rule.id)}
            aria-label={`Chọn từ khóa ${rule.keyword}`}
            className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer shrink-0"
          />
        )}

        <KeywordWeightBadge weight={rule.weight} />

        <span
          className={`text-[13px] truncate ${
            rule.isActive
              ? 'font-medium text-slate-900'
              : 'line-through text-slate-400 font-normal'
          }`}
          title={rule.keyword}
        >
          {rule.keyword}
        </span>
      </div>

      {/* Right side: Lightweight hover/inline icon actions */}
      <div className="flex items-center gap-0.5 shrink-0">
        {/* Quick status toggle button */}
        <button
          type="button"
          onClick={() => onToggleActive(rule)}
          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer border-none bg-transparent flex items-center justify-center"
          title={rule.isActive ? 'Tắt từ khóa' : 'Bật từ khóa'}
        >
          {rule.isActive ? (
            <Eye size={13} className="text-slate-400 hover:text-slate-600" />
          ) : (
            <EyeOff size={13} className="text-amber-500" />
          )}
        </button>

        {/* Ghost Edit & Delete icon buttons */}
        {isOwner && (
          <>
            <button
              type="button"
              onClick={() => onStartEdit(rule)}
              className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer border-none bg-transparent flex items-center justify-center"
              title="Chỉnh sửa từ khóa"
            >
              <Edit2 size={13} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(rule)}
              className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-rose-50 transition-colors cursor-pointer border-none bg-transparent flex items-center justify-center"
              title="Xóa từ khóa"
            >
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
