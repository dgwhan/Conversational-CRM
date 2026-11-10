import React, { useState } from 'react';
import { Plus, ArrowUp, ArrowDown, Edit2, Trash2 } from 'lucide-react';
import type { PipelineStageConfig } from '../../../workspaceConfig.types.js';
import { notify } from '../../../../../components/feedback/toastEmitter.js';
import { StageModal } from '../modals/StageModal.js';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<PipelineStageConfig | null>(null);

  const formatStageDisplayName = (name: string, index: number) => {
    const cleaned = name.replace(/^\d+[\.\s\-]+/, '').trim();
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
      notify.success('Đã cập nhật thông tin giai đoạn phễu!');
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
      notify.success('Đã thêm giai đoạn phễu mới!');
    }
  };

  const handleDelete = async (stageId: string) => {
    if (stages.length <= 2) {
      notify.warning('Phễu quy trình cần duy trì tối thiểu 2 giai đoạn.');
      return;
    }
    await onDeleteStage(stageId);
    notify.success('Đã xóa giai đoạn phễu!');
  };

  return (
    <div className="w-full space-y-3">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider m-0">
            Giai đoạn phễu quy trình ({stages.length})
          </h3>
          <p className="text-[11px] text-slate-500 m-0">
            Tự do kéo chỉnh thứ tự, cập nhật trạng thái chốt/hủy và màu sắc nhận diện từng bước
          </p>
        </div>
        {isOwner && (
          <button
            type="button"
            onClick={handleOpenAdd}
            disabled={isLoading}
            className="h-8 px-3 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors shrink-0"
          >
            <Plus size={14} />
            <span>Thêm giai đoạn</span>
          </button>
        )}
      </div>

      {/* Live Preview Mini Card */}
      <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs w-full">
        <div className="text-xs font-semibold text-slate-600 mb-2 flex items-center justify-between">
          <span>Dòng chảy phễu trực quan:</span>
          <span className="text-[11px] text-slate-400 font-normal">Kéo cuộn ngang để xem tất cả</span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {stages.map((s, idx) => (
            <div
              key={s.id}
              className="px-2.5 py-1 text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 rounded-lg border shadow-2xs"
              style={{
                backgroundColor: s.bgColor,
                borderColor: s.borderColor,
                color: s.color,
              }}
            >
              <span>{formatStageDisplayName(s.name, idx)}</span>
              {s.isWon && <span className="text-emerald-600 text-xs">★</span>}
              {s.isLost && <span className="text-slate-400 text-xs">✕</span>}
            </div>
          ))}
        </div>
      </div>

      {/* List Stages Cards */}
      <div className="space-y-2 w-full">
        {stages.map((stage, index) => (
          <div
            key={stage.id}
            className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-3.5 h-3.5 shrink-0 rounded-full border shadow-2xs"
                style={{ backgroundColor: stage.color, borderColor: stage.borderColor }}
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    {formatStageDisplayName(stage.name, index)}
                  </span>
                  {stage.isWon && (
                    <span className="px-1.5 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-md">
                      Chốt thành công
                    </span>
                  )}
                  {stage.isLost && (
                    <span className="px-1.5 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 rounded-md">
                      Thất bại / Hủy
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {stage.subtitle}
                </div>
              </div>
            </div>

            {isOwner && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={index === 0 || isLoading}
                  onClick={() => onReorderStages(index, index - 1)}
                  title="Di chuyển lên"
                  className="h-7 w-7 rounded-md text-slate-500 hover:text-slate-900 border border-transparent hover:border-slate-200 hover:bg-slate-50 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <ArrowUp size={13} />
                </button>
                <button
                  type="button"
                  disabled={index === stages.length - 1 || isLoading}
                  onClick={() => onReorderStages(index, index + 1)}
                  title="Di chuyển xuống"
                  className="h-7 w-7 rounded-md text-slate-500 hover:text-slate-900 border border-transparent hover:border-slate-200 hover:bg-slate-50 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <ArrowDown size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(stage)}
                  disabled={isLoading}
                  title="Sửa giai đoạn"
                  className="h-7 w-7 rounded-md text-slate-500 hover:text-blue-600 border border-transparent hover:border-blue-200 hover:bg-blue-50 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <Edit2 size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(stage.id)}
                  disabled={isLoading || stages.length <= 2}
                  title="Xóa giai đoạn"
                  className="h-7 w-7 rounded-md text-slate-500 hover:text-rose-600 border border-transparent hover:border-rose-200 hover:bg-rose-50 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
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

