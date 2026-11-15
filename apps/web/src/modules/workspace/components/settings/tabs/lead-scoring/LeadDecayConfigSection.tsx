import React, { useMemo } from 'react';
import { Save, Loader2, Clock, ArrowRight, ShieldCheck } from 'lucide-react';
import { ConfigSubSectionHeader } from '../../../../../../components/ui/index.js';
import type { LeadScoringSettings } from '../../../../../../lib/api-client/keyword-rules.js';

export interface LeadDecayConfigSectionProps {
  settingsDraft: LeadScoringSettings;
  setSettingsDraft: React.Dispatch<React.SetStateAction<LeadScoringSettings | null>>;
  isOwner: boolean;
  isSaving: boolean;
  onSave: () => Promise<void>;
}

export const LeadDecayConfigSection: React.FC<LeadDecayConfigSectionProps> = ({
  settingsDraft,
  setSettingsDraft,
  isOwner,
  isSaving,
  onSave,
}) => {
  const {
    phoneBonusScore,
    inactivityDecayDays,
    inactivityDecayPoints,
    inactivityDecayIntervalDays,
    inactivityDecayWeeklyPoints,
  } = settingsDraft;

  // Live timeline progression calculations (starting from 10 points)
  const simulation = useMemo(() => {
    const baseScore = 10;
    const day1 = Math.max(1, inactivityDecayDays || 1);
    const score1 = Math.max(0, baseScore - (inactivityDecayPoints || 0));

    const cycle = Math.max(1, inactivityDecayIntervalDays || 1);
    const day2 = day1 + cycle;
    const score2 = Math.max(0, score1 - (inactivityDecayWeeklyPoints || 0));

    const day3 = day2 + cycle;
    const score3 = Math.max(0, score2 - (inactivityDecayWeeklyPoints || 0));

    return {
      baseScore,
      day1,
      score1,
      drop1: inactivityDecayPoints || 0,
      day2,
      score2,
      drop2: inactivityDecayWeeklyPoints || 0,
      day3,
      score3,
      drop3: inactivityDecayWeeklyPoints || 0,
    };
  }, [
    inactivityDecayDays,
    inactivityDecayPoints,
    inactivityDecayIntervalDays,
    inactivityDecayWeeklyPoints,
  ]);

  return (
    <div className="space-y-6">
      {/* Hairline-Divided Two-Column Setting Rows */}
      <div className="divide-y divide-slate-200 border-b border-slate-200">
        {/* =========================================================================
            ROW 1: ĐIỂM THƯỞNG KHI CÓ SỐ ĐIỆN THOẠI (CONTACT BONUS)
           ========================================================================= */}
        <div className="py-6 flex flex-col md:flex-row md:items-start gap-4 md:gap-8">
          {/* Left Column: Title with Contextual Help Modal */}
          <div className="w-full md:w-72 shrink-0">
            <ConfigSubSectionHeader
              title="Điểm thưởng khi có số điện thoại"
              help={{
                title: 'Điểm thưởng khi có số điện thoại',
                description:
                  'Tự động cộng thêm điểm ưu tiên ngay khi khách hàng để lại số điện thoại liên lạc hợp lệ qua nội dung trao đổi.',
                example:
                  "Khách hàng gửi tin nhắn chứa số điện thoại '0912345678'. Hệ thống tự động nhận diện và cộng ngay +15 điểm thưởng vào hồ sơ khách hàng.",
                rules: [
                  'Điểm thưởng số điện thoại chỉ được cộng duy nhất 1 lần cho mỗi khách hàng.',
                  'Hệ thống tự động chuẩn hóa định dạng số điện thoại Việt Nam (10 chữ số).',
                  'Giúp khách hàng nhanh chóng đạt ngưỡng HOT để tư vấn viên ưu tiên gọi điện sớm.',
                ],
              }}
            />
          </div>

          {/* Right Column: Compact Soft-filled Numeric Input */}
          <div className="flex-1 flex items-center">
            <div className="relative flex items-center w-36">
              <span className="absolute left-3 text-xs font-bold text-emerald-600 select-none pointer-events-none">
                +
              </span>
              <input
                type="number"
                step="1"
                min="0"
                value={phoneBonusScore}
                disabled={!isOwner}
                onChange={(e) =>
                  setSettingsDraft((prev) =>
                    prev ? { ...prev, phoneBonusScore: Number(e.target.value) } : null
                  )
                }
                className="w-full h-9 pl-7 pr-12 text-center text-xs font-bold tabular-nums text-slate-800 bg-slate-100/80 hover:bg-slate-100 focus:bg-white rounded-md border border-slate-200/60 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none transition-all box-border"
              />
              <span className="absolute right-3 text-[11px] font-medium text-slate-400 select-none pointer-events-none">
                điểm
              </span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            ROW 2: GIẢM ĐIỂM DO KHÔNG TƯƠNG TÁC (INACTIVITY TIME DECAY)
           ========================================================================= */}
        <div className="py-6 flex flex-col md:flex-row md:items-start gap-4 md:gap-8">
          {/* Left Column: Title with Contextual Help Modal */}
          <div className="w-full md:w-72 shrink-0">
            <ConfigSubSectionHeader
              title="Giảm điểm do không tương tác"
              help={{
                title: 'Giảm điểm do không tương tác',
                description:
                  'Cơ chế tự động khấu trừ điểm số của khách hàng nếu sau một khoảng thời gian nhất định không có tin nhắn tương tác mới.',
                example:
                  'Khách hàng không phản hồi sau 7 ngày. Hệ thống bắt đầu trừ 2 điểm, và tiếp tục trừ 2 điểm sau mỗi chu kỳ 7 ngày tiếp theo nếu vẫn không có tin nhắn mới.',
                rules: [
                  'Số ngày bắt đầu: Thời gian chờ tối thiểu từ tin nhắn cuối cùng trước khi bắt đầu trừ điểm.',
                  'Chu kỳ giảm thêm: Khoảng thời gian định kỳ giữa các lần trừ điểm tiếp theo.',
                  'Điểm số sau khi giảm trừ sẽ không hạ xuống dưới mức điểm sàn tối thiểu của hệ thống (0 điểm).',
                ],
              }}
            />
          </div>

          {/* Right Column: Compact Inline Controls & Timeline Simulation */}
          <div className="flex-1 space-y-4">
            {/* Sub-row 1: Lần trừ đầu tiên */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-700">
              <span className="font-medium text-slate-800 min-w-[125px]">
                Lần trừ đầu tiên:
              </span>
              <span className="text-slate-500">Sau</span>
              <div className="relative flex items-center w-28">
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={inactivityDecayDays}
                  disabled={!isOwner}
                  onChange={(e) =>
                    setSettingsDraft((prev) =>
                      prev ? { ...prev, inactivityDecayDays: Number(e.target.value) } : null
                    )
                  }
                  className="w-full h-9 px-3 pr-11 text-center text-xs font-bold tabular-nums text-slate-800 bg-slate-100/80 hover:bg-slate-100 focus:bg-white rounded-md border border-slate-200/60 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none transition-all box-border"
                />
                <span className="absolute right-2.5 text-[11px] font-medium text-slate-400 select-none pointer-events-none">
                  ngày
                </span>
              </div>
              <span className="text-slate-500">im lặng, trừ</span>
              <div className="relative flex items-center w-28">
                <span className="absolute left-2.5 text-xs font-bold text-rose-500 select-none pointer-events-none">
                  -
                </span>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={inactivityDecayPoints}
                  disabled={!isOwner}
                  onChange={(e) =>
                    setSettingsDraft((prev) =>
                      prev ? { ...prev, inactivityDecayPoints: Number(e.target.value) } : null
                    )
                  }
                  className="w-full h-9 pl-6 pr-11 text-center text-xs font-bold tabular-nums text-slate-800 bg-slate-100/80 hover:bg-slate-100 focus:bg-white rounded-md border border-slate-200/60 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none transition-all box-border"
                />
                <span className="absolute right-2.5 text-[11px] font-medium text-slate-400 select-none pointer-events-none">
                  điểm
                </span>
              </div>
            </div>

            {/* Sub-row 2: Chu kỳ định kỳ sau đó */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-700">
              <span className="font-medium text-slate-800 min-w-[125px]">
                Chu kỳ định kỳ sau đó:
              </span>
              <span className="text-slate-500">Cứ mỗi</span>
              <div className="relative flex items-center w-28">
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={inactivityDecayIntervalDays}
                  disabled={!isOwner}
                  onChange={(e) =>
                    setSettingsDraft((prev) =>
                      prev ? { ...prev, inactivityDecayIntervalDays: Number(e.target.value) } : null
                    )
                  }
                  className="w-full h-9 px-3 pr-11 text-center text-xs font-bold tabular-nums text-slate-800 bg-slate-100/80 hover:bg-slate-100 focus:bg-white rounded-md border border-slate-200/60 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none transition-all box-border"
                />
                <span className="absolute right-2.5 text-[11px] font-medium text-slate-400 select-none pointer-events-none">
                  ngày
                </span>
              </div>
              <span className="text-slate-500">tiếp theo, trừ tiếp</span>
              <div className="relative flex items-center w-28">
                <span className="absolute left-2.5 text-xs font-bold text-rose-500 select-none pointer-events-none">
                  -
                </span>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={inactivityDecayWeeklyPoints}
                  disabled={!isOwner}
                  onChange={(e) =>
                    setSettingsDraft((prev) =>
                      prev ? { ...prev, inactivityDecayWeeklyPoints: Number(e.target.value) } : null
                    )
                  }
                  className="w-full h-9 pl-6 pr-11 text-center text-xs font-bold tabular-nums text-slate-800 bg-slate-100/80 hover:bg-slate-100 focus:bg-white rounded-md border border-slate-200/60 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none transition-all box-border"
                />
                <span className="absolute right-2.5 text-[11px] font-medium text-slate-400 select-none pointer-events-none">
                  điểm
                </span>
              </div>
            </div>

            {/* Live Decay Timeline Simulation Strip */}
            <div className="mt-3 p-3.5 bg-slate-50/90 border border-slate-200/80 rounded-lg space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-500">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <Clock size={13} className="text-slate-400 shrink-0" />
                  <span>Mô phỏng giảm điểm thực tế (Lead khởi điểm 10 điểm)</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <ShieldCheck size={12} className="text-blue-500 shrink-0" />
                  <span>Tự động tính theo cấu hình</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {/* Step 0: Ngày 0 */}
                <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200/80 px-2.5 py-1.5 rounded-md shadow-2xs">
                  <span className="text-slate-500 font-medium">Ngày 0:</span>
                  <span className="font-bold text-slate-900 tabular-nums">10 điểm</span>
                  <span className="text-[10px] text-slate-400">(Bắt đầu)</span>
                </div>

                <ArrowRight size={13} className="text-slate-400 shrink-0" />

                {/* Step 1: Lần trừ đầu tiên */}
                <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200/80 px-2.5 py-1.5 rounded-md shadow-2xs">
                  <span className="text-slate-500 font-medium">Ngày {simulation.day1}:</span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {simulation.score1} điểm
                  </span>
                  <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-1 py-0.2 rounded border border-rose-100">
                    -{simulation.drop1}đ
                  </span>
                </div>

                <ArrowRight size={13} className="text-slate-400 shrink-0" />

                {/* Step 2: Chu kỳ 1 */}
                <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200/80 px-2.5 py-1.5 rounded-md shadow-2xs">
                  <span className="text-slate-500 font-medium">Ngày {simulation.day2}:</span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {simulation.score2} điểm
                  </span>
                  <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-1 py-0.2 rounded border border-rose-100">
                    -{simulation.drop2}đ
                  </span>
                </div>

                <ArrowRight size={13} className="text-slate-400 shrink-0" />

                {/* Step 3: Chu kỳ 2 */}
                <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200/80 px-2.5 py-1.5 rounded-md shadow-2xs">
                  <span className="text-slate-500 font-medium">Ngày {simulation.day3}:</span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {simulation.score3} điểm
                  </span>
                  <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-1 py-0.2 rounded border border-rose-100">
                    -{simulation.drop3}đ
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer: Lưu cài đặt Button */}
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

