import React, { useMemo } from 'react';
import { Save, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type {
  ConversationTier,
  LeadScoringSettings,
} from '../../../../../../lib/api-client/keyword-rules.js';

export interface LeadTierConfigMatrixProps {
  settingsDraft: LeadScoringSettings;
  setSettingsDraft: React.Dispatch<React.SetStateAction<LeadScoringSettings | null>>;
  isOwner: boolean;
  isSaving: boolean;
  onSave: () => Promise<void>;
}

interface TierMeta {
  tier: ConversationTier;
  code: string;
  defaultLabel: string;
  dotColor: string;
  badgeStyle: string;
  rangeTint: string;
}

const TIER_ORDER: TierMeta[] = [
  {
    tier: 'HOT',
    code: 'HOT',
    defaultLabel: 'Ưu tiên cao',
    dotColor: 'bg-rose-500',
    badgeStyle: 'text-rose-700 bg-rose-50 border-rose-200/70',
    rangeTint: 'bg-rose-50/70 text-rose-800 border-rose-200/50',
  },
  {
    tier: 'WARM',
    code: 'WARM',
    defaultLabel: 'Đang quan tâm',
    dotColor: 'bg-amber-500',
    badgeStyle: 'text-amber-700 bg-amber-50 border-amber-200/70',
    rangeTint: 'bg-amber-50/70 text-amber-800 border-amber-200/50',
  },
  {
    tier: 'COLD',
    code: 'COLD',
    defaultLabel: 'Mới tiếp cận',
    dotColor: 'bg-sky-500',
    badgeStyle: 'text-sky-700 bg-sky-50 border-sky-200/70',
    rangeTint: 'bg-sky-50/70 text-sky-800 border-sky-200/50',
  },
  {
    tier: 'IRRELEVANT',
    code: 'IRRELEVANT',
    defaultLabel: 'Chưa tiềm năng',
    dotColor: 'bg-slate-400',
    badgeStyle: 'text-slate-600 bg-slate-100 border-slate-200/70',
    rangeTint: 'bg-slate-100/70 text-slate-700 border-slate-200/50',
  },
];

export const LeadTierConfigMatrix: React.FC<LeadTierConfigMatrixProps> = ({
  settingsDraft,
  setSettingsDraft,
  isOwner,
  isSaving,
  onSave,
}) => {
  const { hotMinScore, warmMinScore, coldMinScore, tierLabels, tierRecommendations } =
    settingsDraft;

  // Validation: Check if thresholds overlap or are out of order
  const isOrderValid = hotMinScore > warmMinScore && warmMinScore > coldMinScore;

  // Previews for the Visual Range Bar
  const previewRanges = useMemo(() => {
    return [
      {
        meta: TIER_ORDER[3], // IRRELEVANT
        label: tierLabels.IRRELEVANT || 'Chưa tiềm năng',
        rangeText: `< ${coldMinScore}đ`,
      },
      {
        meta: TIER_ORDER[2], // COLD
        label: tierLabels.COLD || 'Mới tiếp cận',
        rangeText:
          coldMinScore >= warmMinScore
            ? `${coldMinScore}đ`
            : `${coldMinScore} – ${warmMinScore - 1}đ`,
      },
      {
        meta: TIER_ORDER[1], // WARM
        label: tierLabels.WARM || 'Đang quan tâm',
        rangeText:
          warmMinScore >= hotMinScore
            ? `${warmMinScore}đ`
            : `${warmMinScore} – ${hotMinScore - 1}đ`,
      },
      {
        meta: TIER_ORDER[0], // HOT
        label: tierLabels.HOT || 'Ưu tiên cao',
        rangeText: `≥ ${hotMinScore}đ`,
      },
    ];
  }, [hotMinScore, warmMinScore, coldMinScore, tierLabels]);

  const handleUpdateLabel = (tier: ConversationTier, newLabel: string) => {
    setSettingsDraft((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        tierLabels: {
          ...prev.tierLabels,
          [tier]: newLabel,
        },
      };
    });
  };

  const handleUpdateRecommendation = (tier: ConversationTier, newRec: string) => {
    setSettingsDraft((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        tierRecommendations: {
          ...prev.tierRecommendations,
          [tier]: newRec,
        },
      };
    });
  };

  const handleUpdateScore = (tier: 'HOT' | 'WARM' | 'COLD', score: number) => {
    setSettingsDraft((prev) => {
      if (!prev) return null;
      if (tier === 'HOT') return { ...prev, hotMinScore: score };
      if (tier === 'WARM') return { ...prev, warmMinScore: score };
      if (tier === 'COLD') return { ...prev, coldMinScore: score };
      return prev;
    });
  };

  return (
    <div className="space-y-5">
      {/* =========================================================================
          1. VISUAL SCORE RANGE PREVIEW STRIP (TOP SUMMARY)
         ========================================================================= */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-500">
            Trực quan hóa dải điểm phân loại
          </span>
          {isOrderValid ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
              <CheckCircle2 size={12} className="shrink-0" />
              Ngưỡng điểm hợp lệ
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] text-rose-600 font-semibold">
              <AlertTriangle size={12} className="shrink-0" />
              Ngưỡng điểm không hợp lệ
            </span>
          )}
        </div>

        {/* Dynamic Visual Strip */}
        <div className="rounded-lg overflow-hidden flex flex-col sm:flex-row border border-slate-200/90 bg-white text-xs divide-y sm:divide-y-0 sm:divide-x divide-slate-200 shadow-2xs">
          {previewRanges.map(({ meta, label, rangeText }) => (
            <div
              key={meta.code}
              className={`flex-1 p-2.5 flex items-center justify-between sm:justify-start gap-2.5 ${meta.rangeTint} transition-all`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-full ${meta.dotColor} shrink-0`} />
                <span className="font-bold text-[11px] tabular-nums shrink-0">{rangeText}:</span>
                <span className="font-medium text-xs truncate">{label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Inline warning validation if order overlaps */}
        {!isOrderValid && (
          <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700 animate-in fade-in">
            <AlertTriangle size={14} className="text-rose-600 shrink-0" />
            <span>
              <strong>Lỗi thứ tự ngưỡng điểm:</strong> Mức điểm sàn bắt buộc phải tuân theo thứ tự
              giảm dần: <strong>HOT (≥{hotMinScore}) &gt; WARM (≥{warmMinScore}) &gt; COLD (≥{coldMinScore})</strong>.
            </span>
          </div>
        )}
      </div>

      {/* =========================================================================
          2. MERGED UNIFIED FLAT CONFIGURATION MATRIX TABLE
         ========================================================================= */}
      <div className="w-full overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-2xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              <th className="py-2.5 px-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-36">
                Màu nhận diện
              </th>
              <th className="py-2.5 px-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-52">
                Tên hiển thị
              </th>
              <th className="py-2.5 px-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-36 text-center">
                Điểm tối thiểu
              </th>
              <th className="py-2.5 px-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 min-w-[280px]">
                Khuyến nghị cho tư vấn viên
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {TIER_ORDER.map((meta) => {
              const { tier, code, defaultLabel, dotColor } = meta;
              const currentLabel = tierLabels[tier] ?? defaultLabel;
              const currentRec = tierRecommendations[tier] ?? '';

              return (
                <tr key={code} className="hover:bg-slate-50/60 transition-colors">
                  {/* 1. Màu sắc trạng thái: Dot */}
                  <td className="w-12 py-3 px-3 align-middle text-center">
                    <div className="flex items-center justify-center">
                      <span className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0`} />
                    </div>
                  </td>

                  {/* 2. Tên hiển thị: Compact Soft-filled Text Input */}
                  <td className="py-3 px-3.5 align-middle">
                    <input
                      type="text"
                      value={currentLabel}
                      disabled={!isOwner}
                      onChange={(e) => handleUpdateLabel(tier, e.target.value)}
                      placeholder={defaultLabel}
                      maxLength={50}
                      className="w-full h-9 px-3 bg-slate-100/80 hover:bg-slate-100 focus:bg-white rounded-md border border-slate-200/60 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-xs font-semibold text-slate-900 outline-none transition-all box-border"
                    />
                  </td>

                  {/* 3. Điểm tối thiểu: Compact Numeric Input with ≥ prefix and điểm suffix */}
                  <td className="py-3 px-3.5 align-middle">
                    {tier === 'IRRELEVANT' ? (
                      <div className="w-full h-9 px-2 flex items-center justify-center rounded-md bg-slate-100/50 border border-slate-200/40 text-slate-400 text-xs font-medium select-none">
                        &lt; {coldMinScore} điểm
                      </div>
                    ) : (
                      <div className="relative flex items-center w-full">
                        <span className="absolute left-2.5 text-xs font-bold text-slate-400 select-none pointer-events-none">
                          ≥
                        </span>
                        <input
                          type="number"
                          step="1"
                          disabled={!isOwner}
                          value={
                            tier === 'HOT'
                              ? hotMinScore
                              : tier === 'WARM'
                                ? warmMinScore
                                : coldMinScore
                          }
                          onChange={(e) => handleUpdateScore(tier, Number(e.target.value))}
                          className="w-full h-9 pl-6 pr-11 text-center text-xs font-bold tabular-nums text-slate-800 bg-slate-100/80 hover:bg-slate-100 focus:bg-white rounded-md border border-slate-200/60 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none transition-all box-border"
                        />
                        <span className="absolute right-2 text-[11px] font-medium text-slate-400 select-none pointer-events-none">
                          điểm
                        </span>
                      </div>
                    )}
                  </td>

                  {/* 4. Khuyến nghị cho tư vấn viên: Single-line Soft-filled Input */}
                  <td className="py-3 px-3.5 align-middle">
                    <input
                      type="text"
                      value={currentRec}
                      disabled={!isOwner}
                      onChange={(e) => handleUpdateRecommendation(tier, e.target.value)}
                      placeholder="Hướng dẫn hành động cho tư vấn viên khi khách đạt hạng này..."
                      maxLength={300}
                      className="w-full h-9 px-3 bg-slate-100/80 hover:bg-slate-100 focus:bg-white rounded-md border border-slate-200/60 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-xs font-normal text-slate-800 outline-none transition-all box-border"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* =========================================================================
          3. ACTION FOOTER: LƯU CẤU HÌNH PRIMARY BUTTON
         ========================================================================= */}
      {isOwner && (
        <div className="pt-4 pb-12 border-t border-slate-200 flex items-center justify-between">
          <p className="text-xs text-slate-500 m-0">
            Các thay đổi sẽ được áp dụng tự động cho toàn bộ hội thoại mới trong Workspace.
          </p>
          <button
            type="button"
            disabled={isSaving || !isOrderValid}
            onClick={() => void onSave()}
            className="rounded-md bg-blue-600 px-4 h-9 text-xs font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer border-none shadow-2xs inline-flex flex-row items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
          >
            {isSaving ? (
              <>
                <Loader2 size={14} className="animate-spin shrink-0" />
                <span>Đang lưu cấu hình...</span>
              </>
            ) : (
              <>
                <Save size={14} className="shrink-0" />
                <span>Lưu cấu hình</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
