import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Modal } from '../../../../../components/ui/index.js';
import type { LeadQualificationCriteria } from '../../../workspaceConfig.types.js';

export interface AddCriteriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (criteria: Omit<LeadQualificationCriteria, 'id'>) => Promise<void>;
  isLoading?: boolean;
}

export const AddCriteriaModal: React.FC<AddCriteriaModalProps> = ({
  isOpen,
  onClose,
  onSave,
  isLoading = false,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'TEXT' | 'SELECT' | 'NUMBER' | 'BOOLEAN'>('TEXT');
  const [options, setOptions] = useState('');
  const [isRequired, setIsRequired] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedOptions =
      type === 'SELECT'
        ? options
            .split(',')
            .map((o) => o.trim())
            .filter(Boolean)
        : undefined;

    await onSave({
      name: name.trim(),
      type,
      options: parsedOptions,
      isRequired,
    });

    setName('');
    setType('TEXT');
    setOptions('');
    setIsRequired(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Thêm Tiêu Chí Đánh Giá Mới"
      description="Định cấu hình các câu hỏi, tiêu chí phân loại để nhân viên tư vấn thu thập từ khách hàng."
      size="md"
      variant="flat"
      showCloseButton={true}
    >
      <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Tên tiêu chí *
          </label>
          <input
            type="text"
            placeholder="VD: Trình độ học vấn, Tầm tài chính..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-blue-500 shadow-2xs"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Kiểu dữ liệu
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:border-blue-500 shadow-2xs cursor-pointer"
          >
            <option value="TEXT">Văn bản (Text)</option>
            <option value="SELECT">Chọn một (Dropdown Select)</option>
            <option value="NUMBER">Số liệu (Number)</option>
            <option value="BOOLEAN">Có / Không (Boolean)</option>
          </select>
        </div>

        {type === 'SELECT' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Các tùy chọn (phân cách bằng dấu phẩy)
            </label>
            <input
              type="text"
              placeholder="VD: THPT, Trung cấp, Đại học, Đi làm"
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-blue-500 shadow-2xs"
            />
          </div>
        )}

        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <input
            type="checkbox"
            id="critRequiredModal"
            checked={isRequired}
            onChange={(e) => setIsRequired(e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          <label htmlFor="critRequiredModal" className="text-xs text-slate-700 cursor-pointer">
            Tiêu chuẩn bắt buộc phải thu thập
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3 rounded-lg text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isLoading || !name.trim()}
            className="h-8 px-4 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Plus size={13} />
            <span>Thêm Tiêu Chí</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

