import React, { useEffect, useState } from 'react';
import { notify } from '../../../../../components/feedback/toastEmitter.js';
import type { LeadScoringSettings } from '../../../../../lib/api-client/keyword-rules.js';
import { apiClient } from '../../../../../lib/api-client/index.js';
import { useLeadScoringConfig } from '../../../../inbox/context/leadScoringConfig.js';
import { ConfigSubSectionHeader } from '../../../../../components/ui/ConfigSubSectionHeader.js';
import {
  KeywordRulesManager,
  KeywordRuleQuickAddForm,
  LeadTierConfigMatrix,
  LeadDecayConfigSection,
  LeadExclusionConfigSection,
} from './lead-scoring/index.js';

export type LeadScoringSubSectionId = 'rules' | 'thresholds' | 'decay' | 'exclusion';

export interface LeadScoringTabProps {
  isOwner: boolean;
  hideSidebar?: boolean;
  activeSection?: LeadScoringSubSectionId;
  onSectionChange?: (section: LeadScoringSubSectionId) => void;
}

const SUBSECTIONS: { id: LeadScoringSubSectionId; label: string }[] = [
  { id: 'rules', label: 'Tiêu chí & Từ khóa' },
  { id: 'thresholds', label: 'Ngưỡng & Hạng Lead' },
  { id: 'decay', label: 'Điểm thưởng & Giảm điểm' },
  { id: 'exclusion', label: 'Loại trừ & Phủ định' },
];

