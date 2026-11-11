import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  GraduationCap,
  Plus,
  Search,
  RefreshCw,
  LayoutGrid,
  List,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Calendar,
  Layers,
} from 'lucide-react';
import { apiClient } from '../../../lib/api-client/index.js';
import type { DealItem, CreateDealPayload, UpdateDealPayload } from '../../../lib/api-client/deals.js';
import { useWorkspaceConfig } from '../../workspace/WorkspaceConfigContext.js';
import { useTranslation } from '../../../i18n/index.js';
import { notify } from '../../../components/feedback/toastEmitter.js';
import { DealModal } from '../components/DealModal.js';
import { Avatar } from '../../../components/common/Avatar.js';
import { Modal } from '../../../components/ui/Modal.js';
import { ModalIcon } from '../../../components/ui/ModalIcon.js';

type ViewMode = 'grid' | 'table';
type StatusFilter = 'ALL' | 'OPEN' | 'WON' | 'LOST';

export const DealsManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const { config, activeWorkspaceId, staffMembers } = useWorkspaceConfig();

  const [deals, setDeals] = useState<DealItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedDealToEdit, setSelectedDealToEdit] = useState<DealItem | null>(null);
  const [dealToDelete, setDealToDelete] = useState<DealItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Fetch Deals list
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

  // Actions
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
        ...payload as CreateDealPayload,
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

  // KPIs
  const stats = useMemo(() => {
    const total = deals.length;
    const inProgress = deals.filter((d) => d.status === 'OPEN').length;
    const completed = deals.filter((d) => d.status === 'WON').length;
    const totalRevenue = deals.reduce((sum, d) => sum + (d.actualRevenue || d.expectedRevenue || 0), 0);
    return { total, inProgress, completed, totalRevenue };
  }, [deals]);

  const renderStatusBadge = (status: 'OPEN' | 'WON' | 'LOST') => {
    switch (status) {
      case 'WON':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={12} className="text-emerald-600" />
            <span>{t('deals.serviceStatusCompleted', 'Đã tốt nghiệp')}</span>
          </span>
        );
      case 'LOST':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle size={12} className="text-rose-500" />
            <span>{t('deals.serviceStatusCancelled', 'Đã hủy / Bảo lưu')}</span>
          </span>
        );
      case 'OPEN':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock size={12} className="text-blue-500" />
            <span>{t('deals.serviceStatusInProgress', 'Đang đào tạo')}</span>
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-full bg-slate-50/70 overflow-hidden">
      {/* 1. TOP HEADER & ACTIONS */}
      <div className="px-4 py-3 sm:px-6 sm:py-4 bg-white border-b border-slate-200/90 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Title Box */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 shadow-2xs">
              <GraduationCap size={20} />
            </div>
            <div className="min-w-0">
              <h1 className="m-0 text-base sm:text-lg font-bold text-slate-900 truncate">
                {t('header.dealsTab', 'Quản Lý Đợt Tuyển Sinh & Dịch Vụ')}
              </h1>
              <p className="m-0 text-xs text-slate-500 truncate hidden sm:block">
                Quản lý lịch sử học viên, niên khóa tuyển sinh và các dịch vụ đào tạo độc lập
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 w-full sm:w-auto">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-blue-600 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Xem dạng thẻ"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-blue-600 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Xem dạng bảng"
              >
                <List size={15} />
              </button>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => loadDeals()}
              className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer shrink-0"
              title="Làm mới danh sách"
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            </button>

            {/* Add Deal Button */}
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer shrink-0"
            >
              <Plus size={16} />
              <span>Ghi nhận đợt mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. BODY CONTENT (Cuộn mượt mà không tràn) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 lg:p-6 space-y-4">
        {/* KPI METRIC STRIP */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {/* Card 1: Tổng số */}
          <div className="p-3 sm:p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Layers size={18} />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-slate-500 truncate block">Tổng đợt / Dịch vụ</span>
              <span className="text-base sm:text-xl font-bold text-slate-800 block truncate">{stats.total}</span>
            </div>
          </div>

          {/* Card 2: Đang đào tạo */}
          <div className="p-3 sm:p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <Clock size={18} />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-slate-500 truncate block">Đang học / Đào tạo</span>
              <span className="text-base sm:text-xl font-bold text-sky-700 block truncate">{stats.inProgress}</span>
            </div>
          </div>

          {/* Card 3: Đã tốt nghiệp */}
          <div className="p-3 sm:p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-slate-500 truncate block">Đã tốt nghiệp</span>
              <span className="text-base sm:text-xl font-bold text-emerald-700 block truncate">{stats.completed}</span>
            </div>
          </div>

          {/* Card 4: Tổng doanh thu */}
          <div className="p-3 sm:p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <DollarSign size={18} />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-slate-500 truncate block">Tổng học phí</span>
              <span className="text-base sm:text-xl font-bold text-emerald-700 block truncate">
                {stats.totalRevenue.toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 min-w-0">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo học viên, khóa học, niên khóa..."
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar shrink-0 pb-1 sm:pb-0">
            {(
              [
                { id: 'ALL', label: 'Tất cả' },
                { id: 'OPEN', label: 'Đang học' },
                { id: 'WON', label: 'Đã tốt nghiệp' },
                { id: 'LOST', label: 'Đã hủy' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  statusFilter === f.id
                    ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200'
                    : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* DEALS LIST CONTAINER */}
        {isLoading && deals.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
            <RefreshCw size={24} className="animate-spin text-blue-500 mx-auto mb-2" />
            <span>Đang tải danh sách đợt tuyển sinh...</span>
          </div>
        ) : deals.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-200">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <GraduationCap size={24} />
            </div>
            <h3 className="m-0 text-sm font-semibold text-slate-800">Không tìm thấy đợt tuyển sinh nào</h3>
            <p className="m-0 text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Chưa có dữ liệu phù hợp hoặc học viên chưa đăng ký đợt nào. Bấm nút dưới đây để tạo mới.
            </p>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            >
              <Plus size={15} />
              <span>Ghi nhận đợt đầu tiên</span>
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* CARD GRID VIEW */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {deals.map((deal) => {
              const customerName = deal.customer?.fullName || deal.contact?.displayName || 'Học viên';
              const customerPhone = deal.customer?.phone || deal.contact?.phoneNormalized;
              return (
                <div
                  key={deal.id}
                  className="bg-white rounded-xl border border-slate-200/90 hover:border-blue-300 hover:shadow-md transition-all p-4 flex flex-col justify-between gap-3 min-w-0"
                >
                  {/* Card Header: Customer Info + Status */}
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar
                          src={deal.customer?.avatarUrl || undefined}
                          name={customerName}
                          size={36}
                          className="rounded-full border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="m-0 text-xs sm:text-sm font-bold text-slate-900 truncate" title={customerName}>
                            {customerName}
                          </h4>
                          {customerPhone && (
                            <span className="text-[11px] text-slate-400 font-mono block truncate">
                              {customerPhone}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0">
                        {renderStatusBadge(deal.status)}
                      </div>
                    </div>

                    {/* Course Title & Intake */}
                    <div className="space-y-1 pt-1 border-t border-slate-100">
                      <h3 className="m-0 text-xs sm:text-sm font-semibold text-slate-800 line-clamp-2" title={deal.title}>
                        {deal.title}
                      </h3>
                      {deal.intake && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80">
                          <Calendar size={10} className="text-slate-500" />
                          <span>{deal.intake}</span>
                        </span>
                      )}
                    </div>

                    {/* Courses Tag list */}
                    {deal.courses && deal.courses.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {deal.courses.map((course, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100 truncate max-w-full"
                          >
                            {course}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Revenue + Quick Actions */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 text-[11px]">Học phí:</span>
                      <span className="font-bold text-emerald-700 text-xs sm:text-sm">
                        {(deal.expectedRevenue || 0).toLocaleString('vi-VN')} đ
                      </span>
                    </div>

                    {/* Quick status selector */}
                    <div className="flex items-center justify-between text-xs gap-1">
                      <span className="text-slate-400 text-[10px] shrink-0">Chuyển nhanh:</span>
                      <select
                        value={deal.status}
                        onChange={(e) => handleQuickStatusChange(deal.id, e.target.value as any)}
                        className="h-6 px-1.5 rounded border border-slate-200 text-[10px] font-medium text-slate-700 bg-slate-50/70 hover:bg-white focus:outline-none focus:border-blue-500 cursor-pointer min-w-0 truncate"
                      >
                        <option value="OPEN">Đang học</option>
                        <option value="WON">Đã tốt nghiệp</option>
                        <option value="LOST">Đã hủy</option>
                      </select>
                    </div>

                    {/* Bottom Action buttons */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(deal)}
                        className="inline-flex items-center justify-center gap-1 h-7 rounded border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        <Edit2 size={12} className="text-blue-600" />
                        <span>Sửa</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDealToDelete(deal)}
                        className="inline-flex items-center justify-center gap-1 h-7 rounded border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-rose-600 text-[11px] font-medium transition-colors cursor-pointer"
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
        ) : (
          /* TABLE VIEW */
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-3 px-4">Học viên</th>
                    <th className="py-3 px-4">Khóa học / Đợt</th>
                    <th className="py-3 px-4">Niên khóa</th>
                    <th className="py-3 px-4">Học phí</th>
                    <th className="py-3 px-4">Phụ trách</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deals.map((deal) => {
                    const customerName = deal.customer?.fullName || deal.contact?.displayName || 'Học viên';
                    return (
                      <tr key={deal.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Avatar
                              src={deal.customer?.avatarUrl || undefined}
                              name={customerName}
                              size={28}
                              className="rounded-full border border-slate-200 shrink-0"
                            />
                            <span className="truncate max-w-[150px]">{customerName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-800 font-semibold max-w-[200px] truncate" title={deal.title}>
                          {deal.title}
                        </td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          {deal.intake || '---'}
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-700 whitespace-nowrap">
                          {(deal.expectedRevenue || 0).toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {deal.assignedStaffName || '---'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {renderStatusBadge(deal.status)}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(deal)}
                              className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 cursor-pointer"
                              title="Chỉnh sửa"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDealToDelete(deal)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 cursor-pointer"
                              title="Xóa"
                            >
                              <Trash2 size={13} />
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
        customerName={selectedDealToEdit?.customer?.fullName || selectedDealToEdit?.contact?.displayName || undefined}
        customerPhone={selectedDealToEdit?.customer?.phone || selectedDealToEdit?.contact?.phoneNormalized || undefined}
        customerEmail={selectedDealToEdit?.customer?.email || selectedDealToEdit?.contact?.email || undefined}
        workspaceId={activeWorkspaceId}
        pipelineStages={config.pipelineStages}
        catalog={config.productCatalog}
        staffList={staffMembers as any}
        onSave={handleSaveDeal}
      />

      {/* Pop-up Xác nhận xóa trực quan */}
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
          label: isDeleting ? t('common.loading', 'Đang xóa...') : t('common.delete', 'Xóa vĩnh viễn'),
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
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                {dealToDelete.title}
              </span>
              {dealToDelete.intake && (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-200 text-slate-700 shrink-0">
                  {dealToDelete.intake}
                </span>
              )}
            </div>

            <div className="text-slate-600 text-[11px]">
              Học viên: <strong className="text-slate-800">{dealToDelete.customer?.fullName || dealToDelete.contact?.displayName || 'Chưa định danh'}</strong>
            </div>

            {dealToDelete.courses && dealToDelete.courses.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {dealToDelete.courses.map((course, idx) => (
                  <span
                    key={idx}
                    className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100"
                  >
                    {course}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between text-slate-500 pt-2 border-t border-slate-200/80 text-[11px]">
              <span>Giá trị dự kiến:</span>
              <strong className="text-emerald-700 font-semibold text-xs">
                {(dealToDelete.expectedRevenue || 0).toLocaleString('vi-VN')} đ
              </strong>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
