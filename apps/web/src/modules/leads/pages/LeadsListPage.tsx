import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Filter,
  FileSpreadsheet,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  Users,
} from 'lucide-react';
import { Avatar } from '../../../components/common/Avatar.js';
import { Button } from '../../../components/ui/Button.js';
import { SearchInput } from '../../../components/ui/SearchInput.js';
import { SearchableSelect } from '../../../components/ui/SearchableSelect.js';
import { notify } from '../../../components/feedback/toastEmitter.js';
import { useTranslation } from '../../../i18n/index.js';
import { apiClient } from '../../../lib/api-client/index.js';
import type { CustomerListItem } from '../../../lib/api-client/customers.js';
import { useWorkspaceConfig } from '../../workspace/WorkspaceConfigContext.js';
import { ROUTES } from '../../../config/routes.js';

const PAGE_SIZE = 20;

const STATUS_FILTERS = [
  { value: 'ALL', labelKey: 'leads.status.all', label: 'Tất cả' },
  { value: 'POTENTIAL', labelKey: 'leads.status.potential', label: 'Tiềm năng' },
  { value: 'NEW', labelKey: 'leads.status.new', label: 'Mới' },
  { value: 'CONVERTED', labelKey: 'leads.status.converted', label: 'Đã chuyển đổi' },
  { value: 'UNQUALIFIED', labelKey: 'leads.status.unqualified', label: 'Chưa phù hợp' },
] as const;

const STATUS_STYLES: Record<string, { labelKey: string; label: string; dotColor: string; className: string }> = {
  NEW: {
    labelKey: 'leads.status.new',
    label: 'Mới',
    dotColor: 'bg-slate-400',
    className: 'bg-slate-100 text-slate-700',
  },
  POTENTIAL: {
    labelKey: 'leads.status.potential',
    label: 'Tiềm năng',
    dotColor: 'bg-blue-600',
    className: 'bg-blue-50 text-blue-700',
  },
  CONVERTED: {
    labelKey: 'leads.status.converted',
    label: 'Đã chuyển đổi',
    dotColor: 'bg-emerald-500',
    className: 'bg-emerald-50 text-emerald-700',
  },
  UNQUALIFIED: {
    labelKey: 'leads.status.unqualified',
    label: 'Chưa phù hợp',
    dotColor: 'bg-amber-500',
    className: 'bg-amber-50 text-amber-800',
  },
};

interface LeadsListPageProps {
  onOpenChat: (conversationId: string) => void;
}

