import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  apiClient,
  type ActivityItem,
  type ActivityType,
  type ActivityStatus,
} from '../../../lib/api-client/index.js';
import { useWorkspaceConfig } from '../../workspace/WorkspaceConfigContext.js';
import { useActivityReminders } from '../../activities/hooks/useActivityReminders.js';
import { ActivityModal } from '../../activities/components/ActivityModal.js';
import { formatLocalDate, isSameLocalDate } from '../utils/dateTimeUtils.js';
import { notify } from '../../../components/feedback/toastEmitter.js';
import { useTranslation } from '../../../i18n/index.js';
import {
  CalendarHeader,
  CalendarFilterBar,
  CalendarMonthGrid,
  CalendarWeekGrid,
  CalendarAgendaList,
  CalendarTaskSidebar,
  type CalendarViewMode,
  type MonthDayCell,
  type WeekDayColumn,
} from '../components/index.js';

export interface CalendarTasksPageProps {
  onOpenChat?: (conversationId?: string) => void;
  onNavigateToKanban?: () => void;
}

export const CalendarTasksPage: React.FC<CalendarTasksPageProps> = ({
  onOpenChat: _onOpenChat,
  onNavigateToKanban,
}) => {
  const { activeWorkspaceId } = useWorkspaceConfig();
  const { locale, t } = useTranslation();
  const { requestBrowserPermission } = useActivityReminders(activeWorkspaceId || undefined);

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('MONTH');

  const [typeFilter, setTypeFilter] = useState<'ALL' | ActivityType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ActivityStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [_isLoading, setIsLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDefaultType, setModalDefaultType] = useState<ActivityType>('TASK');
  const [editingActivity, setEditingActivity] = useState<ActivityItem | null>(null);
  const [selectedDateForNew, setSelectedDateForNew] = useState<Date | null>(null);

  const loadCalendarData = useCallback(async () => {
    setIsLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const start = new Date(year, month - 1, 1).toISOString();
      const end = new Date(year, month + 2, 0).toISOString();

      const events = await apiClient.getCalendarEvents({
        workspaceId: activeWorkspaceId || undefined,
        startDate: start,
        endDate: end,
      });
      setActivities(events || []);
    } catch {
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentDate, activeWorkspaceId]);

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  const handlePrev = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === 'MONTH') d.setMonth(d.getMonth() - 1);
      else if (viewMode === 'WEEK') d.setDate(d.getDate() - 7);
      else d.setDate(d.getDate() - 1);
      return d;
    });
  };

  const handleNext = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === 'MONTH') d.setMonth(d.getMonth() + 1);
      else if (viewMode === 'WEEK') d.setDate(d.getDate() + 7);
      else d.setDate(d.getDate() + 1);
      return d;
    });
  };

  const handleToday = () => setCurrentDate(new Date());

  const handleToggleTask = async (activity: ActivityItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nextStatus = activity.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      const updated = await apiClient.updateActivity(activity.id, {
        status: nextStatus,
        completedAt: nextStatus === 'COMPLETED' ? new Date().toISOString() : null,
      });
      setActivities((prev) => prev.map((a) => (a.id === activity.id ? updated : a)));
      notify.success(
        nextStatus === 'COMPLETED'
          ? `Đã hoàn thành: "${activity.title}"`
          : `Đã mở lại: "${activity.title}"`
      );
    } catch {
      notify.error('Lỗi khi cập nhật trạng thái');
    }
  };

  const filteredActivities = useMemo(() => {
    return activities.filter((item) => {
      if (typeFilter !== 'ALL' && item.type !== typeFilter) return false;
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.title?.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          item.customer?.fullName?.toLowerCase().includes(q) ||
          item.assignedTo?.toLowerCase().includes(q) ||
          false
        );
      }
      return true;
    });
  }, [activities, typeFilter, statusFilter, searchQuery]);

  const todayTasks = useMemo(() => {
    const today = new Date();
    return filteredActivities.filter((a) =>
      isSameLocalDate(a.scheduledAt || a.dueAt || a.createdAt, today)
    );
  }, [filteredActivities]);

  const overdueTasks = useMemo(() => {
    const todayStr = formatLocalDate(new Date());
    return filteredActivities.filter((a) => {
      const taskDate = a.dueAt || a.scheduledAt;
      if (!taskDate) return false;
      return formatLocalDate(taskDate) < todayStr && a.status === 'PENDING';
    });
  }, [filteredActivities]);

  const monthGridDays = useMemo<MonthDayCell[]>(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days: MonthDayCell[] = [];
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month, -i),
        isCurrentMonth: false,
        isToday: false,
        items: [],
      });
    }

    const todayStr = new Date().toDateString();
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const thisDate = new Date(year, month, d);
      days.push({
        date: thisDate,
        isCurrentMonth: true,
        isToday: thisDate.toDateString() === todayStr,
        items: [],
      });
    }

    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      days.push({
        date: new Date(year, month + 1, d),
        isCurrentMonth: false,
        isToday: false,
        items: [],
      });
    }

    return days.map((day) => {
      const dayDateStr = formatLocalDate(day.date);
      const matched = filteredActivities.filter(
        (item) => formatLocalDate(item.scheduledAt || item.dueAt || item.createdAt) === dayDateStr
      );
      return { ...day, items: matched };
    });
  }, [currentDate, filteredActivities]);

  const weekDays = useMemo<WeekDayColumn[]>(() => {
    const d = new Date(currentDate);
    let dayOfWeek = d.getDay() - 1;
    if (dayOfWeek === -1) dayOfWeek = 6;

    const monday = new Date(d);
    monday.setDate(d.getDate() - dayOfWeek);

    const result: WeekDayColumn[] = [];
    const todayStr = new Date().toDateString();
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      const dayStr = formatLocalDate(day);
      const matched = filteredActivities.filter(
        (item) => formatLocalDate(item.scheduledAt || item.dueAt || item.createdAt) === dayStr
      );
      result.push({ date: day, isToday: day.toDateString() === todayStr, items: matched });
    }
    return result;
  }, [currentDate, filteredActivities]);

  const monthYearLabel = useMemo(() => {
    const months = [
      'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
      'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
    ];
    return `${months[currentDate.getMonth()]}, ${currentDate.getFullYear()}`;
  }, [currentDate]);

  const openCreateModalForDate = (date?: Date) => {
    setSelectedDateForNew(date ?? null);
    setEditingActivity(null);
    setModalDefaultType('TASK');
    setIsModalOpen(true);
  };

  const openEditModal = (activity: ActivityItem) => {
    setEditingActivity(activity);
    setIsModalOpen(true);
  };

  return (
    <div className="workspace-flat-detail w-full h-full min-h-0 bg-white text-slate-900 flex flex-col rounded-none border-none shadow-none select-none overflow-hidden">
      {/* TIÊU ĐỀ TRANG ĐỒNG BỘ */}
      <div className="shrink-0 bg-slate-50/90 px-3.5 sm:px-5 pt-3.5 sm:pt-4 pb-1">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 m-0">
          {t('header.calendarTab', 'Lịch biểu & Nhiệm vụ')}
        </h1>
        <p className="m-0 mt-0.5 text-xs text-slate-500">
          Quản lý lịch hẹn tư vấn, cuộc gọi chăm sóc và nhắc nhở công việc theo thời gian thực
        </p>
      </div>

      <CalendarHeader
        monthYearLabel={monthYearLabel}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onRequestBrowserPermission={requestBrowserPermission}
        onCreateNew={() => openCreateModalForDate()}
      />

      <CalendarFilterBar
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <main
          className={`flex-1 flex flex-col min-w-0 min-h-0 bg-slate-50/60 p-3 sm:p-5 ${viewMode === 'MONTH' ? 'overflow-hidden' : 'overflow-y-auto'
            }`}
        >
          <div className="flex-1 flex flex-col min-h-0 bg-white border border-slate-200 overflow-hidden">
            {viewMode === 'MONTH' && (
              <CalendarMonthGrid
                days={monthGridDays}
                locale={locale}
                onSelectDate={openCreateModalForDate}
                onEditActivity={openEditModal}
              />
            )}

            {viewMode === 'WEEK' && (
              <CalendarWeekGrid
                weekDays={weekDays}
                locale={locale}
                onSelectDate={openCreateModalForDate}
                onEditActivity={openEditModal}
                onToggleTask={handleToggleTask}
              />
            )}

            {viewMode === 'AGENDA' && (
              <CalendarAgendaList
                activities={filteredActivities}
                onEditActivity={openEditModal}
                onToggleTask={handleToggleTask}
              />
            )}
          </div>
        </main>

        <CalendarTaskSidebar
          todayTasks={todayTasks}
          overdueTasks={overdueTasks}
          onEditActivity={openEditModal}
          onToggleTask={handleToggleTask}
          onNavigateToKanban={onNavigateToKanban}
        />
      </div>

      {isModalOpen && (
        <ActivityModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingActivity(null);
            setSelectedDateForNew(null);
          }}
          workspaceId={activeWorkspaceId || undefined}
          defaultType={modalDefaultType}
          defaultDate={selectedDateForNew}
          initialActivity={editingActivity}
          onSuccess={loadCalendarData}
        />
      )}
    </div>
  );
};