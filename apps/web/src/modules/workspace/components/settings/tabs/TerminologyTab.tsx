import React, { useState, useEffect } from 'react';
import { Tag, Save } from 'lucide-react';
import type { WorkspaceTerminology } from '../../../workspaceConfig.types.js';
import { notify } from '../../../../../components/feedback/toastEmitter.js';

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
    notify.success('Đã lưu cấu hình thuật ngữ hiển thị!');
  };

  return (
    <div className="w-full">
      <div className="p-4 sm:p-5 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-4 w-full">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center shrink-0">
            <Tag size={14} />
          </div>
          <div>
            <h4 className="m-0 text-xs font-bold text-slate-900 uppercase tracking-wider">
              Cấu Hình Nhãn Thuật Ngữ Hiển Thị Trên Giao Diện
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5 mb-0">
              Tự động đồng bộ tên gọi hiển thị theo toàn bộ hệ thống quản lý phễu, modal hồ sơ và bảng phân tích.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên thực thể khách hàng (Hiển thị tại Cột Hồ Sơ & Modal)
              </label>
              <input
                type="text"
                placeholder="VD: Thí sinh / Học viên, Khách mua BĐS, Khách hàng"
                value={entityName}
                onChange={(e) => setEntityName(e.target.value)}
                disabled={!isOwner}
                className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-blue-500 shadow-2xs disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên gọi của Bảng Phễu (Bảng Kanban)
              </label>
              <input
                type="text"
                placeholder="VD: Phễu Tuyển Sinh & Đào Tạo, Phễu Bán Hàng"
                value={pipelineName}
                onChange={(e) => setPipelineName(e.target.value)}
                disabled={!isOwner}
                className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-blue-500 shadow-2xs disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên gọi danh mục kinh doanh (Sản phẩm / Dịch vụ / Khóa học / BĐS...)
              </label>
              <input
                type="text"
                placeholder="VD: Sản phẩm / Dịch vụ, Khóa học, Gói liệu trình, Căn hộ / Dự án..."
                value={productLabel}
                onChange={(e) => setProductLabel(e.target.value)}
                disabled={!isOwner}
                className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-blue-500 shadow-2xs disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên gọi Doanh số / Học phí dự kiến
              </label>
              <input
                type="text"
                placeholder="VD: Học phí dự kiến (VNĐ), Giá trị đơn hàng, Giá trị giao dịch"
                value={valueLabel}
                onChange={(e) => setValueLabel(e.target.value)}
                disabled={!isOwner}
                className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-blue-500 shadow-2xs disabled:bg-slate-50"
              />
            </div>
          </div>

          {isOwner && (
            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="h-8 px-4 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white inline-flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
              >
                <Save size={13} />
                <span>Lưu Cấu Hình Thuật Ngữ</span>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

