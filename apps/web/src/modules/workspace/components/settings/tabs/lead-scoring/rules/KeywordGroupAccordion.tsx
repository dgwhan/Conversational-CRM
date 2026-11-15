import React from 'react';
import {
  ChevronRight,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  MinusSquare,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { KeywordRuleItem } from '../../../../../../../lib/api-client/keyword-rules.js';
import type { RuleDraft } from './types.js';
import { PAGE_SIZE } from './constants.js';
import { KeywordRuleRow } from './KeywordRuleRow.js';

export interface KeywordGroupAccordionProps {
  groupName: string;
  groupRules: KeywordRuleItem[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  isOwner: boolean;
  selectedRuleIds: Set<string>;
  onToggleSelectGroup: (rules: KeywordRuleItem[]) => void;
  onQuickAddPrefill?: (groupName: string) => void;
  onGroupToggleAll: (groupName: string, rules: KeywordRuleItem[]) => void;
  onGroupDeleteAll: (groupName: string, rules: KeywordRuleItem[]) => void;
  isBulkOperating: boolean;
  visibleLimit: number;
  onShowMore: () => void;
  onCollapseItems: () => void;
  editingRuleId: string | null;
  editingRuleDraft: RuleDraft;
  isSavingEdit: boolean;
  onToggleSelectRule: (id: string) => void;
  onToggleSingleRule: (rule: KeywordRuleItem) => void;
  onStartEditRule: (rule: KeywordRuleItem) => void;
  onCancelEditRule: () => void;
  onSaveEditRule: (id: string) => void;
  onDraftChange: (patch: Partial<RuleDraft>) => void;
  onDeleteSingleRule: (rule: KeywordRuleItem) => void;
}

export const KeywordGroupAccordion: React.FC<KeywordGroupAccordionProps> = ({
  groupName,
  groupRules,
  isExpanded,
  onToggleExpand,
  isOwner,
  selectedRuleIds,
  onToggleSelectGroup,
  onQuickAddPrefill,
  onGroupToggleAll,
  onGroupDeleteAll,
  isBulkOperating,
  visibleLimit,
  onShowMore,
  onCollapseItems,
  editingRuleId,
  editingRuleDraft,
  isSavingEdit,
  onToggleSelectRule,
  onToggleSingleRule,
  onStartEditRule,
  onCancelEditRule,
  onSaveEditRule,
  onDraftChange,
  onDeleteSingleRule,
}) => {
  const visibleRules = groupRules.slice(0, visibleLimit);
  const remainingCount = groupRules.length - visibleRules.length;
  const groupActiveCount = groupRules.filter((r) => r.isActive).length;

  const allGroupSelected =
    groupRules.length > 0 && groupRules.every((r) => selectedRuleIds.has(r.id));
  const someGroupSelected =
    groupRules.some((r) => selectedRuleIds.has(r.id)) && !allGroupSelected;

  return (
    <div className="border-b border-slate-200 py-3 last:border-b-0">
      {/* 1. Flattened Group Accordion Header directly on canvas */}
      <div
        onClick={onToggleExpand}
        className="flex items-center justify-between gap-3 py-1 cursor-pointer select-none group"
      >
        {/* Left: Checkbox, Chevron, Title & Count Metadata */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Multi-select Checkbox for Entire Group */}
          {isOwner && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelectGroup(groupRules);
              }}
              className="text-slate-400 hover:text-slate-700 cursor-pointer shrink-0 p-0.5"
              title={allGroupSelected ? 'Bỏ chọn cả nhóm' : 'Chọn toàn bộ nhóm này'}
            >
              {allGroupSelected ? (
                <CheckSquare size={15} className="text-blue-600" />
              ) : someGroupSelected ? (
                <MinusSquare size={15} className="text-blue-600" />
              ) : (
                <Square size={15} />
              )}
            </div>
          )}

          {/* Accordion Chevron */}
          <div className="text-slate-400 shrink-0">
            <ChevronRight
              size={15}
              className={`transition-transform duration-200 ${
                isExpanded ? 'rotate-90 text-slate-700' : 'text-slate-400'
              }`}
            />
          </div>

          {/* Group Title */}
          <span className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
            {groupName}
          </span>

          {/* Count & Status Metadata */}
          <span className="text-xs text-slate-500 font-normal shrink-0">
            • {groupRules.length} từ khóa
          </span>
          <span className="hidden sm:inline text-[11px] text-slate-400 font-normal shrink-0">
            ({groupActiveCount} bật • {groupRules.length - groupActiveCount} tắt)
          </span>
        </div>

        {/* Right: Group-Level Quick Actions */}
        <div
          className="flex items-center gap-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Quick Add To This Group */}
          {isOwner && onQuickAddPrefill && (
            <button
              type="button"
              onClick={() => onQuickAddPrefill(groupName)}
              className="text-slate-400 hover:text-blue-600 p-1.5 rounded hover:bg-slate-100 transition-colors cursor-pointer border-none bg-transparent"
              title={`Thêm từ khóa vào nhóm "${groupName}"`}
            >
              <Plus size={14} />
            </button>
          )}

          {/* Group Bulk Toggle Button */}
          {isOwner && (
            <button
              type="button"
              onClick={() => onGroupToggleAll(groupName, groupRules)}
              disabled={isBulkOperating}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded hover:bg-slate-100 transition-colors cursor-pointer border-none bg-transparent"
              title={
                groupActiveCount === groupRules.length
                  ? `Tắt toàn bộ từ khóa trong nhóm "${groupName}"`
                  : `Bật toàn bộ từ khóa trong nhóm "${groupName}"`
              }
            >
              {groupActiveCount === groupRules.length ? (
                <EyeOff size={14} />
              ) : (
                <Eye size={14} />
              )}
            </button>
          )}

          {/* Group Delete All */}
          {isOwner && (
            <button
              type="button"
              onClick={() => onGroupDeleteAll(groupName, groupRules)}
              disabled={isBulkOperating}
              className="text-slate-400 hover:text-red-500 p-1.5 rounded hover:bg-rose-50 transition-colors cursor-pointer border-none bg-transparent"
              title={`Xóa toàn bộ nhóm "${groupName}"`}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Responsive 3-Column Compact Keyword Grid */}
      {isExpanded && (
        <div className="pt-2 pb-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 py-1">
            {visibleRules.map((rule) => (
              <KeywordRuleRow
                key={rule.id}
                rule={rule}
                isOwner={isOwner}
                isSelected={selectedRuleIds.has(rule.id)}
                isEditing={editingRuleId === rule.id}
                editingDraft={editingRuleDraft}
                isSavingEdit={isSavingEdit}
                onToggleSelect={onToggleSelectRule}
                onToggleActive={onToggleSingleRule}
                onStartEdit={onStartEditRule}
                onCancelEdit={onCancelEditRule}
                onSaveEdit={onSaveEditRule}
                onDraftChange={onDraftChange}
                onDelete={onDeleteSingleRule}
              />
            ))}
          </div>

          {/* 3. Windowing / Pagination Footer */}
          {groupRules.length > PAGE_SIZE && (
            <div className="py-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 mt-2">
              <span>
                Hiển thị{' '}
                <strong className="text-slate-700 font-semibold">
                  {visibleRules.length}
                </strong>{' '}
                / {groupRules.length} từ khóa
              </span>
              <div className="flex items-center gap-2">
                {remainingCount > 0 ? (
                  <button
                    type="button"
                    onClick={onShowMore}
                    className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700 bg-white hover:bg-slate-50 border border-slate-200 rounded px-2.5 py-1 transition-colors cursor-pointer shadow-2xs"
                  >
                    <span>
                      Hiển thị thêm (+{Math.min(PAGE_SIZE, remainingCount)} từ khóa)
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onCollapseItems}
                    className="text-slate-500 hover:text-slate-800 underline text-xs cursor-pointer bg-transparent border-none"
                  >
                    Thu gọn về {PAGE_SIZE} từ khóa
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
