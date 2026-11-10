import React, { useState, useEffect } from 'react';
import { Plus, Save } from 'lucide-react';
import { Modal } from '../../../../../components/ui/index.js';
import type { PipelineStageConfig } from '../../../workspaceConfig.types.js';

export const COLOR_SWATCHES = [
  { color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd', name: 'Xanh Lam' },
  { color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe', name: 'Chàm Indigo' },
  { color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe', name: 'Tím Violet' },
  { color: '#d97706', bg: '#fffbeb', border: '#fde68a', name: 'Hổ Phách' },
  { color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', name: 'Cam Đậm' },
  { color: '#0d9488', bg: '#f0fdfa', border: '#99f6e4', name: 'Xanh Mòng Két' },
  { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', name: 'Xanh Lá' },
  { color: '#ec4899', bg: '#fdf2f8', border: '#fbcfe8', name: 'Hồng Phấn' },
  { color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', name: 'Xám Đá' },
];

export interface StageModalProps {
  isOpen: boolean;
  onClose: () => void;
  stageToEdit?: PipelineStageConfig | null;
  onSave: (stageData: {
    name: string;
    subtitle: string;
    color: string;
    bgColor: string;
    borderColor: string;
    isWon?: boolean;
    isLost?: boolean;
  }) => Promise<void>;
  isLoading?: boolean;
}

export const StageModal: React.FC<StageModalProps> = ({
  isOpen,
  onClose,
  stageToEdit,
  onSave,
  isLoading = false,
}) => {
  const isEditing = Boolean(stageToEdit);

  const [name, setName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_SWATCHES[0]);
  const [isWon, setIsWon] = useState(false);
  const [isLost, setIsLost] = useState(false);

  useEffect(() => {
    if (stageToEdit) {
      setName(stageToEdit.name.replace(/^\d+[\.\s\-]+/, '').trim());
      setSubtitle(stageToEdit.subtitle || '');
      const swatch =
        COLOR_SWATCHES.find((s) => s.color === stageToEdit.color) || COLOR_SWATCHES[0];
      setSelectedColor(swatch);
      setIsWon(Boolean(stageToEdit.isWon));
      setIsLost(Boolean(stageToEdit.isLost));
    } else {
      setName('');
      setSubtitle('');
      setSelectedColor(COLOR_SWATCHES[0]);
      setIsWon(false);
      setIsLost(false);
    }
  }, [stageToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await onSave({
      name: name.trim(),
      subtitle: subtitle.trim() || 'Giai đoạn tùy biến',
      color: selectedColor.color,
      bgColor: selectedColor.bg,
      borderColor: selectedColor.border,
      isWon,
      isLost,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Chỉnh Sửa Giai Đoạn Phễu' : 'Thêm Giai Đoạn Phễu Mới'}
      description={
        isEditing
          ? 'Cập nhật tên gọi, mô tả ngắn hoặc màu sắc đại diện của giai đoạn này.'
          : 'Định nghĩa bước chuyển đổi khách hàng tiếp theo trong quy trình bán hàng & tuyển sinh.'
      }
      size="md"
      variant="flat"
      showCloseButton={true}
    >
      <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Tên giai đoạn *
          </label>
          <input
            type="text"
            placeholder="VD: Hẹn phỏng vấn trực tiếp"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-blue-500 shadow-2xs"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Mô tả / Phụ đề
          </label>
          <input
            type="text"
            placeholder="VD: Khách đã xác nhận lịch gặp văn phòng"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-blue-500 shadow-2xs"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Màu sắc nhận diện
          </label>
          <div className="flex gap-2 flex-wrap">
            {COLOR_SWATCHES.map((swatch) => (
              <button
                key={swatch.color}
                type="button"
                onClick={() => setSelectedColor(swatch)}
                className={`w-6 h-6 rounded-md border transition-all cursor-pointer ${
                  selectedColor.color === swatch.color
                    ? 'border-slate-900 ring-2 ring-slate-900/20 scale-105'
                    : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: swatch.color }}
                title={swatch.name}
              />
            ))}
          </div>
        </div>

        {!isEditing && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isWon}
                onChange={(e) => {
                  setIsWon(e.target.checked);
                  if (e.target.checked) setIsLost(false);
                }}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Đánh dấu là giai đoạn Chốt thành công (Won)</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isLost}
                onChange={(e) => {
                  setIsLost(e.target.checked);
                  if (e.target.checked) setIsWon(false);
                }}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Đánh dấu là giai đoạn Thất bại / Hủy (Lost)</span>
            </label>
          </div>
        )}

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
            {isEditing ? <Save size={13} /> : <Plus size={13} />}
            <span>{isEditing ? 'Lưu Thay Đổi' : 'Thêm Vào Phễu'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

