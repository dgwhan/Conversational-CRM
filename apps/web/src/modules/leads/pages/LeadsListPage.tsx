import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Filter,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  Users,
} from 'lucide-react';
import { Avatar } from '../../../components/common/Avatar.js';
import { Button } from '../../../components/ui/Button.js';
import { SearchInput } from '../../../components/ui/SearchInput.js';
import { notify } from '../../../components/feedback/toastEmitter.js';
import { useTranslation } from '../../../i18n/index.js';
import { apiClient } from '../../../lib/api-client/index.js';
import type { CustomerListItem } from '../../../lib/api-client/customers.js';
import { useWorkspaceConfig } from '../../workspace/WorkspaceConfigContext.js';

const PAGE_SIZE = 20;

const STATUS_FILTERS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'POTENTIAL', label: 'Tiềm năng' },
  { value: 'NEW', label: 'Mới' },
  { value: 'CONVERTED', label: 'Đã chuyển đổi' },
  { value: 'UNQUALIFIED', label: 'Chưa phù hợp' },
] as const;

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  NEW: { label: 'Mới', className: 'border-slate-200 bg-slate-50 text-slate-600' },
  POTENTIAL: { label: 'Tiềm năng', className: 'border-blue-200 bg-blue-50 text-blue-700' },
  CONVERTED: { label: 'Đã chuyển đổi', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  UNQUALIFIED: { label: 'Chưa phù hợp', className: 'border-amber-200 bg-amber-50 text-amber-700' },
};

interface LeadsListPageProps {
  onOpenChat: (conversationId: string) => void;
}

