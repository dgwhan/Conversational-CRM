import React, { useState, useEffect } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { notify } from '../../../../../../../components/feedback/toastEmitter.js';
import { apiClient } from '../../../../../../../lib/api-client/index.js';
import type { RuleDraft } from './types.js';

export interface KeywordRuleQuickAddFormProps {
  onSuccess: () => Promise<boolean | void>;
  prefillGroup?: string;
  onClearPrefillGroup?: () => void;
}

const PRESET_RULE_GROUPS = [
  'Quan tâm học phí',
  'Lộ trình đào tạo',
  'Cần tư vấn ngay',
  'Hẹn đăng ký',
  'Từ chối',
];

const initialRule: RuleDraft = {
  group: '',
  keyword: '',
  weight: 1,
  isActive: true,
  description: '',
};

export const KeywordRuleQuickAddForm: React.FC<KeywordRuleQuickAddFormProps> = ({
  onSuccess,
  prefillGroup,
  onClearPrefillGroup,
}) => {
  const [draft, setDraft] = useState<RuleDraft>(initialRule);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (prefillGroup) {
      setDraft((prev) => ({ ...prev, group: prefillGroup }));
      onClearPrefillGroup?.();
    }
  }, [prefillGroup, onClearPrefillGroup]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.group.trim() || !draft.keyword.trim()) {
      notify.error('Vui lòng nhập nhóm và từ khóa trước khi thêm tiêu chí.');
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.createKeywordRule({
        ...draft,
        group: draft.group.trim(),
        keyword: draft.keyword.trim(),
      });
      setDraft(initialRule);
      notify.success('Đã thêm tiêu chí chấm điểm mới.');
      await onSuccess();
    } catch (error: unknown) {
      notify.error(
        error instanceof Error
          ? error.message
          : 'Không thể thêm tiêu chí chấm điểm.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5 py-3 border-b border-slate-200">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-500">
          Thêm tiêu chí mới
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
        <div className="sm:col-span-4 min-w-0">
          <input
            type="text"
            placeholder="Nhóm (vd: Học phí, Khóa học)..."
            value={draft.group}
            onChange={(e) => setDraft((prev) => ({ ...prev, group: e.target.value }))}
            required
            maxLength={50}
            className="w-full h-9 rounded-md border border-slate-200/60 bg-slate-100/80 hover:bg-slate-100 focus:bg-white px-3 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none transition-all box-border"
          />
        </div>
        <div className="sm:col-span-4 min-w-0">
          <input
            type="text"
            placeholder="Từ khóa / Cụm từ nhận diện..."
            value={draft.keyword}
            onChange={(e) => setDraft((prev) => ({ ...prev, keyword: e.target.value }))}
            required
            maxLength={200}
            className="w-full h-9 rounded-md border border-slate-200/60 bg-slate-100/80 hover:bg-slate-100 focus:bg-white px-3 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none transition-all box-border"
          />
        </div>
        <div className="sm:col-span-2 min-w-0">
          <div className="relative flex items-center w-full">
            <input
              type="number"
              step="1"
              placeholder="Điểm (+10, -5)"
              value={draft.weight}
              onChange={(e) => setDraft((prev) => ({ ...prev, weight: Number(e.target.value) }))}
              required
              className="w-full h-9 rounded-md border border-slate-200/60 bg-slate-100/80 hover:bg-slate-100 focus:bg-white px-3 pr-10 text-xs font-bold tabular-nums text-slate-800 text-center focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none transition-all box-border"
            />
            <span className="absolute right-2.5 text-[11px] font-medium text-slate-400 select-none pointer-events-none">
              điểm
            </span>
          </div>
        </div>
        <div className="sm:col-span-2 min-w-0 flex items-center">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex h-9 items-center justify-center gap-1.5 w-full rounded-md bg-blue-600 hover:bg-blue-700 text-white px-3 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer border-none shadow-2xs whitespace-nowrap shrink-0"
          >
            {isSaving ? (
              <Loader2 size={14} className="animate-spin shrink-0" />
            ) : (
              <Plus size={14} className="shrink-0" />
            )}
            <span className="truncate">{isSaving ? 'Đang thêm...' : 'Thêm tiêu chí'}</span>
          </button>
        </div>
      </div>

      {/* Nhóm mẫu gợi ý nhanh */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs text-slate-400">
        <span className="text-[11px] font-medium text-slate-500">Nhóm mẫu:</span>
        {PRESET_RULE_GROUPS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setDraft((prev) => ({ ...prev, group: preset }))}
            className="rounded bg-slate-100 hover:bg-slate-200/80 text-slate-600 px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer border-none"
          >
            {preset}
          </button>
        ))}
      </div>
    </form>
  );
};

