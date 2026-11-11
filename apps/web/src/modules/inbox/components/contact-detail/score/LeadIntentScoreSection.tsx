import React, { useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import type { ChatMessage, ConversationClassificationData, ConversationTier } from '../../../types.js';
import { evaluateConversationScore } from '../../../utils/leadScoringUtils.js';
import { Modal } from '../../../../../components/ui/Modal.js';
import { useLeadScoringConfig } from '../../../context/leadScoringConfig.js';

interface LeadIntentScoreSectionProps {
  messages?: ChatMessage[];
  customerPhone?: string;
}

const tierStyles: Record<ConversationTier, { badge: string; bar: string }> = {
  HOT: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', bar: 'bg-emerald-500' },
  WARM: { badge: 'bg-slate-100 text-slate-700 border-slate-200/80', bar: 'bg-slate-400' },
  COLD: { badge: 'bg-slate-100 text-slate-600 border-slate-200/80', bar: 'bg-slate-300' },
  IRRELEVANT: { badge: 'bg-slate-100 text-slate-500 border-slate-200/80', bar: 'bg-slate-200' },
};

export const LeadIntentScoreSection: React.FC<LeadIntentScoreSectionProps> = ({
  messages = [],
  customerPhone,
}) => {
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);
  const { rules, settings, isLoading } = useLeadScoringConfig();

  const data: ConversationClassificationData | null = useMemo(() => {
    if (!settings) return null;
    return evaluateConversationScore(messages, customerPhone, rules, settings);
  }, [messages, customerPhone, rules, settings]);

  if (!settings || !data) {
    return (
      <div className="bg-white p-4 text-xs text-slate-500">
        {isLoading ? 'Đang tải cấu hình đánh giá...' : 'Chưa có cấu hình đánh giá cho không gian làm việc này.'}
      </div>
    );
  }

  const tierStyle = tierStyles[data.tier];
  const progressPercent = Math.min(100, Math.max(data.score > 0 ? 8 : 0, (data.score / settings.hotMinScore) * 100));
  const activeRules = rules.filter((rule) => rule.isActive);

  return (
    <div className="space-y-2.5 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex shrink-0 items-center gap-1.5">
          <h4 className="m-0 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Đánh giá tiềm năng
          </h4>
          <button
            type="button"
            onClick={() => setIsExplanationOpen(true)}
            className="cursor-pointer rounded p-0.5 text-slate-400 transition-colors hover:text-slate-700"
            title="Xem cấu hình đánh giá"
            aria-label="Cấu hình đánh giá tiềm năng"
          >
            <AlertCircle size={13} />
          </button>
        </div>
        <span className={`shrink-0 whitespace-nowrap rounded border px-2 py-0.5 text-xs font-medium ${tierStyle.badge}`}>
          {settings.tierLabels[data.tier]}
        </span>
      </div>

      <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-300 ${tierStyle.bar}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {data.reasons.length > 0 && (
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Tiêu chí ghi nhận:</span>
            <span className="text-slate-400">Tự động nhận diện</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.reasons.map((reason, index) => (
              <span
                key={`${reason.keyword}-${index}`}
                className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
              >
                {reason.keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="m-0 pt-0.5 text-xs leading-relaxed text-slate-500">
        <span className="font-medium text-slate-700">Khuyến nghị: </span>
        {settings.tierRecommendations[data.tier]}
      </p>

      <Modal
        isOpen={isExplanationOpen}
        onClose={() => setIsExplanationOpen(false)}
        title="Cấu hình đánh giá tiềm năng"
        size="lg"
        showCloseButton
        primaryAction={{
          label: 'Đã hiểu',
          onClick: () => setIsExplanationOpen(false),
          variant: 'primary',
        }}
      >
        <div className="space-y-4 text-xs leading-relaxed text-slate-600">
          <section className="space-y-2">
            <h5 className="m-0 text-xs font-semibold uppercase tracking-wider text-slate-900">
              Tiêu chí từ khóa đang áp dụng
            </h5>
            {activeRules.length ? (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[400px] border-collapse text-left">
                  <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Nhóm</th>
                      <th className="px-3 py-2">Từ khóa</th>
                      <th className="px-3 py-2 text-right">Trọng số</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {activeRules.map((rule) => (
                      <tr key={rule.id}>
                        <td className="px-3 py-2">{rule.group}</td>
                        <td className="px-3 py-2">
                          <div>{rule.keyword}</div>
                          {rule.description && <div className="text-[10px] text-slate-400">{rule.description}</div>}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">{rule.weight > 0 ? `+${rule.weight}` : rule.weight}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="m-0 rounded-lg bg-slate-50 p-3">
                Chưa có từ khóa tùy chỉnh. Điểm hiện tại chỉ áp dụng các thiết lập số liệu bên dưới.
              </p>
            )}
          </section>

          <section className="space-y-2">
            <h5 className="m-0 text-xs font-semibold uppercase tracking-wider text-slate-900">
              Ngưỡng phân loại và điểm số
            </h5>
            <ul className="m-0 list-disc space-y-1 pl-4">
              {(['HOT', 'WARM', 'COLD', 'IRRELEVANT'] as ConversationTier[]).map((tier) => (
                <li key={tier}>
                  <span className="font-medium text-slate-800">{settings.tierLabels[tier]}</span>
                  {tier !== 'IRRELEVANT' && (
                    <>: từ {settings[`${tier.toLowerCase()}MinScore` as 'hotMinScore' | 'warmMinScore' | 'coldMinScore']} điểm</>
                  )}
                  {' — '}
                  {settings.tierRecommendations[tier]}
                </li>
              ))}
              <li>Điểm thưởng khi có số điện thoại: {settings.phoneBonusScore}</li>
              <li>Tiêu chí có trọng số từ {settings.exclusionThresholdWeight} trở xuống sẽ loại trừ.</li>
            </ul>
          </section>

          <p className="m-0 text-[11px] text-slate-500">
            Văn bản được so khớp không phân biệt dấu tiếng Việt. Nhóm, từ khóa, trọng số, ngưỡng và nội dung hiển thị do chủ sở hữu workspace quản lý.
          </p>
        </div>
      </Modal>
    </div>
  );
};
