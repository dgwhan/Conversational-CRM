import React, { useState, useEffect } from 'react';
import { Loader2, Save } from 'lucide-react';
import type { WorkspaceTerminology } from '../../../workspaceConfig.types.js';
import { notify } from '../../../../../components/feedback/toastEmitter.js';
import { ConfigSubSectionHeader } from '../../../../../components/ui/index.js';

import { useTranslation } from '../../../../../i18n/index.js';
export interface TerminologyTabProps {
  terminology: WorkspaceTerminology;
  isOwner: boolean;
  isLoading?: boolean;
  onSave: (terminology: WorkspaceTerminology) => Promise<void>;
}

export const TerminologyTab: React.FC<TerminologyTabProps> = ({
  terminology,
  isOwner,
  isLoading = false,
  onSave,
}) => {
  const { t } = useTranslation();
  const [entityName, setEntityName] = useState(terminology.entityName || '');
  const [pipelineName, setPipelineName] = useState(terminology.pipelineName || '');
  const [productLabel, setProductLabel] = useState(terminology.productLabel || '');
  const [valueLabel, setValueLabel] = useState(terminology.valueLabel || '');

  useEffect(() => {
    setEntityName(terminology.entityName || '');
    setPipelineName(terminology.pipelineName || '');
    setProductLabel(terminology.productLabel || '');
    setValueLabel(terminology.valueLabel || '');
  }, [terminology]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      entityName: entityName.trim() || terminology.entityName,
      pipelineName: pipelineName.trim() || terminology.pipelineName,
      productLabel: productLabel.trim() || terminology.productLabel,
      valueLabel: valueLabel.trim() || terminology.valueLabel,
    });
    notify.success(t('workspaceSettings.terminology.saved', 'Đã lưu cấu hình thuật ngữ hiển thị!'));
  };

  return (
    <div className="w-full space-y-8 pb-12">
      <ConfigSubSectionHeader
        title={t('workspaceSettings.terminology.title', 'Cấu hình nhãn thuật ngữ hiển thị')}
        help={{
          title: t('workspaceSettings.terminology.title', 'Cấu hình nhãn thuật ngữ hiển thị'),
          description:
            'Cấu hình chuẩn hóa các danh xưng và thuật ngữ hiển thị nhằm đồng bộ phù hợp với mô hình tổ chức và ngôn ngữ vận hành của doanh nghiệp.',
          example:
            'Quản trị viên đặt tên thực thể là "Khách hàng" và sản phẩm là "Gói giải pháp". Hệ thống tự động cập nhật đồng bộ các tiêu đề cột phễu, biểu mẫu hồ sơ và bảng dữ liệu phân tích.',
          rules: [
            'Thay đổi thuật ngữ chỉ tác động đến lớp hiển thị giao diện, không làm ảnh hưởng đến cấu trúc cơ sở dữ liệu ngầm.',
            'Yêu cầu thẩm quyền Chủ sở hữu không gian làm việc (Owner) để thiết lập và ban hành cấu hình cho toàn bộ thành viên.',
            'Các thay đổi có hiệu lực ngay lập tức trên mọi màn hình chức năng của hệ thống.',
          ],
        }}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t('workspaceSettings.terminology.entityLabel', 'Tên thực thể khách hàng (Hiển thị tại Cột Hồ Sơ & Modal)')}
            </label>
            <input
              type="text"
              placeholder={t('workspaceSettings.terminology.entityPlaceholder', 'VD: Thí sinh / Học viên, Khách mua BĐS, Khách hàng')}
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
              disabled={!isOwner}
              className="w-full h-9 rounded-md border border-transparent bg-slate-100/80 px-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none transition-all disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t('workspaceSettings.terminology.pipelineLabel', 'Tên gọi của Bảng Phễu (Bảng Kanban)')}
            </label>
            <input
              type="text"
              placeholder={t('workspaceSettings.terminology.pipelinePlaceholder', 'VD: Phễu Tuyển Sinh & Đào Tạo, Phễu Bán Hàng')}
              value={pipelineName}
              onChange={(e) => setPipelineName(e.target.value)}
              disabled={!isOwner}
              className="w-full h-9 rounded-md border border-transparent bg-slate-100/80 px-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none transition-all disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t('workspaceSettings.terminology.productLabel', 'Tên gọi danh mục kinh doanh (Sản phẩm / Dịch vụ / Khóa học / BĐS...)')}
            </label>
            <input
              type="text"
              placeholder={t('workspaceSettings.terminology.productPlaceholder', 'VD: Sản phẩm / Dịch vụ, Khóa học, Gói liệu trình, Căn hộ / Dự án...')}
              value={productLabel}
              onChange={(e) => setProductLabel(e.target.value)}
              disabled={!isOwner}
              className="w-full h-9 rounded-md border border-transparent bg-slate-100/80 px-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none transition-all disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t('workspaceSettings.terminology.valueLabel', 'Tên gọi Doanh số / Học phí dự kiến')}
            </label>
            <input
              type="text"
              placeholder={t('workspaceSettings.terminology.valuePlaceholder', 'VD: Học phí dự kiến (VNĐ), Giá trị đơn hàng, Giá trị giao dịch')}
              value={valueLabel}
              onChange={(e) => setValueLabel(e.target.value)}
              disabled={!isOwner}
              className="w-full h-9 rounded-md border border-transparent bg-slate-100/80 px-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none transition-all disabled:opacity-60"
            />
          </div>
        </div>

        {isOwner && (
          <div className="pt-6 pb-12 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer border-none shadow-2xs inline-flex flex-row items-center justify-center gap-1.5 whitespace-nowrap"
            >
              {isLoading ? (
                <Loader2 size={14} className="animate-spin shrink-0" />
              ) : (
                <Save size={14} className="shrink-0" />
              )}
              <span>{isLoading ? 'Đang lưu...' : 'Lưu cài đặt'}</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

