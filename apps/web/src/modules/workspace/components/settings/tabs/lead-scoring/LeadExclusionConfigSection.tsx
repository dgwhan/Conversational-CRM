import React, { useState } from 'react';
import {
  Save,
  Loader2,
  ChevronDown,
  ChevronRight,
  Sliders,
  AlertOctagon,
} from 'lucide-react';
import { Toggle, ConfigSubSectionHeader } from '../../../../../../components/ui/index.js';
import type { LeadScoringSettings } from '../../../../../../lib/api-client/keyword-rules.js';
import { TokenChipInput } from './common/index.js';

export interface LeadExclusionConfigSectionProps {
  settingsDraft: LeadScoringSettings;
  setSettingsDraft: React.Dispatch<React.SetStateAction<LeadScoringSettings | null>>;
  isOwner: boolean;
  isSaving: boolean;
  onSave: () => Promise<void>;
}

const PRESET_NEGATION_BEFORE = [
  'không',
  'chưa',
  'đừng',
  'chẳng',
  'không hề',
  'không muốn',
  'chưa có nhu cầu',
];
const PRESET_NEGATION_AFTER = ['đâu', 'gì đâu', 'hết', 'nữa đâu', 'lừa đảo', 'spam'];

export const LeadExclusionConfigSection: React.FC<LeadExclusionConfigSectionProps> = ({
  settingsDraft,
  setSettingsDraft,
  isOwner,
  isSaving,
  onSave,
}) => {
  const [showAdvancedParams, setShowAdvancedParams] = useState(false);

  const {
    ambiguityResolutionEnabled,
    exclusionThresholdWeight,
    exclusionPenaltyScore,
    negationTerms,
    negationPostTerms,
    negationWindowWords,
    ambiguityScoreGap,
    hotBoundaryMinMessages,
    shortMessageMaxWords,
  } = settingsDraft;

  return (
    <div className="space-y-6">
      {/* Hairline-Divided Two-Column Setting Rows */}
      <div className="divide-y divide-slate-200 border-b border-slate-200">
        {/* =========================================================================
            ROW 1: HIỆU CHỈNH TIN NHẮN SÁT NGƯỠNG & TIN NHẮN NGẮN (TOGGLE ROW)
           ========================================================================= */}
        <div className="py-6 flex flex-col md:flex-row md:items-start justify-between gap-4 md:gap-8">
          <div className="w-full md:w-72 shrink-0">
            <ConfigSubSectionHeader
              title="Hiệu chỉnh sát ngưỡng & Tin nhắn ngắn"
              help={{
                title: 'Hiệu chỉnh sát ngưỡng & Tin nhắn ngắn',
                description:
                  'Tự động kiểm tra độ tin cậy của thuật toán khi điểm tích lũy của khách hàng tiệm cận ranh giới giữa 2 hạng hoặc khi khách chỉ gửi các phản hồi cụt ngủn.',
                example:
                  "Khách hàng phản hồi cộc lốc 'ok' và đạt 9.5 điểm (tiệm cận ngưỡng HOT 10 điểm). Hệ thống giữ khách hàng ở hạng WARM và yêu cầu tối thiểu 3 tin nhắn tương tác trước khi tự động thăng hạng HOT.",
                rules: [
                  'Khoảng cách điểm sát ngưỡng kiểm tra độ tin cậy trước khi kích hoạt thăng hạng.',
                  'Bộ lọc tin nhắn ngắn loại trừ tính điểm từ các phản hồi cộc lốc hoặc không mang giá trị ngữ nghĩa.',
                  'Bảo vệ danh sách tư vấn, tránh gắn nhãn HOT vội vàng khi chưa đủ dữ liệu tương tác.',
                ],
              }}
            />
          </div>

          <div className="flex-1 flex items-center justify-between sm:justify-start gap-4">
            <Toggle
              checked={ambiguityResolutionEnabled}
              disabled={!isOwner}
              size="md"
              showStatusLabel
              labelOn="Đang bật"
              labelOff="Đang tắt"
              aria-label="Hiệu chỉnh tin nhắn sát ngưỡng & Tin nhắn ngắn"
              onChange={(checked) =>
                setSettingsDraft((prev) =>
                  prev ? { ...prev, ambiguityResolutionEnabled: checked } : null
                )
              }
            />
            <span className="text-xs text-slate-500 font-medium">
              {ambiguityResolutionEnabled
                ? 'Bảo vệ ranh giới xếp hạng, tránh gán nhầm hạng HOT khi thiếu dữ liệu'
                : 'Đang tắt hiệu chỉnh tự động'}
            </span>
          </div>
        </div>

        {/* =========================================================================
            ROW 2: NGƯỠNG TỰ ĐỘNG LOẠI TRỪ (AUTO-EXCLUSION THRESHOLD ROW)
           ========================================================================= */}
        <div className="py-6 flex flex-col md:flex-row md:items-start justify-between gap-4 md:gap-8">
          <div className="w-full md:w-72 shrink-0">
            <ConfigSubSectionHeader
              title="Ngưỡng tự động loại trừ"
              badge={<AlertOctagon size={14} className="text-rose-500 shrink-0" />}
              help={{
                title: 'Ngưỡng tự động loại trừ',
                description:
                  'Cơ chế sàng lọc tự động xếp khách hàng vào hạng Chưa tiềm năng ngay khi tổng trọng số tiêu cực từ các từ phủ định hoặc từ chối chạm mức giới hạn quy định.',
                example:
                  'Khách hàng liên tục nhắn từ chối hoặc phản hồi tiêu cực với tổng trọng số chạm mức -50 điểm. Hệ thống lập tức gán điểm loại trừ (-100 điểm) và chuyển vào hạng Chưa tiềm năng.',
                rules: [
                  'Khách hàng bị loại trừ sẽ không được phân bổ vào danh sách ca trực của tư vấn viên.',
                  'Hồ sơ loại trừ không kích hoạt thông báo SLA hay nhắc việc định kỳ.',
                  'Tư vấn viên vẫn có thể mở lại hội thoại và phân loại thủ công nếu khách hàng có nhu cầu trở lại.',
                ],
              }}
            />
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-700">
              <span className="text-slate-500 font-medium">Khi trọng số tiêu cực chạm mức</span>
              <div className="relative flex items-center w-28">
                <input
                  type="number"
                  step="1"
                  value={exclusionThresholdWeight}
                  disabled={!isOwner}
                  onChange={(e) =>
                    setSettingsDraft((prev) =>
                      prev ? { ...prev, exclusionThresholdWeight: Number(e.target.value) } : null
                    )
                  }
                  className="w-full h-9 px-3 pr-11 text-center text-xs font-bold tabular-nums text-slate-800 bg-slate-100/80 hover:bg-slate-100 focus:bg-white rounded-md border border-transparent focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none transition-all box-border"
                />
                <span className="absolute right-2.5 text-[11px] font-medium text-slate-400 select-none pointer-events-none">
                  điểm
                </span>
              </div>

              <span className="text-slate-500 font-medium">, gán điểm cuối của Lead thành</span>
              <div className="relative flex items-center w-28">
                <input
                  type="number"
                  step="1"
                  value={exclusionPenaltyScore}
                  disabled={!isOwner}
                  onChange={(e) =>
                    setSettingsDraft((prev) =>
                      prev ? { ...prev, exclusionPenaltyScore: Number(e.target.value) } : null
                    )
                  }
                  className="w-full h-9 px-3 pr-11 text-center text-xs font-bold tabular-nums text-slate-800 bg-slate-100/80 hover:bg-slate-100 focus:bg-white rounded-md border border-transparent focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none transition-all box-border"
                />
                <span className="absolute right-2.5 text-[11px] font-medium text-slate-400 select-none pointer-events-none">
                  điểm
                </span>
              </div>

              <span className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200/60 px-2 py-0.5 rounded-full font-medium">
                Loại trừ ngay lập tức
              </span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            ROW 3: TỪ PHỦ ĐỊNH ĐỨNG PHÍA TRƯỚC
           ========================================================================= */}
        <div className="py-6 flex flex-col md:flex-row md:items-start justify-between gap-4 md:gap-8">
          <div className="w-full md:w-72 shrink-0">
            <ConfigSubSectionHeader
              title="Từ phủ định đứng phía trước"
              help={{
                title: 'Từ phủ định đứng phía trước',
                description:
                  'Danh sách các từ hoặc cụm từ phủ định xuất hiện ngay trước từ khóa chính nhằm vô hiệu hóa điểm thưởng tương ứng của từ khóa đó.',
                example:
                  "Khách hàng gửi 'không quan tâm học phí'. Cụm từ 'không' xuất hiện trước từ khóa 'quan tâm' (+5 điểm) sẽ triệt tiêu điểm thưởng, tránh cộng điểm sai lệch.",
                rules: [
                  'Khoảng cách nhận diện phủ định quy định số từ tối đa giữa từ phủ định và từ khóa.',
                  'Hỗ trợ gõ từ tùy ý và nhấn Enter để thêm nhanh vào danh sách.',
                  'Hệ thống tự động loại bỏ khoảng trắng thừa và không phân biệt chữ hoa hay chữ thường.',
                ],
              }}
            />
          </div>

          <div className="flex-1">
            <TokenChipInput
              tokens={negationTerms}
              onChange={(newTokens) =>
                setSettingsDraft((prev) => (prev ? { ...prev, negationTerms: newTokens } : null))
              }
              presets={PRESET_NEGATION_BEFORE}
              disabled={!isOwner}
              placeholder="Gõ từ phủ định phía trước rồi nhấn Enter..."
            />
          </div>
        </div>

        {/* =========================================================================
            ROW 4: TỪ PHỦ ĐỊNH ĐỨNG PHÍA SAU
           ========================================================================= */}
        <div className="py-6 flex flex-col md:flex-row md:items-start justify-between gap-4 md:gap-8">
          <div className="w-full md:w-72 shrink-0">
            <ConfigSubSectionHeader
              title="Từ phủ định đứng phía sau"
              help={{
                title: 'Từ phủ định đứng phía sau',
                description:
                  'Danh sách các trợ từ hoặc cảm thán từ phủ định xuất hiện ngay sau từ khóa chính nhằm vô hiệu hóa trọng số cộng điểm của từ khóa đó.',
                example:
                  "Khách hàng gửi 'đăng ký gì đâu'. Cụm từ 'gì đâu' xuất hiện sau từ khóa 'đăng ký' (+10 điểm) sẽ vô hiệu hóa trọng số cộng điểm của từ khóa này.",
                rules: [
                  'Áp dụng cho các trợ từ hoặc cụm từ tiếng Việt biểu đạt ý phủ định sau vị ngữ.',
                  'Khoảng cách nhận diện tuân theo cấu hình khoảng cách từ đã thiết lập.',
                  'Có thể nhấp vào các thẻ gợi ý nhanh bên dưới để thêm các cụm từ phổ biến.',
                ],
              }}
            />
          </div>

          <div className="flex-1">
            <TokenChipInput
              tokens={negationPostTerms}
              onChange={(newTokens) =>
                setSettingsDraft((prev) =>
                  prev ? { ...prev, negationPostTerms: newTokens } : null
                )
              }
              presets={PRESET_NEGATION_AFTER}
              disabled={!isOwner}
              placeholder="Gõ từ phủ định phía sau rồi nhấn Enter..."
            />
          </div>
        </div>
      </div>

      {/* =========================================================================
          PROGRESSIVE DISCLOSURE: THAM SỐ THUẬT TOÁN NÂNG CAO
         ========================================================================= */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowAdvancedParams(!showAdvancedParams)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 transition-colors cursor-pointer border-none bg-transparent p-0 select-none"
        >
          <div className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-500">
            {showAdvancedParams ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
          <div className="flex items-center gap-1.5">
            <Sliders size={13} className="text-slate-400 shrink-0" />
            <span>Tùy chỉnh tham số thuật toán nâng cao</span>
          </div>
        </button>

        {showAdvancedParams && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3.5 rounded-lg bg-slate-50/80 border border-slate-200/80 p-4 animate-in fade-in duration-150">
            {/* Param 1: negationWindowWords */}
            <div className="flex items-center justify-between gap-3 p-3 bg-white rounded-md border border-slate-200/70 shadow-2xs">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-900">
                  Khoảng cách nhận diện phủ định
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                  Số từ tối đa giữa từ phủ định và từ khóa
                </div>
              </div>
              <div className="relative flex items-center w-28 shrink-0">
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={negationWindowWords}
                  disabled={!isOwner}
                  onChange={(e) =>
                    setSettingsDraft((prev) =>
                      prev ? { ...prev, negationWindowWords: Number(e.target.value) } : null
                    )
                  }
                  className="w-full h-9 px-3 pr-9 text-center text-xs font-bold tabular-nums text-slate-800 bg-slate-100/80 hover:bg-slate-100 focus:bg-white rounded-md border border-transparent focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none transition-all box-border"
                />
                <span className="absolute right-2.5 text-[11px] font-medium text-slate-400 select-none pointer-events-none">
                  từ
                </span>
              </div>
            </div>

            {/* Param 2: ambiguityScoreGap */}
            <div className="flex items-center justify-between gap-3 p-3 bg-white rounded-md border border-slate-200/70 shadow-2xs">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-900">
                  Khoảng điểm sát ngưỡng hiệu chỉnh
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                  Biên độ chênh lệch để kích hoạt kiểm tra
                </div>
              </div>
              <div className="relative flex items-center w-28 shrink-0">
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={ambiguityScoreGap}
                  disabled={!isOwner}
                  onChange={(e) =>
                    setSettingsDraft((prev) =>
                      prev ? { ...prev, ambiguityScoreGap: Number(e.target.value) } : null
                    )
                  }
                  className="w-full h-9 px-3 pr-11 text-center text-xs font-bold tabular-nums text-slate-800 bg-slate-100/80 hover:bg-slate-100 focus:bg-white rounded-md border border-transparent focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none transition-all box-border"
                />
                <span className="absolute right-2.5 text-[11px] font-medium text-slate-400 select-none pointer-events-none">
                  điểm
                </span>
              </div>
            </div>

            {/* Param 3: hotBoundaryMinMessages */}
            <div className="flex items-center justify-between gap-3 p-3 bg-white rounded-md border border-slate-200/70 shadow-2xs">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-900">
                  Số tin nhắn tối thiểu để lên HOT
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                  Số tin khách gửi để tránh gán nhầm
                </div>
              </div>
              <div className="relative flex items-center w-28 shrink-0">
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={hotBoundaryMinMessages}
                  disabled={!isOwner}
                  onChange={(e) =>
                    setSettingsDraft((prev) =>
                      prev ? { ...prev, hotBoundaryMinMessages: Number(e.target.value) } : null
                    )
                  }
                  className="w-full h-9 px-3 pr-12 text-center text-xs font-bold tabular-nums text-slate-800 bg-slate-100/80 hover:bg-slate-100 focus:bg-white rounded-md border border-transparent focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none transition-all box-border"
                />
                <span className="absolute right-2 text-[10px] font-medium text-slate-400 select-none pointer-events-none">
                  tin nhắn
                </span>
              </div>
            </div>

            {/* Param 4: shortMessageMaxWords */}
            <div className="flex items-center justify-between gap-3 p-3 bg-white rounded-md border border-slate-200/70 shadow-2xs">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-900">
                  Số từ tối đa yêu cầu kiểm tra tin ngắn
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                  Ngưỡng phát hiện tin nhắn cụt ngủn
                </div>
              </div>
              <div className="relative flex items-center w-28 shrink-0">
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={shortMessageMaxWords}
                  disabled={!isOwner}
                  onChange={(e) =>
                    setSettingsDraft((prev) =>
                      prev ? { ...prev, shortMessageMaxWords: Number(e.target.value) } : null
                    )
                  }
                  className="w-full h-9 px-3 pr-9 text-center text-xs font-bold tabular-nums text-slate-800 bg-slate-100/80 hover:bg-slate-100 focus:bg-white rounded-md border border-transparent focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none transition-all box-border"
                />
                <span className="absolute right-2.5 text-[11px] font-medium text-slate-400 select-none pointer-events-none">
                  từ
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Footer: Lưu cài đặt */}
      {isOwner && (
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void onSave()}
            className="rounded-md bg-blue-600 px-4 h-9 text-xs font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer border-none shadow-2xs inline-flex flex-row items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
          >
            {isSaving ? (
              <>
                <Loader2 size={14} className="animate-spin shrink-0" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Save size={14} className="shrink-0" />
                <span>Lưu cài đặt</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