export const LeadScoringTab: React.FC<LeadScoringTabProps> = ({
  isOwner,
  activeSection: controlledSection,
  onSectionChange,
}) => {
  const { rules, settings, isLoading, reload } = useLeadScoringConfig();

  const [internalSection, setInternalSection] = useState<LeadScoringSubSectionId>('rules');
  const currentSection = controlledSection || internalSection;

  const [settingsDraft, setSettingsDraft] = useState<LeadScoringSettings | null>(settings);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [prefillGroup, setPrefillGroup] = useState('');

  useEffect(() => {
    setSettingsDraft(settings);
  }, [settings]);

  const handleSectionChange = (section: LeadScoringSubSectionId) => {
    setInternalSection(section);
    onSectionChange?.(section);
  };

  const handleSaveSettings = async () => {
    if (!settingsDraft) return;

    setIsSavingSettings(true);
    try {
      await apiClient.updateLeadScoringSettings(settingsDraft);
      if (await reload()) notify.success('Đã lưu cấu hình chấm điểm.');
    } catch (error: unknown) {
      notify.error(error instanceof Error ? error.message : 'Không thể lưu cấu hình chấm điểm.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  if (isLoading && !settings) {
    return (
      <div className="py-12 text-center text-sm font-medium text-slate-500">
        Đang tải cấu hình chấm điểm...
      </div>
    );
  }

  if (!settings || !settingsDraft) {
    return (
      <div className="py-12 text-center text-sm font-medium text-rose-600">
        Không thể tải cấu hình chấm điểm. Vui lòng thử lại sau.
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Sub-section tab switcher (Cardless flat pill tabs) */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-3">
        {SUBSECTIONS.map((sub) => {
          const isActive = currentSection === sub.id;
          return (
            <button
              key={sub.id}
              type="button"
              onClick={() => handleSectionChange(sub.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer border-none ${isActive
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
            >
              {sub.label}
            </button>
          );
        })}
      </div>

      {/* ================= SECTION 1: TIÊU CHÍ & TỪ KHÓA ================= */}
      {currentSection === 'rules' && (
        <section id="lead-scoring-rules" className="space-y-4">
          <ConfigSubSectionHeader
            title="Tiêu chí & Từ khóa nhận diện"
            help={{
              title: "Tiêu chí & Từ khóa nhận diện",
              description:
                "Hệ thống tự động phân tích nội dung tương tác của khách hàng và tính toán điểm số tích lũy dựa trên danh sách từ khóa có gán trọng số.",
              example:
                "Khách hàng gửi tin nhắn: 'Tôi cần báo giá dịch vụ'. Hệ thống nhận diện từ khóa 'báo giá' (+5 điểm) và 'dịch vụ' (+5 điểm). Tự động cộng dồn +10 điểm vào hồ sơ khách hàng.",
              rules: [
                "Trọng số dương (+) biểu thị sự quan tâm và mức độ sẵn sàng chuyển đổi cao.",
                "Trọng số âm (-) dùng để nhận diện tương tác rác, chào mời quảng cáo hoặc từ chối liên hệ.",
                "Bộ máy nhận diện hỗ trợ đối soát tiếng Việt không phân biệt dấu và chữ hoa/thường.",
              ],
            }}
          />

          {/* Form thêm nhanh tiêu chí mới */}
          {isOwner && (
            <KeywordRuleQuickAddForm
              onSuccess={reload}
              prefillGroup={prefillGroup}
              onClearPrefillGroup={() => setPrefillGroup('')}
            />
          )}

          {/* Trình quản lý từ khóa quy mô 1,000+ từ */}
          <KeywordRulesManager
            rules={rules}
            isOwner={isOwner}
            onReload={reload}
            onQuickAddGroupPrefill={(groupName) => setPrefillGroup(groupName)}
          />
        </section>
      )}

      {/* ================= SECTION 2: NGƯỠNG PHÂN LOẠI & HẠNG ================= */}
      {currentSection === 'thresholds' && (
        <section id="lead-scoring-thresholds" className="space-y-4">
          <ConfigSubSectionHeader
            title="Ngưỡng phân loại & Tên hạng Lead"
            help={{
              title: "Ngưỡng phân loại & Tên hạng Lead",
              description:
                "Hệ thống đối chiếu tổng điểm của khách hàng với các mức điểm sàn để tự động xếp hạng tiềm năng (HOT, WARM, COLD) kèm khuyến nghị hành động cho nhân sự.",
              example:
                "Cấu hình HOT ≥ 10 điểm, WARM ≥ 5 điểm, COLD ≥ 1 điểm. Khách hàng tích lũy đạt 12 điểm sẽ tự động được xếp hạng HOT và hiển thị nhãn ưu tiên xử lý trong vòng 15 phút.",
              rules: [
                "Ngưỡng điểm phải tuân thủ nguyên tắc tăng dần: mức điểm sàn COLD < WARM < HOT.",
                "Ngay khi đạt ngưỡng, nhãn và màu sắc nhận diện tương ứng sẽ hiển thị tức thì trên danh sách liên hệ.",
                "Mỗi hạng cho phép cài đặt thông điệp hướng dẫn để nhân sự xử lý đúng quy trình.",
              ],
            }}
          />

          <LeadTierConfigMatrix
            settingsDraft={settingsDraft}
            setSettingsDraft={setSettingsDraft}
            isOwner={isOwner}
            isSaving={isSavingSettings}
            onSave={handleSaveSettings}
          />
        </section>
      )}

      {/* ================= SECTION 3: ĐIỂM THƯỞNG & GIẢM THEO THỜI GIAN ================= */}
      {currentSection === 'decay' && (
        <section id="lead-scoring-decay" className="space-y-4">
          <ConfigSubSectionHeader
            title="Điểm thưởng & Giảm điểm theo thời gian"
            help={{
              title: "Điểm thưởng & Giảm điểm theo thời gian",
              description:
                "Hệ thống tự động cộng điểm khuyến khích khi khách hàng để lại thông tin liên lạc và khấu trừ dần điểm số nếu khách hàng không phát sinh tương tác mới sau thời gian quy định.",
              example:
                "Khách hàng cung cấp số điện thoại. Hệ thống lập tức cộng +15 điểm thưởng. Sau 7 ngày không có tin nhắn phát sinh. Hệ thống tự động trừ 2 điểm mỗi chu kỳ tuần để hạ nhiệt độ ưu tiên.",
              rules: [
                "Điểm thưởng thông tin liên hệ giúp khách hàng nhanh chóng đạt hạng ưu tiên để nhân viên tiếp cận sớm.",
                "Cơ chế giảm điểm theo thời gian giữ cho danh sách xử lý luôn tập trung vào các cơ hội có tính tương tác cao.",
                "Điểm số sau khi giảm trừ sẽ không hạ xuống dưới mức điểm sàn tối thiểu của hệ thống.",
              ],
            }}
          />

          <LeadDecayConfigSection
            settingsDraft={settingsDraft}
            setSettingsDraft={setSettingsDraft}
            isOwner={isOwner}
            isSaving={isSavingSettings}
            onSave={handleSaveSettings}
          />
        </section>
      )}

      {/* ================= SECTION 4: LOẠI TRỪ & PHỦ ĐỊNH ================= */}
      {currentSection === 'exclusion' && (
        <section id="lead-scoring-exclusion" className="space-y-4">
          <ConfigSubSectionHeader
            title="Loại trừ & Xử lý phủ định"
            help={{
              title: "Loại trừ & Xử lý phủ định",
              description:
                "Hệ thống phát hiện các cấu trúc phủ định trong câu để vô hiệu hóa việc cộng điểm nhầm và tự động đánh dấu loại trừ các khách hàng có điểm số tiêu cực vượt ngưỡng.",
              example:
                "Khách hàng phản hồi 'Tôi không có nhu cầu sử dụng'. Cụm từ phủ định 'không có nhu cầu' tự động triệt tiêu trọng số của từ 'sử dụng', ngăn chặn việc cộng điểm sai lệch.",
              rules: [
                "Từ ngữ phủ định đứng trước hoặc sau từ khóa chính sẽ vô hiệu hóa điểm thưởng tương ứng trong phạm vi câu.",
                "Khi tổng điểm tiêu cực chạm ngưỡng loại trừ, hệ thống tự động gắn nhãn loại trừ và ngừng phân bổ cho nhân viên.",
                "Danh sách từ phủ định có thể tùy chỉnh linh hoạt phù hợp với ngữ cảnh giao tiếp của từng lĩnh vực.",
              ],
            }}
          />

          <LeadExclusionConfigSection
            settingsDraft={settingsDraft}
            setSettingsDraft={setSettingsDraft}
            isOwner={isOwner}
            isSaving={isSavingSettings}
            onSave={handleSaveSettings}
          />
        </section>
      )}
    </div>
  );
};
