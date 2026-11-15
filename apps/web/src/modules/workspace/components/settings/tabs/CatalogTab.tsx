import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { ProductItemConfig } from '../../../workspaceConfig.types.js';
import { EmptyState, ConfigSubSectionHeader } from '../../../../../components/ui/index.js';
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
    <div className="w-full space-y-6">
      {/* Sub-Section Toolbar Row */}
      <ConfigSubSectionHeader
        title={t('workspaceSettings.catalog.title', 'Danh sách {label} ({n})', { label: productLabel, n: catalog.length })}
        help={{
          title: `Danh mục ${productLabel}`,
          description:
            'Danh mục chuẩn hóa các sản phẩm, hàng hóa hoặc gói dịch vụ cùng mức giá niêm yết được áp dụng trong không gian làm việc.',
          example:
            `Nhân viên gắn mục "${productLabel} tiêu chuẩn" (Mã: SKU-01) vào giao dịch. Hệ thống tự động áp dụng giá niêm yết tương ứng và cập nhật tổng giá trị vào báo cáo doanh số dự kiến.`,
          rules: [
            'Mỗi mục trong danh mục có thể liên kết trực tiếp vào cơ hội kinh doanh và hồ sơ khách hàng.',
            'Mã định danh hỗ trợ phân loại dữ liệu báo cáo và kết nối với các hệ thống quản lý bên ngoài.',
            'Cập nhật giá niêm yết chỉ áp dụng cho các giao dịch tạo mới, không làm thay đổi các giao dịch đã hoàn tất.',
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
              <span>{t('workspaceSettings.catalog.add', 'Thêm {label}', { label: productLabel.toLowerCase() })}</span>
            </button>
          )
        }
      />

      {/* Unboxed Flat Table */}
      <div className="w-full border-t border-b border-slate-200 bg-white">
        {catalog.length === 0 ? (
          <div className="py-8">
            <EmptyState
              title={t('workspaceSettings.catalog.emptyTitle', 'Chưa có {label} nào', { label: productLabel.toLowerCase() })}
              description={t('workspaceSettings.catalog.emptyDesc', 'Hãy nhấn nút Thêm ở trên để tạo sản phẩm, khóa học hoặc dịch vụ kinh doanh mới.')}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-700 font-semibold text-xs">
                  <th className="px-3 py-3">{t('workspaceSettings.catalog.colName', 'Tên mục')}</th>
                  <th className="px-3 py-3">{t('workspaceSettings.catalog.colCode', 'Mã định danh')}</th>
                  <th className="px-3 py-3">{t('workspaceSettings.catalog.colCategory', 'Nhóm / Danh mục')}</th>
                  <th className="px-3 py-3 text-right">{t('workspaceSettings.catalog.colPrice', 'Giá niêm yết')}</th>
                  {isOwner && <th className="px-3 py-3 text-center w-16">{t('workspaceSettings.catalog.colActions', 'Thao tác')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {catalog.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-3 py-3 font-semibold text-slate-950">
                      {prod.name}
                      {prod.description && (
                        <div className="text-[11px] text-slate-600 font-normal mt-0.5">
                          {prod.description}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-700 font-mono text-[11px]">
                      {prod.code || '—'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200 rounded">
                        {prod.category}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-blue-700 font-mono text-xs whitespace-nowrap">
                      {new Intl.NumberFormat('vi-VN').format(prod.defaultPrice)} đ
                    </td>
                    {isOwner && (
                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDelete(prod.id)}
                          disabled={isLoading}
                          title={t('workspaceSettings.catalog.deleteItem', 'Xóa mục')}
                          className="h-7 w-7 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-300 text-red-600 inline-flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 shadow-2xs"
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

