import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { LeadQualificationCriteria } from '../../../workspaceConfig.types.js';
import { EmptyState } from '../../../../../components/ui/index.js';
import { notify } from '../../../../../components/feedback/toastEmitter.js';
import { AddCriteriaModal } from '../modals/AddCriteriaModal.js';

export interface CriteriaTabProps {
  criteria: LeadQualificationCriteria[];
  isOwner: boolean;
  isLoading?: boolean;
  onAddCriteria: (criteria: Omit<LeadQualificationCriteria, 'id'>) => Promise<void>;
  onDeleteCriteria: (critId: string) => Promise<void>;
}

export const CriteriaTab: React.FC<CriteriaTabProps> = ({
  criteria,
  isOwner,
  isLoading = false,
  onAddCriteria,
  onDeleteCriteria,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSaveCriteria = async (criteriaData: Omit<LeadQualificationCriteria, 'id'>) => {
    await onAddCriteria(criteriaData);
    notify.success('Đã thêm tiêu chí đánh giá mới!');
  };

  const handleDelete = async (critId: string) => {
    await onDeleteCriteria(critId);
    notify.success('Đã xóa tiêu chí đánh giá!');
  };

  return (
    <div className="w-full space-y-3">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider m-0">
            Tiêu Chí Đánh Giá & Phân Loại ({criteria.length})
          </h3>
          <p className="text-[11px] text-slate-500 m-0">
            Các câu hỏi, tiêu chuẩn sàng lọc ứng viên/khách hàng được lưu vào cơ sở dữ liệu theo tài khoản không gian làm việc.
          </p>
        </div>
        {isOwner && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            disabled={isLoading}
            className="h-8 px-3 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors shrink-0"
          >
            <Plus size={14} />
            <span>Thêm tiêu chí</span>
          </button>
        )}
      </div>

      {criteria.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
          <EmptyState
            title="Chưa có tiêu chí đánh giá nào"
            description="Hãy nhấn nút Thêm tiêu chí ở trên để tạo câu hỏi sàng lọc khách hàng."
          />
        </div>
      ) : (
        <div className="space-y-2 w-full">
          {criteria.map((crit) => (
            <div
              key={crit.id}
              className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold text-slate-900">
                    {crit.name}
                  </span>
                  <span className="px-1.5 py-0.5 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 rounded-md">
                    {crit.type}
                  </span>
                  {crit.isRequired && (
                    <span className="px-1.5 py-0.5 text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 rounded-md">
                      Bắt buộc
                    </span>
                  )}
                </div>
                {crit.options && crit.options.length > 0 && (
                  <div className="text-[11px] text-slate-500">
                    Tùy chọn: {crit.options.join(', ')}
                  </div>
                )}
              </div>

              {isOwner && (
                <button
                  type="button"
                  onClick={() => handleDelete(crit.id)}
                  disabled={isLoading}
                  title="Xóa tiêu chí"
                  className="h-6 w-6 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 inline-flex items-center justify-center transition-colors cursor-pointer border border-transparent hover:border-rose-200 disabled:opacity-30"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Criteria Modal */}
      <AddCriteriaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveCriteria}
        isLoading={isLoading}
      />
    </div>
  );
};

