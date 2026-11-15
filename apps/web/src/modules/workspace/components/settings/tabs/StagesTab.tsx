import React, { useState } from 'react';
import { Plus, ArrowUp, ArrowDown, Edit2, Trash2 } from 'lucide-react';
import type { PipelineStageConfig } from '../../../workspaceConfig.types.js';
import { notify } from '../../../../../components/feedback/toastEmitter.js';
import { StageModal } from '../modals/StageModal.js';
import { ConfigSubSectionHeader } from '../../../../../components/ui/ConfigSubSectionHeader.js';

import { useTranslation } from '../../../../../i18n/index.js';
export interface StagesTabProps {
  stages: PipelineStageConfig[];
  isOwner: boolean;
  isLoading?: boolean;
  onAddStage: (stage: Omit<PipelineStageConfig, 'id' | 'order'>) => Promise<void>;
  onUpdateStage: (stageId: string, patch: Partial<PipelineStageConfig>) => Promise<void>;
  onDeleteStage: (stageId: string) => Promise<void>;
  onReorderStages: (sourceIndex: number, destIndex: number) => Promise<void>;
}

export const StagesTab: React.FC<StagesTabProps> = ({
  stages,
  isOwner,
  isLoading = false,
  onAddStage,
  onUpdateStage,
  onDeleteStage,
  onReorderStages,
}) => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<PipelineStageConfig | null>(null);

  const formatStageDisplayName = (name: string, index: number) => {
    const cleaned = name.replace(/^\d+[.\s-]+/, '').trim();
    return `${index + 1}. ${cleaned || name}`;
  };

  const handleOpenAdd = () => {
    setEditingStage(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (stage: PipelineStageConfig) => {
    setEditingStage(stage);
    setIsModalOpen(true);
  };

  const handleSaveStage = async (stageData: {
    name: string;
    subtitle: string;
    color: string;
    bgColor: string;
    borderColor: string;
    isWon?: boolean;
    isLost?: boolean;
  }) => {
    if (editingStage) {
      await onUpdateStage(editingStage.id, {
        name: stageData.name,
        subtitle: stageData.subtitle,
        color: stageData.color,
        bgColor: stageData.bgColor,
        borderColor: stageData.borderColor,
      });
      notify.success(t('workspaceSettings.stages.updated', 'Đã cập nhật thông tin giai đoạn phễu!'));
    } else {
      await onAddStage({
        name: stageData.name,
        subtitle: stageData.subtitle,
        color: stageData.color,
        bgColor: stageData.bgColor,
        borderColor: stageData.borderColor,
        isWon: stageData.isWon,
        isLost: stageData.isLost,
        isSystem: false,
      });
      notify.success(t('workspaceSettings.stages.added', 'Đã thêm giai đoạn phễu mới!'));
    }
  };

  const handleDelete = async (stageId: string) => {
    if (stages.length <= 2) {
      notify.warning(t('workspaceSettings.stages.minTwo', 'Phễu quy trình cần duy trì tối thiểu 2 giai đoạn.'));
      return;
    }
    await onDeleteStage(stageId);
    notify.success(t('workspaceSettings.stages.deleted', 'Đã xóa giai đoạn phễu!'));
  };

  return (
    <div className="w-full space-y-6">
      {/* Sub-Section Toolbar Row */}
      <ConfigSubSectionHeader
        title={t('workspaceSettings.stages.title', 'Giai đoạn phễu quy trình ({n})', { n: stages.length })}
        help={{
          title: 'Giai đoạn phễu quy trình',
          description:
            'Cấu hình quy trình chuyển đổi khách hàng qua các giai đoạn kinh doanh từ khi tiếp cận ban đầu đến khi hoàn tất giao dịch.',
          example:
            'Nhân sự chuyển khách hàng sang giai đoạn "Thỏa thuận hoàn tất". Hệ thống tự động ghi nhận tỷ lệ chuyển đổi của phễu và cập nhật giá trị giao dịch vào báo cáo kết quả kinh doanh.',
          rules: [
            'Phễu quy trình yêu cầu duy trì tối thiểu 2 giai đoạn để bảo đảm tính liên tục của luồng vận hành.',
            'Giai đoạn Thành công và Thất bại được dùng để đo lường chính xác tỷ lệ chuyển đổi hiệu quả công việc.',
            'Thứ tự các bước chuyển đổi có thể điều chỉnh nhanh chóng bằng thao tác mũi tên lên hoặc xuống.',
          ],
        }}
        actions={
          isOwner && (
            <button
              type="button"
              onClick={handleOpenAdd}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-medium px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 shadow-2xs border-none"
            >
              <Plus size={13} className="text-white" />
              <span>{t('workspaceSettings.stages.add', 'Thêm giai đoạn')}</span>
            </button>
          )
        }
      />

      {/* 1. Unboxed Visual pipeline preview strip - wrap cleanly without clipping */}
      <div className="flex flex-col gap-2 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700">Dòng chảy phễu trực quan:</span>
          <span className="text-xs text-slate-500">({stages.length} bước)</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 py-0.5">
          {stages.map((s, idx) => (
            <div
              key={s.id}
              className="px-2.5 py-1 text-xs font-medium flex items-center gap-1.5 rounded-md border shadow-2xs"
              style={{
                backgroundColor: s.bgColor,
                borderColor: s.borderColor,
                color: s.color,
              }}
            >
              <span>{formatStageDisplayName(s.name, idx)}</span>
              {s.isWon && <span className="text-emerald-600 font-bold">★</span>}
              {s.isLost && <span className="text-slate-400 font-bold">✕</span>}
            </div>
          ))}
        </div>
      </div>

      {/* 2. Flatten Stage Rows (Borderless flat list separated only by hairline dividers) */}
      <div className="divide-y divide-slate-200 border-t border-b border-slate-200">
        {stages.map((stage, index) => (
          <div
            key={stage.id}
            className="py-4 px-2 flex items-center justify-between hover:bg-slate-50/60 transition-colors gap-4"
          >
            {/* Left: Status dot, bold item title, muted description */}
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-3.5 h-3.5 shrink-0 rounded-full border shadow-2xs"
                style={{ backgroundColor: stage.color, borderColor: stage.borderColor }}
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-semibold text-slate-950 truncate">
                    {formatStageDisplayName(stage.name, index)}
                  </span>
                  {stage.isWon && (
                    <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 rounded-md">
                      {t('workspaceSettings.stages.won', 'Chốt thành công')}
                    </span>
                  )}
                  {stage.isLost && (
                    <span className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-600 rounded-md">
                      {t('workspaceSettings.stages.lost', 'Thất bại / Hủy')}
                    </span>
                  )}
                </div>
                {stage.subtitle && (
                  <p className="text-xs text-slate-600 mt-1 mb-0 truncate max-w-xl">
                    {stage.subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Compact actions aligned cleanly */}
            {isOwner && (
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  disabled={index === 0 || isLoading}
                  onClick={() => onReorderStages(index, index - 1)}
                  title={t('workspaceSettings.stages.moveUp', 'Di chuyển lên')}
                  className="h-7 w-7 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
                >
                  <ArrowUp size={13} />
                </button>
                <button
                  type="button"
                  disabled={index === stages.length - 1 || isLoading}
                  onClick={() => onReorderStages(index, index + 1)}
                  title={t('workspaceSettings.stages.moveDown', 'Di chuyển xuống')}
                  className="h-7 w-7 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
                >
                  <ArrowDown size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(stage)}
                  disabled={isLoading}
                  className="h-7 px-2.5 rounded-md border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[13px] font-medium flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                >
                  <Edit2 size={12} />
                  <span>Sửa</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(stage.id)}
                  disabled={isLoading || stages.length <= 2}
                  title={t('workspaceSettings.stages.delete', 'Xóa giai đoạn')}
                  className="h-7 w-7 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-300 text-red-600 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Stage Add/Edit Modal */}
      <StageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        stageToEdit={editingStage}
        onSave={handleSaveStage}
        isLoading={isLoading}
      />
    </div>
  );
};