export const LeadsListPage: React.FC<LeadsListPageProps> = ({ onOpenChat }) => {
  const { locale, t } = useTranslation();
  const { config, activeWorkspaceId } = useWorkspaceConfig();
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const importJobId = searchParams.get('importJobId') || '';
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>(() => (importJobId ? 'ALL' : 'POTENTIAL'));
  const [stageFilter, setStageFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const latestRequestRef = useRef(0);

  useEffect(() => {
    if (importJobId) {
      setStatusFilter('ALL');
      setPage(1);
    }
  }, [importJobId]);

  const clearImportFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('importJobId');
    setSearchParams(next, { replace: true });
    setPage(1);
  };

  const loadLeads = useCallback(async () => {
    const requestId = ++latestRequestRef.current;
    setIsLoading(true);
    setErrorMessage('');
    try {
      const result = await apiClient.getCustomers({
        workspaceId: activeWorkspaceId || undefined,
        search: searchTerm.trim() || undefined,
        leadStatus: statusFilter === 'ALL' ? undefined : statusFilter,
        leadStage: stageFilter || undefined,
        importJobId: importJobId || undefined,
        page,
        limit: PAGE_SIZE,
      });
      if (requestId !== latestRequestRef.current) return;
      setCustomers(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (error) {
      if (requestId !== latestRequestRef.current) return;
      const message =
        error instanceof Error ? error.message : t('leads.loadError', 'Không thể tải danh sách Lead.');
      setErrorMessage(message);
      notify.error(message, t('leads.loadErrorTitle', 'Lỗi tải danh sách Lead'));
    } finally {
      if (requestId === latestRequestRef.current) setIsLoading(false);
    }
  }, [activeWorkspaceId, importJobId, page, searchTerm, stageFilter, statusFilter, t]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const stageNames = useMemo(
    () => new Map(config.pipelineStages.map((stage) => [stage.id, stage])),
    [config.pipelineStages]
  );
  const dateLocale = locale === 'en' ? 'en-US' : 'vi-VN';
  const pageStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(page * PAGE_SIZE, total);

  const getStage = (leadStage?: string | null) => {
    if (!leadStage) return null;
    const directMatch = stageNames.get(leadStage);
    if (directMatch) return directMatch;
    const normalized = leadStage.startsWith('STAGE_') ? leadStage.slice(6) : `STAGE_${leadStage}`;
    return (
      stageNames.get(normalized) ||
      config.pipelineStages.find(
        (stage) => stage.id.replace(/^STAGE_/, '') === normalized.replace(/^STAGE_/, '')
      ) ||
      null
    );
  };

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setPage(1);
  }, []);

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleStageFilter = (value: string) => {
    setStageFilter(value);
    setPage(1);
  };

  return (
    <div className="workspace-flat-detail crm-leads-page flex h-full min-h-0 flex-col overflow-y-auto overflow-x-hidden bg-white rounded-none border-none shadow-none md:overflow-hidden">
      {/* 1. TOP HEADER ĐỒNG NHẤT */}
      <div className="shrink-0 bg-slate-50/90 px-3.5 pt-4 pb-3 sm:px-6 md:px-10 sm:pt-6">
        <div className="max-w-[1600px] mx-auto flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 m-0">
              {t('leads.pageTitle', 'Danh sách Lead')}
            </h1>
            <p className="m-0 mt-1 text-xs sm:text-[13px] text-slate-500">
              {t('leads.pageSubtitle', 'Theo dõi khách hàng tiềm năng và tiến độ tư vấn trong workspace.')}
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center xl:w-auto">
            <SearchInput
              value={searchInput}
              onChange={setSearchInput}
              onSearch={handleSearch}
              debounceMs={300}
              placeholder={t('leads.searchPlaceholder', 'Tìm theo tên, số điện thoại hoặc email')}
              className="min-w-0 w-full sm:w-72"
              shortcutHint="/"
            />
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                size="md"
                onClick={loadLeads}
                disabled={isLoading}
                icon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />}
                className="shrink-0 !shadow-none"
              >
                {t('leads.refresh', 'Làm mới')}
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate(ROUTES.LEADS_IMPORT)}
                icon={<FileSpreadsheet size={14} />}
                className="shrink-0 !shadow-none"
              >
                {t('leads.importFromFile', 'Nhập từ file')}
              </Button>
            </div>
          </div>
        </div>

        {importJobId && (
          <div className="max-w-[1600px] mx-auto mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
            <FileSpreadsheet size={14} className="shrink-0" />
            <span className="font-semibold">
              {t('leads.importFilterActive', 'Đang xem khách hàng của một lần nhập file')}
            </span>
            <button
              type="button"
              onClick={clearImportFilter}
              className="ml-auto rounded-md px-2 py-1 font-semibold text-blue-700 hover:bg-blue-100 cursor-pointer"
            >
              {t('leads.clearImportFilter', 'Bỏ lọc')}
            </button>
          </div>
        )}
      </div>

      {/* 2. FILTER BAR PHẲNG SOFT-FILLED */}
      <div className="shrink-0 border-b border-slate-200 bg-slate-50/90 px-3.5 pb-3 sm:px-6 md:px-10">
        <div className="max-w-[1600px] mx-auto flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div
            className="flex max-w-full gap-1.5 overflow-x-auto py-0.5"
            role="tablist"
            aria-label={t('leads.statusFilterLabel', 'Lọc trạng thái Lead')}
          >
            {STATUS_FILTERS.map((filter) => {
              const isActive = statusFilter === filter.value;
              return (
                <button
                  key={filter.value}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleStatusFilter(filter.value)}
                  className={`shrink-0 rounded-md px-2.5 py-1.5 text-xs transition-colors cursor-pointer ${isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-950 font-medium'
                    }`}
                >
                  {t(filter.labelKey, filter.label)}
                </button>
              );
            })}
          </div>

          <div className="flex min-w-0 items-center gap-2 text-xs text-slate-500">
            <Filter size={13} className="shrink-0 text-slate-400" />
            <span className="shrink-0">{t('leads.stageLabel', 'Giai đoạn')}</span>
            <SearchableSelect
              value={stageFilter}
              onChange={handleStageFilter}
              placeholder={t('leads.allStages', 'Tất cả giai đoạn')}
              allOptionLabel={t('leads.allStages', 'Tất cả giai đoạn')}
              options={config.pipelineStages.map((stage) => ({
                value: stage.id,
                label: stage.name,
              }))}
              size="sm"
              className="min-w-44"
              triggerClassName="!h-8 !bg-white !border-slate-200 !shadow-none"
              searchPlaceholder="Tìm giai đoạn..."
            />
          </div>
        </div>
      </div>

      {/* 3. NỘI DUNG BẢNG PHẲNG */}
      <div className="w-full max-w-[1600px] mx-auto flex flex-col px-3.5 py-4 sm:px-6 md:px-10 sm:py-5 md:min-h-0 md:flex-1">
        <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
            <span>{t('leads.profilesHeading', 'Hồ sơ Lead')}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 tabular-nums">
              {total.toLocaleString(dateLocale)}
            </span>
          </div>
          <span className="text-xs text-slate-500 tabular-nums">
            {total
              ? t('leads.showingRange', 'Hiển thị {start}–{end} trên {total}', {
                start: pageStart,
                end: pageEnd,
                total: total.toLocaleString(dateLocale),
              })
              : t('leads.noProfiles', 'Không có hồ sơ')}
          </span>
        </div>

        <div className="overflow-auto bg-white border-b border-slate-200 md:min-h-0 md:flex-1">
          {isLoading ? (
            <div className="flex min-h-64 items-center justify-center gap-2 text-xs text-slate-500">
              <RefreshCw size={16} className="animate-spin text-blue-600" />
              {t('leads.loading', 'Đang tải danh sách Lead...')}
            </div>
          ) : errorMessage ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-4 text-center">
              <CircleAlert size={24} className="text-rose-500" />
              <p className="m-0 max-w-lg text-xs text-slate-600">{errorMessage}</p>
              <Button variant="secondary" size="sm" onClick={loadLeads} icon={<RefreshCw size={13} />}>
                {t('leads.retry', 'Thử tải lại')}
              </Button>
            </div>
          ) : customers.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-2 px-4 text-center">
              <Users size={22} className="text-slate-400" />
              <p className="m-0 text-sm font-semibold text-slate-900">
                {t('leads.emptyTitle', 'Chưa tìm thấy Lead phù hợp')}
              </p>
              <p className="m-0 max-w-md text-xs text-slate-500">
                {t('leads.emptyHint', 'Thử đổi trạng thái, giai đoạn hoặc từ khóa tìm kiếm.')}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile List */}
              <ul className="m-0 list-none divide-y divide-slate-100 border-t border-slate-200 p-0 md:hidden">
                {customers.map((customer) => {
                  const conversation = customer.conversations?.[0];
                  const stage = getStage(customer.leadStage);
                  const status = STATUS_STYLES[customer.leadStatus || 'NEW'] || STATUS_STYLES.NEW;
                  const channel =
                    conversation?.channelAccount?.channel ||
                    (customer.importJobId || customer.source
                      ? t('leads.importedChannel', 'Nhập file')
                      : '—');
                  const course = customer.interestCourses?.[0];
                  const activityDate = conversation?.lastMessageAt || customer.updatedAt;

                  return (
                    <li key={customer.id} className="flex flex-col gap-2 py-3 px-1">
                      <div className="flex items-start gap-2.5">
                        <Avatar src={customer.avatarUrl} name={customer.fullName} size={34} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="m-0 min-w-0 truncate text-[13px] font-semibold text-slate-950">
                              {customer.fullName}
                            </p>
                            <span
                              className={`inline-flex items-center gap-1 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${status.className}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
                              {t(status.labelKey, status.label)}
                            </span>
                          </div>
                          <div className="mt-0.5 flex flex-col gap-0.5 text-[11px] text-slate-500 tabular-nums">
                            {customer.phone && (
                              <span className="inline-flex min-w-0 items-center gap-1">
                                <Phone size={11} className="shrink-0" />
                                <span className="truncate">{customer.phone}</span>
                              </span>
                            )}
                            {customer.email && (
                              <span className="inline-flex min-w-0 items-center gap-1">
                                <Mail size={11} className="shrink-0" />
                                <span className="truncate">{customer.email}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                          {channel}
                        </span>
                        {stage ? (
                          <span className="inline-flex max-w-full items-center gap-1.5 rounded bg-slate-100/70 px-2 py-0.5 font-medium text-slate-700">
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ backgroundColor: stage.color || '#64748b' }}
                            />
                            <span className="truncate">{stage.name}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            {t('leads.noStage', 'Chưa phân giai đoạn')}
                          </span>
                        )}
                        {course && (
                          <span className="inline-block max-w-full truncate rounded bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700">
                            {course}
                            {(customer.interestCourses?.length || 0) > 1 &&
                              ` +${(customer.interestCourses?.length || 0) - 1}`}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-[11px] text-slate-500">
                          {customer.assignedStaff?.name ||
                            customer.assignedStaffName ||
                            t('leads.unassigned', 'Chưa phân công')}
                          {activityDate &&
                            ` · ${new Date(activityDate).toLocaleDateString(dateLocale, {
                              day: '2-digit',
                              month: 'short',
                            })}`}
                        </span>
                        <button
                          type="button"
                          disabled={!conversation?.id}
                          onClick={() => conversation?.id && onOpenChat(conversation.id)}
                          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                          title={
                            conversation?.id
                              ? t('leads.openChat', 'Mở hội thoại')
                              : t('leads.noConversation', 'Chưa có hội thoại')
                          }
                        >
                          <MessageSquare size={12} />
                          Chat
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* Desktop Table */}
              <table className="hidden w-full min-w-[980px] border-collapse text-left md:table">
                <thead className="sticky top-0 z-10 bg-slate-50/95">
                  <tr className="border-y border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="px-3.5 py-2.5">{t('leads.columns.customer', 'Khách hàng')}</th>
                    <th className="px-3.5 py-2.5">{t('leads.columns.source', 'Nguồn')}</th>
                    <th className="px-3.5 py-2.5">{t('leads.columns.status', 'Trạng thái')}</th>
                    <th className="px-3.5 py-2.5">{t('leads.columns.stage', 'Giai đoạn')}</th>
                    <th className="px-3.5 py-2.5">{t('leads.columns.interest', 'Quan tâm')}</th>
                    <th className="px-3.5 py-2.5">{t('leads.columns.owner', 'Phụ trách')}</th>
                    <th className="px-3.5 py-2.5">
                      {t('leads.columns.lastActivity', 'Hoạt động gần nhất')}
                    </th>
                    <th className="px-3.5 py-2.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[13px]">
                  {customers.map((customer) => {
                    const conversation = customer.conversations?.[0];
                    const stage = getStage(customer.leadStage);
                    const status = STATUS_STYLES[customer.leadStatus || 'NEW'] || STATUS_STYLES.NEW;
                    const channel =
                      conversation?.channelAccount?.channel ||
                      (customer.importJobId || customer.source
                        ? t('leads.importedChannel', 'Nhập file')
                        : '—');
                    const course = customer.interestCourses?.[0];
                    const activityDate = conversation?.lastMessageAt || customer.updatedAt;

                    return (
                      <tr key={customer.id} className="transition-colors hover:bg-slate-50/70">
                        <td className="px-3.5 py-3">
                          <div className="flex min-w-52 items-center gap-2.5">
                            <Avatar src={customer.avatarUrl} name={customer.fullName} size={32} />
                            <div className="min-w-0">
                              <p className="m-0 truncate font-medium text-slate-950">
                                {customer.fullName}
                              </p>
                              <div className="mt-0.5 flex flex-col gap-0.5 text-[11px] text-slate-500 tabular-nums">
                                {customer.phone && (
                                  <span className="inline-flex items-center gap-1 truncate">
                                    <Phone size={10} />
                                    {customer.phone}
                                  </span>
                                )}
                                {customer.email && (
                                  <span className="inline-flex items-center gap-1 truncate">
                                    <Mail size={10} />
                                    {customer.email}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3.5 py-3">
                          <span className="text-xs font-medium text-slate-800">{channel}</span>
                          {(conversation?.channelAccount?.displayName || customer.source) && (
                            <span className="mt-0.5 block max-w-36 truncate text-[11px] text-slate-400">
                              {conversation?.channelAccount?.displayName || customer.source}
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${status.className}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
                            {t(status.labelKey, status.label)}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          {stage ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                              <span
                                className="h-2 w-2 rounded-full shrink-0"
                                style={{ backgroundColor: stage.color || '#64748b' }}
                              />
                              {stage.name}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">
                              {t('leads.noStage', 'Chưa phân giai đoạn')}
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-3">
                          {course ? (
                            <span className="inline-flex max-w-40 items-center gap-1 truncate rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                              {course}
                              {(customer.interestCourses?.length || 0) > 1 &&
                                ` +${(customer.interestCourses?.length || 0) - 1}`}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">
                              {t('leads.notUpdated', 'Chưa cập nhật')}
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 text-xs text-slate-600 whitespace-nowrap">
                          {customer.assignedStaff?.name ||
                            customer.assignedStaffName ||
                            t('leads.unassigned', 'Chưa phân công')}
                        </td>
                        <td className="px-3.5 py-3 text-xs text-slate-500 tabular-nums whitespace-nowrap">
                          {activityDate
                            ? new Date(activityDate).toLocaleDateString(dateLocale, {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                            : '—'}
                        </td>
                        <td className="px-3.5 py-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            disabled={!conversation?.id}
                            onClick={() => conversation?.id && onOpenChat(conversation.id)}
                            className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                            title={
                              conversation?.id
                                ? t('leads.openChat', 'Mở hội thoại')
                                : t('leads.noConversation', 'Chưa có hội thoại')
                            }
                          >
                            <MessageSquare size={12} />
                            <span>Chat</span>
                            <ArrowUpRight size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* 4. PAGINATION */}
        <div className="flex shrink-0 items-center justify-between gap-3 pt-3">
          <span className="hidden text-xs text-slate-500 sm:inline">
            {t('leads.perPage', 'Mỗi trang {n} hồ sơ', { n: PAGE_SIZE })}
          </span>
          <div className="flex flex-1 items-center justify-between gap-2 sm:flex-none sm:justify-start">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || isLoading}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft size={14} /> {t('leads.prev', 'Trước')}
            </button>
            <span className="min-w-20 text-center text-xs text-slate-600 tabular-nums">
              {totalPages ? `${page} / ${totalPages}` : '0 / 0'}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages || isLoading}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              {t('leads.next', 'Sau')} <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};