import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { LeadQualificationCriteria } from '../../../workspaceConfig.types.js';
import { EmptyState, ConfigSubSectionHeader } from '../../../../../components/ui/index.js';
import { notify } from '../../../../../components/feedback/toastEmitter.js';
import { AddCriteriaModal } from '../modals/AddCriteriaModal.js';

import { useTranslation } from '../../../../../i18n/index.js';
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
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSaveCriteria = async (criteriaData: Omit<LeadQualificationCriteria, 'id'>) => {
    await onAddCriteria(criteriaData);
    notify.success(t('workspaceSettings.criteria.added', 'Đã thêm tiêu chí đánh giá mới!'));
  };

  const handleDelete = async (critId: string) => {
    await onDeleteCriteria(critId);
    notify.success(t('workspaceSettings.criteria.deleted', 'Đã xóa tiêu chí đánh giá!'));
  };

  return (
    <div className="w-full space-y-6">
      {/* Sub-Section Toolbar Row */}
      <ConfigSubSectionHeader
        title={t('workspaceSettings.criteria.title', 'Tiêu chí đánh giá & phân loại ({n})', { n: criteria.length })}
        help={{
          title: 'Tiêu chí đánh giá & phân loại khách hàng',
          description:
            'Bộ tiêu chuẩn sàng lọc giúp thu thập các trường thông tin trọng yếu và phân loại khách hàng tiềm năng một cách nhất quán.',
          example:
            'Nhân sự cập nhật thông tin theo tiêu chí "Quy mô nhu cầu" trên hồ sơ. Hệ thống tự động ghi nhận dữ liệu vào hồ sơ khách hàng và kích hoạt nhãn phân nhóm tương ứng trên giao diện.',
          rules: [
            'Hỗ trợ 4 định dạng dữ liệu linh hoạt: Văn bản (Text), Danh sách tùy chọn (Select), Số liệu (Number) và Xác nhận Có/Không (Boolean).',
            'Tiêu chí bắt buộc yêu cầu nhân viên điền đầy đủ thông tin trước khi chuyển khách hàng sang giai đoạn tiếp theo của quy trình.',
            'Các trường tiêu chí được hiển thị và tìm kiếm nhanh chóng tại bảng thông tin chi tiết khách hàng.',
          ],
        }}
        actions={
          isOwner && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-medium px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 shadow-2xs border-none"
            >
              <Plus size={13} className="text-white" />
              <span>{t('workspaceSettings.criteria.add', 'Thêm tiêu chí')}</span>
            </button>
          )
        }
      />

      {/* Unboxed Flat List */}
      <div className="w-full border-t border-b border-slate-200 bg-white divide-y divide-slate-200">
        {criteria.length === 0 ? (
          <div className="py-8">
            <EmptyState
              title={t('workspaceSettings.criteria.emptyTitle', 'Chưa có tiêu chí đánh giá nào')}
              description={t('workspaceSettings.criteria.emptyDesc', 'Hãy nhấn nút Thêm tiêu chí ở trên để tạo câu hỏi sàng lọc khách hàng.')}
            />
          </div>
        ) : (
          criteria.map((crit) => (
            <div
              key={crit.id}
              className="py-4 px-2 flex items-center justify-between hover:bg-slate-50/60 transition-colors gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-semibold text-slate-950 truncate">
                      {crit.name}
                    </span>
                    <span className="px-2 py-0.5 text-[11px] font-semibold bg-blue-50 text-blue-700 rounded-md">
                      {crit.type}
                    </span>
                    {crit.isRequired && (
                      <span className="px-2 py-0.5 text-[11px] font-semibold bg-rose-50 text-rose-700 rounded-md">
                        {t('workspaceSettings.criteria.required', 'Bắt buộc')}
                      </span>
                    )}
                  </div>
                  {crit.options && crit.options.length > 0 && (
                    <div className="text-xs text-slate-600 mt-1 truncate max-w-xl">
                      {t('workspaceSettings.criteria.options', 'Tùy chọn: {list}', { list: crit.options.join(', ') })}
                    </div>
                  )}
                </div>
              </div>

              {isOwner && (
                <button
                  type="button"
                  onClick={() => handleDelete(crit.id)}
                  disabled={isLoading}
                  title={t('workspaceSettings.criteria.delete', 'Xóa tiêu chí')}
                  className="h-7 w-7 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-300 text-red-600 inline-flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 shrink-0 shadow-2xs"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

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