export const LeadsListPage: React.FC<LeadsListPageProps> = ({ onOpenChat }) => {
  const { locale } = useTranslation();
  const { config, activeWorkspaceId } = useWorkspaceConfig();
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('POTENTIAL');
  const [stageFilter, setStageFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadLeads = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const result = await apiClient.getCustomers({
        workspaceId: activeWorkspaceId || undefined,
        search: searchTerm.trim() || undefined,
        leadStatus: statusFilter === 'ALL' ? undefined : statusFilter,
        leadStage: stageFilter || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setCustomers(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể tải danh sách Lead.';
      setErrorMessage(message);
      notify.error(message, 'Lỗi tải danh sách Lead');
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkspaceId, page, searchTerm, stageFilter, statusFilter]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const stageNames = useMemo(
    () => new Map(config.pipelineStages.map((stage) => [stage.id, stage])),
    [config.pipelineStages],
  );
  const dateLocale = locale === 'en' ? 'en-US' : 'vi-VN';
  const pageStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(page * PAGE_SIZE, total);

  const getStage = (leadStage?: string | null) => {
    if (!leadStage) return null;
    const directMatch = stageNames.get(leadStage);
    if (directMatch) return directMatch;
    const normalized = leadStage.startsWith('STAGE_') ? leadStage.slice(6) : `STAGE_${leadStage}`;
    return stageNames.get(normalized) || config.pipelineStages.find(
      (stage) => stage.id.replace(/^STAGE_/, '') === normalized.replace(/^STAGE_/, ''),
    ) || null;
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-50/70">
      <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600">
              <Users size={21} />
            </div>
            <div className="min-w-0">
              <h1 className="m-0 text-lg font-bold text-slate-900">Danh sách Lead</h1>
              <p className="m-0 mt-0.5 text-xs text-slate-500">
                Theo dõi khách hàng tiềm năng và tiến độ tư vấn trong workspace.
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
            <SearchInput
              value={searchInput}
              onChange={setSearchInput}
              onSearch={handleSearch}
              debounceMs={300}
              placeholder="Tìm theo tên, số điện thoại hoặc email"
              className="min-w-0 sm:w-80"
              shortcutHint="/"
            />
            <Button
              variant="secondary"
              size="md"
              onClick={loadLeads}
              disabled={isLoading}
              icon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />}
              className="shrink-0"
            >
              Làm mới
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex max-w-full gap-1 overflow-x-auto pb-1" role="tablist" aria-label="Lọc trạng thái Lead">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                role="tab"
                aria-selected={statusFilter === filter.value}
                onClick={() => handleStatusFilter(filter.value)}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  statusFilter === filter.value
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-500">
            <Filter size={14} className="shrink-0" />
            <span className="shrink-0">Giai đoạn</span>
            <select
              value={stageFilter}
              onChange={(event) => handleStageFilter(event.target.value)}
              className="h-9 min-w-40 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Tất cả giai đoạn</option>
              {config.pipelineStages.map((stage) => (
                <option key={stage.id} value={stage.id}>{stage.name}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-6">
        <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <span>Hồ sơ Lead</span>
            <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              {total.toLocaleString(dateLocale)}
            </span>
          </div>
          <span className="text-xs text-slate-500">
            {total ? `Hiển thị ${pageStart}–${pageEnd} trên ${total.toLocaleString(dateLocale)}` : 'Không có hồ sơ'}
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          {isLoading ? (
            <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500">
              <RefreshCw size={18} className="animate-spin text-blue-600" />
              Đang tải danh sách Lead...
            </div>
          ) : errorMessage ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-4 text-center">
              <CircleAlert size={28} className="text-rose-500" />
              <p className="m-0 max-w-lg text-sm text-slate-600">{errorMessage}</p>
              <Button variant="secondary" onClick={loadLeads} icon={<RefreshCw size={14} />}>
                Thử tải lại
              </Button>
            </div>
          ) : customers.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-2 px-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Users size={21} />
              </div>
              <p className="m-0 text-sm font-semibold text-slate-700">Chưa tìm thấy Lead phù hợp</p>
              <p className="m-0 max-w-md text-xs text-slate-500">
                Thử đổi trạng thái, giai đoạn hoặc từ khóa tìm kiếm.
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Khách hàng</th>
                  <th className="px-4 py-3">Nguồn</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Giai đoạn</th>
                  <th className="px-4 py-3">Quan tâm</th>
                  <th className="px-4 py-3">Phụ trách</th>
                  <th className="px-4 py-3">Hoạt động gần nhất</th>
                  <th className="px-4 py-3 text-right"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((customer) => {
                  const conversation = customer.conversations?.[0];
                  const stage = getStage(customer.leadStage);
                  const status = STATUS_STYLES[customer.leadStatus || 'NEW'] || STATUS_STYLES.NEW;
                  const channel = conversation?.channelAccount?.channel || '—';
                  const course = customer.interestCourses?.[0];
                  const activityDate = conversation?.lastMessageAt || customer.updatedAt;

                  return (
                    <tr key={customer.id} className="transition-colors hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <div className="flex min-w-56 items-center gap-3">
                          <Avatar src={customer.avatarUrl} name={customer.fullName} size={36} />
                          <div className="min-w-0">
                            <p className="m-0 truncate text-sm font-semibold text-slate-900">{customer.fullName}</p>
                            <div className="mt-1 flex flex-col gap-0.5 text-[11px] text-slate-500">
                              {customer.phone && (
                                <span className="inline-flex items-center gap-1 truncate"><Phone size={11} />{customer.phone}</span>
                              )}
                              {customer.email && (
                                <span className="inline-flex items-center gap-1 truncate"><Mail size={11} />{customer.email}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-slate-700">{channel}</span>
                        {conversation?.channelAccount?.displayName && (
                          <span className="mt-1 block max-w-36 truncate text-[11px] text-slate-400">
                            {conversation.channelAccount.displayName}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {stage ? (
                          <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: stage.color || '#64748b' }}
                            />
                            {stage.name}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Chưa phân giai đoạn</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {course ? (
                          <span className="inline-flex max-w-40 items-center gap-1.5 truncate rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-700">
                            {course}
                            {(customer.interestCourses?.length || 0) > 1 && ` +${(customer.interestCourses?.length || 0) - 1}`}
                          </span>
                        ) : <span className="text-xs text-slate-400">Chưa cập nhật</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {customer.assignedStaff?.name || customer.assignedStaffName || 'Chưa phân công'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {activityDate
                          ? new Date(activityDate).toLocaleDateString(dateLocale, { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={!conversation?.id}
                          onClick={() => conversation?.id && onOpenChat(conversation.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                          title={conversation?.id ? 'Mở hội thoại' : 'Chưa có hội thoại'}
                        >
                          <MessageSquare size={13} />
                          Chat
                          <ArrowUpRight size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 pt-3">
          <span className="text-xs text-slate-500">Mỗi trang {PAGE_SIZE} hồ sơ</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || isLoading}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={14} /> Trước
            </button>
            <span className="min-w-20 text-center text-xs text-slate-600">
              {totalPages ? `${page} / ${totalPages}` : '0 / 0'}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages || isLoading}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sau <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
