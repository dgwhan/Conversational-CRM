import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { ProductItemConfig } from '../../../workspaceConfig.types.js';
import { EmptyState } from '../../../../../components/ui/index.js';
import { notify } from '../../../../../components/feedback/toastEmitter.js';
import { AddProductModal } from '../modals/AddProductModal.js';

import { useTranslation } from '../../../../../i18n/index.js';
import { translate } from '../../../../../i18n/translate.js';
export interface CatalogTabProps {
  catalog: ProductItemConfig[];
  productLabel?: string;
  isOwner: boolean;
  isLoading?: boolean;
  onAddProduct: (prod: Omit<ProductItemConfig, 'id'>) => Promise<void>;
  onDeleteProduct: (prodId: string) => Promise<void>;
}

export const CatalogTab: React.FC<CatalogTabProps> = ({
  catalog,
  productLabel = translate('workspaceSettings.catalog.defaultLabel', 'Sản Phẩm & Dịch Vụ'),
  isOwner,
  isLoading = false,
  onAddProduct,
  onDeleteProduct,
}) => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSaveProduct = async (productData: Omit<ProductItemConfig, 'id'>) => {
    await onAddProduct(productData);
    notify.success(t('workspaceSettings.catalog.added', 'Đã thêm {label} mới thành công!', { label: productLabel.toLowerCase() }));
  };

  const handleDelete = async (prodId: string) => {
    await onDeleteProduct(prodId);
    notify.success(t('workspaceSettings.catalog.deleted', 'Đã xóa {label}!', { label: productLabel.toLowerCase() }));
  };

  return (
    <div className="w-full space-y-3">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider m-0">
            {t('workspaceSettings.catalog.title', 'Danh Sách {label} ({n})', { label: productLabel, n: catalog.length })}
          </h3>
          <p className="text-[11px] text-slate-500 m-0">
            {t('workspaceSettings.catalog.desc', 'Bảng giá niêm yết và phân loại danh mục kinh doanh trực thuộc không gian làm việc này')}
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
            <span>{t('workspaceSettings.catalog.add', 'Thêm {label}', { label: productLabel.toLowerCase() })}</span>
          </button>
        )}
      </div>

      {/* Table section */}
      <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs w-full">
        {catalog.length === 0 ? (
          <EmptyState
            title={t('workspaceSettings.catalog.emptyTitle', 'Chưa có {label} nào', { label: productLabel.toLowerCase() })}
            description={t('workspaceSettings.catalog.emptyDesc', 'Hãy nhấn nút Thêm ở trên để tạo sản phẩm, khóa học hoặc dịch vụ kinh doanh mới.')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/50 text-slate-500 font-semibold text-[11px]">
                  <th className="px-4 py-2.5">{t('workspaceSettings.catalog.colName', 'Tên mục')}</th>
                  <th className="px-4 py-2.5">{t('workspaceSettings.catalog.colCode', 'Mã định danh')}</th>
                  <th className="px-4 py-2.5">{t('workspaceSettings.catalog.colCategory', 'Nhóm / Danh mục')}</th>
                  <th className="px-4 py-2.5 text-right">{t('workspaceSettings.catalog.colPrice', 'Giá niêm yết')}</th>
                  {isOwner && <th className="px-4 py-2.5 text-center w-16">{t('workspaceSettings.catalog.colActions', 'Thao tác')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {catalog.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-2.5 font-semibold text-slate-900">
                      {prod.name}
                      {prod.description && (
                        <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                          {prod.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 font-mono text-[11px]">
                      {prod.code || '—'}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-medium border border-slate-200 rounded-md">
                        {prod.category}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-blue-600 font-mono text-xs whitespace-nowrap">
                      {new Intl.NumberFormat('vi-VN').format(prod.defaultPrice)} đ
                    </td>
                    {isOwner && (
                      <td className="px-4 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleDelete(prod.id)}
                          disabled={isLoading}
                          title={t('workspaceSettings.catalog.deleteItem', 'Xóa mục')}
                          className="h-6 w-6 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 inline-flex items-center justify-center transition-colors cursor-pointer border border-transparent hover:border-rose-200 disabled:opacity-30"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        productLabel={productLabel}
        onSave={handleSaveProduct}
        isLoading={isLoading}
      />
    </div>
  );
};

