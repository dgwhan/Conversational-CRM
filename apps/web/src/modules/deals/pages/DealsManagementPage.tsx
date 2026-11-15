import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  GraduationCap,
  Plus,
  Search,
  RefreshCw,
  LayoutGrid,
  List,
  Edit2,
  Trash2,
  Calendar,
} from 'lucide-react';
import { apiClient } from '../../../lib/api-client/index.js';
import type { DealItem, CreateDealPayload, UpdateDealPayload } from '../../../lib/api-client/deals.js';
import { useWorkspaceConfig } from '../../workspace/WorkspaceConfigContext.js';
import { useTranslation } from '../../../i18n/index.js';
import { notify } from '../../../components/feedback/toastEmitter.js';
import { DealModal } from '../components/DealModal.js';
import { Avatar } from '../../../components/common/Avatar.js';
import { Tabs } from '../../../components/ui/index.js';
import { Modal } from '../../../components/ui/Modal.js';
import { ModalIcon } from '../../../components/ui/ModalIcon.js';
import { SearchableSelect } from '../../../components/ui/SearchableSelect.js';

type ViewMode = 'grid' | 'table';
type StatusFilter = 'ALL' | 'OPEN' | 'WON' | 'LOST';

export const DealsManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const { config, activeWorkspaceId, staffMembers } = useWorkspaceConfig();

  const [deals, setDeals] = useState<DealItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedDealToEdit, setSelectedDealToEdit] = useState<DealItem | null>(null);
  const [dealToDelete, setDealToDelete] = useState<DealItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const loadDeals = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.getDeals({
        workspaceId: activeWorkspaceId || undefined,
        search: searchQuery.trim() || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        limit: 100,
      });
      const items = res?.items || (Array.isArray(res) ? res : []);
      setDeals(items);
    } catch (err: any) {
      console.warn('Không thể tải danh sách Đợt Tuyển Sinh:', err?.message);
      notify.error(err?.message || 'Không thể tải danh sách đợt tuyển sinh.');
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkspaceId, searchQuery, statusFilter]);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  const handleOpenCreateModal = () => {
    setSelectedDealToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (deal: DealItem) => {
    setSelectedDealToEdit(deal);
    setIsModalOpen(true);
  };

  const handleSaveDeal = async (
    payload: CreateDealPayload | UpdateDealPayload,
    dealId?: string
  ) => {
    if (dealId) {
      await apiClient.updateDeal(dealId, payload as UpdateDealPayload);
      notify.success(t('deals.saveDealSuccess', 'Đã lưu thông tin dịch vụ thành công!'));
    } else {
      await apiClient.createDeal({
        ...(payload as CreateDealPayload),
        workspaceId: activeWorkspaceId || undefined,
      });
      notify.success(t('deals.saveDealSuccess', 'Đã ghi nhận đợt tuyển sinh mới!'));
    }
    await loadDeals();
  };

  const handleConfirmDelete = async () => {
    if (!dealToDelete) return;
    try {
      setIsDeleting(true);
      await apiClient.deleteDeal(dealToDelete.id);
      notify.success(t('deals.deleteDealSuccess', 'Đã xóa bản ghi thành công!'));
      setDealToDelete(null);
      await loadDeals();
    } catch (err: any) {
      notify.error(err?.message || 'Không thể xóa đợt tuyển sinh.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleQuickStatusChange = async (dealId: string, newStatus: 'OPEN' | 'WON' | 'LOST') => {
    try {
      await apiClient.updateDeal(dealId, { status: newStatus });
      notify.success('Đã cập nhật trạng thái dịch vụ!');
      await loadDeals();
    } catch (err: any) {
      notify.error(err?.message || 'Không thể cập nhật trạng thái.');
    }
  };

  const stats = useMemo(() => {
    const total = deals.length;
    const inProgress = deals.filter((d) => d.status === 'OPEN').length;
    const completed = deals.filter((d) => d.status === 'WON').length;
    const totalRevenue = deals.reduce((sum, d) => sum + (d.actualRevenue || d.expectedRevenue || 0), 0);
    return { total, inProgress, completed, totalRevenue };
  }, [deals]);

  const renderStatusPill = (status: 'OPEN' | 'WON' | 'LOST') => {
    switch (status) {
      case 'WON':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{t('deals.serviceStatusCompleted', 'Đã tốt nghiệp')}</span>
          </span>
        );
      case 'LOST':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>{t('deals.serviceStatusCancelled', 'Đã hủy / Bảo lưu')}</span>
          </span>
        );
      case 'OPEN':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            <span>{t('deals.serviceStatusInProgress', 'Đang đào tạo')}</span>
          </span>
        );
    }
  };

  return (
    <div className="workspace-flat-detail w-full min-h-full bg-white flex flex-col rounded-none border-none shadow-none">
      {/* 1. TOP HEADER ĐỒNG NHẤT */}
      <div className="w-full bg-slate-50/90 px-3.5 sm:px-6 md:px-10 pt-4 sm:pt-6 pb-4">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 m-0 truncate">
              {t('header.dealsTab', 'Quản Lý Đợt Tuyển Sinh & Dịch Vụ')}
            </h1>
            <p className="m-0 text-xs sm:text-[13px] text-slate-500 mt-1 truncate">
              Theo dõi lịch sử học viên, niên khóa tuyển sinh và các dịch vụ đào tạo độc lập
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => loadDeals()}
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer shadow-none"
              title="Làm mới danh sách"
              aria-label="Làm mới danh sách"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin text-blue-600' : ''} />
            </button>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center justify-center gap-1.5 h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-[13px] font-medium transition-colors cursor-pointer shadow-none"
            >
              <Plus size={15} />
              <span>Ghi nhận đợt mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. THANH TABS SLIDING HỆ THỐNG */}
      <div className="w-full border-b border-slate-200 bg-slate-50/90 px-3.5 sm:px-6 md:px-10">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-end justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Tabs<StatusFilter>
              className="gap-5 sm:gap-8 !border-b-0"
              items={[
                { id: 'ALL', label: 'Tất cả' },
                { id: 'OPEN', label: 'Đang học' },
                { id: 'WON', label: 'Đã tốt nghiệp' },
                { id: 'LOST', label: 'Đã hủy' },
              ]}
              activeTab={statusFilter}
              onChange={(tab) => setStatusFilter(tab)}
            />
          </div>

          <div className="flex items-center gap-2 pb-2">
            <div className="relative flex-1 md:w-64">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm học viên, khóa học, niên khóa..."
                className="w-full h-8 pl-8 pr-3 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors shadow-none"
              />
            </div>

            <div className="inline-flex items-center h-8 bg-slate-200/70 p-0.5 rounded-lg shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`w-7 h-7 inline-flex items-center justify-center rounded-md transition-colors cursor-pointer shadow-none ${viewMode === 'table'
                    ? 'bg-white text-slate-950'
                    : 'text-slate-500 hover:text-slate-900'
                  }`}
                title="Xem dạng bảng"
                aria-label="Xem dạng bảng"
              >
                <List size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`w-7 h-7 inline-flex items-center justify-center rounded-md transition-colors cursor-pointer shadow-none ${viewMode === 'grid'
                    ? 'bg-white text-slate-950'
                    : 'text-slate-500 hover:text-slate-900'
                  }`}
                title="Xem dạng thẻ"
                aria-label="Xem dạng thẻ"
              >
                <LayoutGrid size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. DẢI CHỈ SỐ PHẲNG */}
      <div className="w-full border-b border-slate-200 bg-white px-3.5 sm:px-6 md:px-10">
        <div className="max-w-[1600px] mx-auto grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          <div className="py-3.5 pr-4 lg:pr-6 flex flex-col">
            <span className="text-xs font-medium text-slate-500">Tổng đợt / Dịch vụ</span>
            <span className="text-lg sm:text-xl font-semibold text-slate-950 tabular-nums mt-0.5">
              {stats.total}
            </span>
          </div>

          <div className="py-3.5 pl-4 lg:px-6 flex flex-col">
            <span className="text-xs font-medium text-slate-500">Đang học / Đào tạo</span>
            <span className="text-lg sm:text-xl font-semibold text-blue-700 tabular-nums mt-0.5">
              {stats.inProgress}
            </span>
          </div>

          <div className="py-3.5 pr-4 lg:px-6 flex flex-col">
            <span className="text-xs font-medium text-slate-500">Đã tốt nghiệp</span>
            <span className="text-lg sm:text-xl font-semibold text-emerald-700 tabular-nums mt-0.5">
              {stats.completed}
            </span>
          </div>

          <div className="py-3.5 pl-4 lg:pl-6 flex flex-col">
            <span className="text-xs font-medium text-slate-500">Tổng học phí ghi nhận</span>
            <span className="text-lg sm:text-xl font-semibold text-slate-950 tabular-nums mt-0.5">
              {stats.totalRevenue.toLocaleString('vi-VN')} đ
            </span>
          </div>
        </div>
      </div>

      {/* 4. NỘI DUNG CHÍNH */}
      <div className="w-full max-w-[1600px] mx-auto px-3.5 sm:px-6 md:px-10 py-6 sm:py-8 flex-1">
        {isLoading && deals.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <RefreshCw size={20} className="animate-spin text-blue-600 mx-auto mb-2" />
            <span>Đang tải danh sách đợt tuyển sinh...</span>
          </div>
        ) : deals.length === 0 ? (
          <div className="py-16 px-4 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/40">
            <GraduationCap size={24} className="text-slate-400 mx-auto mb-2.5" />
            <h3 className="m-0 text-sm font-semibold text-slate-900">
              Không tìm thấy đợt tuyển sinh nào
            </h3>
            <p className="m-0 text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Chưa có dữ liệu phù hợp hoặc học viên chưa đăng ký đợt nào.
            </p>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="mt-4 inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors cursor-pointer shadow-none"
            >
              <Plus size={14} />
              <span>Ghi nhận đợt đầu tiên</span>
            </button>
          </div>
        ) : viewMode === 'table' ? (
          <div className="w-full bg-white rounded-none border-none shadow-none">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-[13px] border-collapse border-b border-slate-200">
                <thead>
                  <tr className="bg-slate-50/80 border-y border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-2.5 px-3">Học viên</th>
                    <th className="py-2.5 px-3">Khóa học / Đợt</th>
                    <th className="py-2.5 px-3">Niên khóa</th>
                    <th className="py-2.5 px-3">Học phí</th>
                    <th className="py-2.5 px-3">Phụ trách</th>
                    <th className="py-2.5 px-3">Trạng thái</th>
                    <th className="py-2.5 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deals.map((deal) => {
                    const customerName = deal.customer?.fullName || deal.contact?.displayName || 'Học viên';
                    const customerPhone = deal.customer?.phone || deal.contact?.phoneNormalized;

                    return (
                      <tr key={deal.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <Avatar
                              src={deal.customer?.avatarUrl || undefined}
                              name={customerName}
                              size={30}
                              className="rounded-full shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="font-medium text-slate-950 truncate max-w-[170px]">
                                {customerName}
                              </div>
                              {customerPhone && (
                                <div className="text-[11px] text-slate-500 tabular-nums">
                                  {customerPhone}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 max-w-[260px]">
                          <div className="text-slate-900 font-medium truncate" title={deal.title}>
                            {deal.title}
                          </div>
                          {deal.courses && deal.courses.length > 0 && (
                            <div className="text-[11px] text-slate-500 truncate mt-0.5">
                              {deal.courses.join(', ')}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                          {deal.intake || '—'}
                        </td>

                        <td className="py-3 px-3 font-semibold text-slate-950 tabular-nums whitespace-nowrap">
                          {(deal.expectedRevenue || 0).toLocaleString('vi-VN')} đ
                        </td>

                        <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                          {deal.assignedStaffName || '—'}
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <SearchableSelect
                            value={deal.status}
                            onChange={(val) => handleQuickStatusChange(deal.id, val as any)}
                            options={[
                              { value: 'OPEN', label: 'Đang đào tạo', dotColor: '#2563eb' },
                              { value: 'WON', label: 'Đã tốt nghiệp', dotColor: '#10b981' },
                              { value: 'LOST', label: 'Đã hủy / Bảo lưu', dotColor: '#ef4444' },
                            ]}
                            size="sm"
                            searchable={false}
                            triggerClassName="!h-7 !text-xs !py-0 !px-2.5 !bg-slate-50 hover:!bg-slate-100 !border-slate-200/80 !shadow-none"
                            className="w-40"
                          />
                        </td>

                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(deal)}
                              className="p-1.5 rounded-md text-slate-500 hover:text-slate-950 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Chỉnh sửa"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDealToDelete(deal)}
                              className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Xóa"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {deals.map((deal) => {
              const customerName = deal.customer?.fullName || deal.contact?.displayName || 'Học viên';
              const customerPhone = deal.customer?.phone || deal.contact?.phoneNormalized;

              return (
                <div
                  key={deal.id}
                  className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors p-4 flex flex-col justify-between gap-3.5 min-w-0 shadow-none"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar
                          src={deal.customer?.avatarUrl || undefined}
                          name={customerName}
                          size={34}
                          className="rounded-full shrink-0"
                        />
                        <div className="min-w-0">
                          <h4
                            className="m-0 text-[13px] font-semibold text-slate-950 truncate"
                            title={customerName}
                          >
                            {customerName}
                          </h4>
                          {customerPhone && (
                            <span className="text-[11px] text-slate-500 tabular-nums block truncate">
                              {customerPhone}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0">{renderStatusPill(deal.status)}</div>
                    </div>

                    <div className="space-y-1.5 pt-2.5 border-t border-slate-100">
                      <h3
                        className="m-0 text-[13px] font-semibold text-slate-900 line-clamp-2 leading-snug"
                        title={deal.title}
                      >
                        {deal.title}
                      </h3>
                      {deal.intake && (
                        <div className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          <Calendar size={11} className="text-slate-500" />
                          <span>{deal.intake}</span>
                        </div>
                      )}
                    </div>

                    {deal.courses && deal.courses.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {deal.courses.map((course, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 truncate max-w-full"
                          >
                            {course}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Học phí</span>
                      <span className="font-semibold text-slate-950 tabular-nums">
                        {(deal.expectedRevenue || 0).toLocaleString('vi-VN')} đ
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-500 shrink-0">Trạng thái</span>
                      <SearchableSelect
                        value={deal.status}
                        onChange={(val) => handleQuickStatusChange(deal.id, val as any)}
                        options={[
                          { value: 'OPEN', label: 'Đang học', dotColor: '#2563eb' },
                          { value: 'WON', label: 'Đã tốt nghiệp', dotColor: '#10b981' },
                          { value: 'LOST', label: 'Đã hủy', dotColor: '#ef4444' },
                        ]}
                        size="sm"
                        searchable={false}
                        triggerClassName="!h-7 !text-[11px] !py-0 !px-2 !shadow-none"
                        className="w-32"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(deal)}
                        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-medium transition-colors cursor-pointer"
                      >
                        <Edit2 size={12} />
                        <span>Sửa</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDealToDelete(deal)}
                        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium transition-colors cursor-pointer"
                      >
                        <Trash2 size={12} />
                        <span>Xóa</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DEAL MODAL */}
      <DealModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedDealToEdit(null);
        }}
        dealToEdit={selectedDealToEdit}
        customerId={selectedDealToEdit?.customerId || undefined}
        customerName={
          selectedDealToEdit?.customer?.fullName ||
          selectedDealToEdit?.contact?.displayName ||
          undefined
        }
        customerPhone={
          selectedDealToEdit?.customer?.phone ||
          selectedDealToEdit?.contact?.phoneNormalized ||
          undefined
        }
        customerEmail={
          selectedDealToEdit?.customer?.email ||
          selectedDealToEdit?.contact?.email ||
          undefined
        }
        workspaceId={activeWorkspaceId}
        pipelineStages={config.pipelineStages}
        catalog={config.productCatalog}
        staffList={staffMembers as any}
        onSave={handleSaveDeal}
      />

      {/* Pop-up Xác nhận xóa */}
      <Modal
        isOpen={Boolean(dealToDelete)}
        onClose={() => !isDeleting && setDealToDelete(null)}
        variant="rounded"
        showCloseButton={!isDeleting}
        icon={<ModalIcon variant="danger" icon={<Trash2 size={18} className="text-white" />} />}
        title={t('deals.deleteModalTitle', 'Xác nhận xóa cơ hội tuyển sinh')}
        description={t(
          'deals.deleteModalDescription',
          'Bạn có chắc chắn muốn xóa bản ghi này? Thao tác này sẽ xóa vĩnh viễn và không thể hoàn tác.'
        )}
        primaryAction={{
          label: isDeleting
            ? t('common.loading', 'Đang xóa...')
            : t('common.delete', 'Xóa vĩnh viễn'),
          onClick: handleConfirmDelete,
          variant: 'danger',
          disabled: isDeleting,
          loading: isDeleting,
        }}
        secondaryAction={{
          label: t('common.cancel', 'Hủy bỏ'),
          onClick: () => setDealToDelete(null),
          disabled: isDeleting,
        }}
      >
        {dealToDelete && (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-950 text-[13px] truncate">
                {dealToDelete.title}
              </span>
              {dealToDelete.intake && (
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-200/80 text-slate-700 shrink-0">
                  {dealToDelete.intake}
                </span>
              )}
            </div>

            <div className="text-slate-600">
              Học viên:{' '}
              <strong className="text-slate-900">
                {dealToDelete.customer?.fullName ||
                  dealToDelete.contact?.displayName ||
                  'Chưa định danh'}
              </strong>
            </div>

            {dealToDelete.courses && dealToDelete.courses.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {dealToDelete.courses.map((course, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700"
                  >
                    {course}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between text-slate-500 pt-2 border-t border-slate-200/80">
              <span>Giá trị dự kiến</span>
              <strong className="text-slate-950 font-semibold tabular-nums">
                {(dealToDelete.expectedRevenue || 0).toLocaleString('vi-VN')} đ
              </strong>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};