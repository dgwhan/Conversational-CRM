import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Modal } from '../../../../../components/ui/index.js';
import type { ProductItemConfig } from '../../../workspaceConfig.types.js';

export interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productLabel?: string;
  onSave: (product: Omit<ProductItemConfig, 'id'>) => Promise<void>;
  isLoading?: boolean;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  productLabel = 'Sản Phẩm / Dịch Vụ',
  onSave,
  isLoading = false,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('');
  const [defaultPrice, setDefaultPrice] = useState('20000000');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await onSave({
      name: name.trim(),
      code: code.trim() || undefined,
      category: category.trim() || 'Chung',
      defaultPrice: Number(defaultPrice) || 0,
      description: description.trim() || undefined,
      isActive: true,
    });

    setName('');
    setCode('');
    setCategory('');
    setDefaultPrice('20000000');
    setDescription('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Thêm ${productLabel} Mới`}
      description={`Định cấu hình ${productLabel.toLowerCase()} để gắn vào hồ sơ khách hàng.`}
      size="md"
      variant="flat"
      showCloseButton={true}
    >
      <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Tên gọi *
          </label>
          <input
            type="text"
            placeholder="VD: Gói dịch vụ tư vấn, Khóa đào tạo..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-blue-500 shadow-2xs"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mã định danh (Code)
            </label>
            <input
              type="text"
              placeholder="VD: SP-01, DV-01, PKG-ADV"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-blue-500 shadow-2xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nhóm / Phân loại
            </label>
            <input
              type="text"
              placeholder="VD: Tiêu chuẩn, Cao cấp, Trọn gói"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-blue-500 shadow-2xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Giá niêm yết mặc định (VNĐ)
          </label>
          <input
            type="number"
            step="100000"
            value={defaultPrice}
            onChange={(e) => setDefaultPrice(e.target.value)}
            className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-blue-500 shadow-2xs font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Mô tả ngắn
          </label>
          <textarea
            rows={2}
            placeholder="Mô tả thông tin quyền lợi gói dịch vụ / sản phẩm..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-blue-500 shadow-2xs resize-y"
          />
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
            <span>Thêm Vào Danh Mục</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

