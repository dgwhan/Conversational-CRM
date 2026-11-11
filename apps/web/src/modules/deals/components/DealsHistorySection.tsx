import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Plus,
  DollarSign,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Award,
  ExternalLink,
} from 'lucide-react';
import { apiClient } from '../../../lib/api-client/index.js';
import type { DealItem, CreateDealPayload, UpdateDealPayload } from '../../../lib/api-client/deals.js';
import type { PipelineStageConfig, ProductItemConfig } from '../../workspace/workspaceConfig.types.js';
import type { AssignedStaff } from '../../inbox/types.js';
import { notify } from '../../../components/feedback/toastEmitter.js';
import { DealModal } from './DealModal.js';
import { useTranslation } from '../../../i18n/index.js';
import { ROUTES, buildRoute } from '../../../config/routes.js';

export interface DealsHistorySectionProps {
  customerId?: string;
  contactId?: string;
  customerName?: string;
  pipelineStages: PipelineStageConfig[];
  catalog: ProductItemConfig[];
  staffList?: AssignedStaff[];
  onNavigateToKanban?: () => void;
  onDealUpdated?: (deals: DealItem[]) => void;
}

export const DealsHistorySection: React.FC<DealsHistorySectionProps> = ({
  customerId,
  contactId,
  customerName = 'Ứng viên',
  pipelineStages,
  catalog,
  staffList = [],
  onNavigateToKanban: _onNavigateToKanban,
  onDealUpdated,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [deals, setDeals] = useState<DealItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDealToEdit, setSelectedDealToEdit] = useState<DealItem | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeMenuDealId, setActiveMenuDealId] = useState<string | null>(null);

  const targetId = customerId || contactId;
  const onDealUpdatedRef = useRef(onDealUpdated);

  useEffect(() => {
    onDealUpdatedRef.current = onDealUpdated;
  }, [onDealUpdated]);

  const loadDeals = useCallback(async () => {
    if (!targetId) return;
    try {
      setIsLoading(true);
      const res = await apiClient.getDealsByCustomer(targetId);
      const list = Array.isArray(res) ? res : (res as any)?.data || [];
      setDeals(list);
      if (onDealUpdatedRef.current) onDealUpdatedRef.current(list);
    } catch (err: any) {
      console.warn('Không thể tải danh sách Deals:', err?.message);
    } finally {
      setIsLoading(false);
    }
  }, [targetId]);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  const handleOpenCreateModal = () => {
    setSelectedDealToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (deal: DealItem) => {
    setSelectedDealToEdit(deal);
    setActiveMenuDealId(null);
    setIsModalOpen(true);
  };

  const handleSaveDeal = async (
    payload: CreateDealPayload | UpdateDealPayload,
    dealId?: string
  ) => {
    if (dealId) {
      await apiClient.updateDeal(dealId, payload as UpdateDealPayload);
    } else {
      const createData = payload as CreateDealPayload;
      await apiClient.createDeal({
        ...createData,
        customerId,
        contactId,
        title: createData.title || t('deals.sectionTitle', 'Cơ hội tuyển sinh'),
      });
    }
    await loadDeals();
  };

  const handleDeleteDeal = async (dealId: string) => {
    if (!window.confirm(t('deals.deleteDealConfirm', 'Bạn có chắc chắn muốn xóa cơ hội này?'))) return;
    try {
      await apiClient.deleteDeal(dealId);
      notify.success(t('deals.deleteDealSuccess', 'Đã xóa cơ hội tuyển sinh.'));
      await loadDeals();
    } catch (err: any) {
      notify.error(err?.message || 'Không thể xóa cơ hội.');
    } finally {
      setActiveMenuDealId(null);
    }
  };

  const handleQuickChangeStatus = async (dealId: string, newStatus: 'OPEN' | 'WON' | 'LOST') => {
    try {
      await apiClient.updateDeal(dealId, { status: newStatus });
      notify.success(t('deals.saveDealSuccess', 'Đã cập nhật trạng thái dịch vụ!'));
      await loadDeals();
    } catch (err: any) {
      notify.error(err?.message || 'Không thể cập nhật trạng thái.');
    }
  };

  const completedDealsCount = useMemo(() => deals.filter((d) => d.status === 'WON').length, [deals]);
  const totalValue = useMemo(
    () => deals.reduce((sum, d) => sum + (d.actualRevenue || d.expectedRevenue || 0), 0),
    [deals]
  );

  const getStatusBadge = (status: 'OPEN' | 'WON' | 'LOST') => {
    switch (status) {
      case 'WON':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={11} className="text-emerald-600" />
            <span>{t('deals.serviceStatusCompleted', 'Đã hoàn thành')}</span>
          </span>
        );
      case 'LOST':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle size={11} className="text-rose-500" />
            <span>{t('deals.serviceStatusCancelled', 'Đã hủy / Bảo lưu')}</span>
          </span>
        );
      case 'OPEN':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock size={11} className="text-blue-500" />
            <span>{t('deals.serviceStatusInProgress', 'Đang học')}</span>
          </span>
        );
    }
  };

  return (
    <div className="p-4 bg-white space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1.5 text-left group cursor-pointer focus:outline-none min-w-0"
        >
          <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <GraduationCap size={13} />
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider group-hover:text-blue-600 transition-colors truncate">
              {t('deals.sectionTitle', 'Lịch Sử Dịch Vụ & Đợt')} ({deals.length})
            </span>
            {completedDealsCount > 0 && (
              <span
                className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200/80"
                title={t('deals.returningCustomerTooltip', 'Học viên cũ đã hoàn thành khóa học')}
              >
                <Award size={10} className="text-amber-500" />
                <span>Cựu học viên</span>
              </span>
            )}
          </div>
          {isCollapsed ? (
            <ChevronDown size={14} className="text-slate-400 shrink-0 ml-1" />
          ) : (
            <ChevronUp size={14} className="text-slate-400 shrink-0 ml-1" />
          )}
        </button>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer shrink-0"
          title={t('deals.addIntakeTitle', 'Ghi nhận đợt tuyển sinh / khóa học mới')}
        >
          <Plus size={12} />
          <span>{t('deals.addIntakeBtn', 'Thêm đợt')}</span>
        </button>
      </div>

      {/* Summary strip if deals exist */}
      {!isCollapsed && deals.length > 0 && (
        <div className="px-2.5 py-1.5 rounded-md bg-slate-50 border border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>
            Đã tích lũy: <strong className="text-slate-700">{deals.length}</strong> đợt / dịch vụ
          </span>
          <span className="font-semibold text-emerald-700">
            {totalValue.toLocaleString('vi-VN')} đ
          </span>
        </div>
      )}

      {/* Content */}
      {!isCollapsed && (
        <div className="space-y-2.5">
          {isLoading && deals.length === 0 ? (
            <div className="text-center py-4 text-xs text-slate-400">{t('deals.loadingDeals', 'Đang tải lịch sử dịch vụ...')}</div>
          ) : deals.length === 0 ? (
            <div className="text-center py-4 px-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/50">
              <p className="text-xs text-slate-500 m-0 mb-2">{t('deals.noDealsYet', 'Chưa có lịch sử dịch vụ / đợt tuyển sinh nào')}</p>
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 text-white text-[11px] font-medium hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <Plus size={11} />
                <span>{t('deals.createFirstDealBtn', 'Ghi nhận đợt đầu tiên')}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {deals.map((deal) => (
                <div
                  key={deal.id}
                  className="relative p-2.5 rounded-lg border border-slate-200/90 bg-white hover:border-blue-300 hover:shadow-xs transition-all space-y-2"
                >
                  {/* Top row: Title + Intake + Actions */}
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-800 text-xs truncate">
                          {deal.title}
                        </span>
                        {deal.intake && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80">
                            {deal.intake}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {getStatusBadge(deal.status)}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveMenuDealId(activeMenuDealId === deal.id ? null : deal.id)
                          }
                          className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                        >
                          <MoreVertical size={13} />
                        </button>

                        {activeMenuDealId === deal.id && (
                          <div className="absolute right-0 top-6 z-20 w-28 bg-white rounded-lg shadow-lg border border-slate-200 py-1 text-xs">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(deal)}
                              className="w-full px-2.5 py-1 text-left flex items-center gap-1.5 text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                              <Edit2 size={12} className="text-blue-500" />
                              <span>{t('deals.editAction', 'Chỉnh sửa')}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDeal(deal.id)}
                              className="w-full px-2.5 py-1 text-left flex items-center gap-1.5 text-rose-600 hover:bg-rose-50 cursor-pointer"
                            >
                              <Trash2 size={12} />
                              <span>{t('deals.deleteAction', 'Xóa')}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Service Status Selector (Removed Phễu Pipeline stage) */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <span className="text-slate-500 text-[11px] font-medium">{t('deals.statusLabel', 'Trạng thái dịch vụ:')}</span>
                    <select
                      value={deal.status}
                      onChange={(e) => handleQuickChangeStatus(deal.id, e.target.value as any)}
                      className="h-6 px-1.5 rounded border border-slate-200 text-[11px] font-medium text-slate-700 bg-slate-50/70 hover:bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="OPEN">{t('deals.serviceStatusInProgress', 'Đang học / Đang tham gia')}</option>
                      <option value="WON">{t('deals.serviceStatusCompleted', 'Đã hoàn thành / Tốt nghiệp')}</option>
                      <option value="LOST">{t('deals.serviceStatusCancelled', 'Đã hủy / Bảo lưu')}</option>
                    </select>
                  </div>

                  {/* Courses & Value */}
                  <div className="space-y-1 text-xs">
                    {deal.courses && deal.courses.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {deal.courses.map((course, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100"
                          >
                            {course}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-600 pt-0.5">
                      <span className="flex items-center gap-1 font-semibold text-emerald-700">
                        <DollarSign size={11} className="text-emerald-500" />
                        <span>{(deal.expectedRevenue || 0).toLocaleString('vi-VN')} đ</span>
                      </span>

                      {deal.assignedStaffName && (
                        <span
                          className="flex items-center gap-1 text-slate-500 truncate max-w-[120px]"
                          title={`${t('deals.assignedStaffLabel', 'Phụ trách')}: ${deal.assignedStaffName}`}
                        >
                          <User size={11} className="text-slate-400" />
                          <span className="truncate">{deal.assignedStaffName}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick link to the Dedicated Deals Management Page */}
          <button
            type="button"
            onClick={() => navigate(customerName ? buildRoute.deals(customerName) : ROUTES.DEALS)}
            className="w-full py-1.5 px-2 rounded-lg border border-dashed border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-400 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Mở trang Quản lý Đợt Tuyển Sinh</span>
            <ExternalLink size={11} />
          </button>
        </div>
      )}

      {/* Modal Thêm / Chỉnh Sửa Deal */}
      <DealModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedDealToEdit(null);
        }}
        dealToEdit={selectedDealToEdit}
        customerId={customerId}
        contactId={contactId}
        customerName={customerName}
        pipelineStages={pipelineStages}
        catalog={catalog}
        staffList={staffList}
        onSave={handleSaveDeal}
      />
    </div>
  );
};
