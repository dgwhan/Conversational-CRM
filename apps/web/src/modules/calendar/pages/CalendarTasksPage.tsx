import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Phone,
  Video,
  MapPin,
  CheckSquare,
  Clock,
  Filter,
  Search,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Bell,
  Sparkles,
  Bot,
  ExternalLink,
  Volume2,
  CalendarDays,
  ListTodo,
  User,
  ArrowRight,
} from 'lucide-react';
import {
  apiClient,
  type ActivityItem,
  type ActivityType,
  type ActivityStatus,
} from '../../../lib/api-client/index.js';
import { useWorkspaceConfig } from '../../workspace/WorkspaceConfigContext.js';
import { useActivityReminders, playChimeSound } from '../../activities/hooks/useActivityReminders.js';
import { ActivityModal } from '../../activities/components/ActivityModal.js';
import { formatLocalDate, isSameLocalDate } from '../utils/dateTimeUtils.js';
import { notify } from '../../../components/feedback/toastEmitter.js';

type ViewMode = 'MONTH' | 'WEEK' | 'AGENDA';

export interface CalendarTasksPageProps {
  onOpenChat?: (conversationId?: string) => void;
  onNavigateToKanban?: () => void;
}

export const CalendarTasksPage: React.FC<CalendarTasksPageProps> = ({
  onOpenChat,
  onNavigateToKanban,
}) => {
  const { activeWorkspaceId } = useWorkspaceConfig();
  const { todayTasksCount, requestBrowserPermission } = useActivityReminders(activeWorkspaceId || undefined);

  // View & Date states
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('MONTH');

  // Filter states
  const [typeFilter, setTypeFilter] = useState<'ALL' | ActivityType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ActivityStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Data states
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDefaultType, setModalDefaultType] = useState<ActivityType>('TASK');
  const [editingActivity, setEditingActivity] = useState<ActivityItem | null>(null);
  const [selectedDateForNew, setSelectedDateForNew] = useState<Date | null>(null);

  // Tải dữ liệu lịch biểu
  const loadCalendarData = useCallback(async () => {
    setIsLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      // Lấy từ đầu tháng trước đến cuối tháng sau để chuyển tháng mượt mà
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

  // Điều hướng thời gian
  const handlePrev = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === 'MONTH') {
        d.setMonth(d.getMonth() - 1);
      } else if (viewMode === 'WEEK') {
        d.setDate(d.getDate() - 7);
      } else {
        d.setDate(d.getDate() - 1);
      }
      return d;
    });
  };

  const handleNext = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === 'MONTH') {
        d.setMonth(d.getMonth() + 1);
      } else if (viewMode === 'WEEK') {
        d.setDate(d.getDate() + 7);
      } else {
        d.setDate(d.getDate() + 1);
      }
      return d;
    });
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Toggle hoàn thành task
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

  // Lọc danh sách activities
  const filteredActivities = useMemo(() => {
    return activities.filter((item) => {
      if (typeFilter !== 'ALL' && item.type !== typeFilter) return false;
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title?.toLowerCase().includes(q);
        const matchDesc = item.description?.toLowerCase().includes(q);
        const matchCust = item.customer?.fullName?.toLowerCase().includes(q);
        const matchAssignee = item.assignedTo?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchCust && !matchAssignee) return false;
      }
      return true;
    });
  }, [activities, typeFilter, statusFilter, searchQuery]);

  // Phân loại cho Task panel bên phải theo ngày địa phương
  const todayTasks = useMemo(() => {
    return filteredActivities.filter((a) => {
      const taskDate = a.dueAt || a.scheduledAt;
      return isSameLocalDate(taskDate, new Date());
    });
  }, [filteredActivities]);

  const overdueTasks = useMemo(() => {
    const todayStr = formatLocalDate(new Date());
    return filteredActivities.filter((a) => {
      const taskDate = a.dueAt || a.scheduledAt;
      if (!taskDate) return false;
      const taskDateStr = formatLocalDate(taskDate);
      return taskDateStr < todayStr && a.status === 'PENDING';
    });
  }, [filteredActivities]);

  // Xây dựng lưới Tháng (Month grid)
  const monthGridDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Thứ trong tuần của ngày đầu tiên (0: Chủ Nhật, 1: Thứ Hai...)
    // Chuẩn Việt Nam: Thứ Hai là ngày đầu tuần
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days: Array<{
      date: Date;
      isCurrentMonth: boolean;
      isToday: boolean;
      items: ActivityItem[];
    }> = [];

    // Ngày của tháng trước bù vào đầu tuần
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({
        date: d,
        isCurrentMonth: false,
        isToday: false,
        items: [],
      });
    }

    // Các ngày trong tháng hiện tại
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

    // Các ngày của tháng sau bù vào cho đủ lưới 35 hoặc 42 ô
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      days.push({
        date: nextDate,
        isCurrentMonth: false,
        isToday: false,
        items: [],
      });
    }

    // Gán các sự kiện vào từng ngày theo giờ địa phương (tránh lệch múi giờ UTC)
    return days.map((day) => {
      const dayDateStr = formatLocalDate(day.date);
      const matched = filteredActivities.filter((item) => {
        const itemDate = item.scheduledAt || item.dueAt || item.createdAt;
        return formatLocalDate(itemDate) === dayDateStr;
      });
      return { ...day, items: matched };
    });
  }, [currentDate, filteredActivities]);

  // Xây dựng các ngày trong Tuần (Week view)
  const weekDays = useMemo(() => {
    const d = new Date(currentDate);
    let dayOfWeek = d.getDay() - 1;
    if (dayOfWeek === -1) dayOfWeek = 6;

    const monday = new Date(d);
    monday.setDate(d.getDate() - dayOfWeek);

    const result = [];
    const todayStr = new Date().toDateString();
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      const dayStr = formatLocalDate(day);
      const matched = filteredActivities.filter((item) => {
        const itemDate = item.scheduledAt || item.dueAt || item.createdAt;
        return formatLocalDate(itemDate) === dayStr;
      });
      result.push({
        date: day,
        isToday: day.toDateString() === todayStr,
        items: matched,
      });
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

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-800 select-none overflow-hidden">
      {/* 1. TOP HEADER & CONTROLS */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 shrink-0 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        {/* Nhóm điều hướng Tháng/Tuần */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1.5 hover:bg-white rounded-md text-slate-600 transition-colors cursor-pointer"
              title="Kỳ trước"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-semibold hover:bg-white rounded-md text-slate-700 transition-colors cursor-pointer"
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-1.5 hover:bg-white rounded-md text-slate-600 transition-colors cursor-pointer"
              title="Kỳ tiếp theo"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <h2 className="text-base font-bold text-slate-900 m-0 min-w-[160px]">
            {monthYearLabel}
          </h2>
        </div>

        {/* Chế độ xem: Tháng / Tuần / Lịch trình */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('MONTH')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'MONTH'
                  ? 'bg-white text-blue-600 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarIcon size={13} />
              <span>Tháng</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('WEEK')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'WEEK'
                  ? 'bg-white text-blue-600 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays size={13} />
              <span>Tuần</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('AGENDA')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'AGENDA'
                  ? 'bg-white text-blue-600 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListTodo size={13} />
              <span>Danh sách</span>
            </button>
          </div>

          {/* Nút kiểm tra âm thanh chuông */}
          <button
            type="button"
            onClick={() => {
              playChimeSound();
              notify.info('Chuông thông báo nhắc việc đang hoạt động rất tốt!', 'Âm thanh thông báo');
            }}
            className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Thử chuông nhắc nhở"
          >
            <Volume2 size={15} />
          </button>

          {/* Nút bật thông báo trình duyệt */}
          <button
            type="button"
            onClick={requestBrowserPermission}
            className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
            title="Bật thông báo Browser Push"
          >
            <Bell size={15} />
          </button>

          {/* Nút tạo mới */}
          <button
            type="button"
            onClick={() => {
              setEditingActivity(null);
              setModalDefaultType('TASK');
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>+ Tạo Lịch / Nhiệm vụ</span>
          </button>
        </div>
      </header>

      {/* 2. SUB-BAR: BỘ LỌC & TÌM KIẾM */}
      <div className="bg-white border-b border-slate-200/80 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Bộ lọc loại */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Filter size={12} /> Lọc:
          </span>
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'CALL', label: 'Cuộc gọi' },
            { id: 'MEETING', label: 'Lịch hẹn (Test/Meet)' },
            { id: 'TASK', label: 'Nhiệm vụ' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              className={`px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                typeFilter === f.id
                  ? 'bg-blue-50 text-blue-700 border-blue-200 font-semibold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              onClick={() => setTypeFilter(f.id as any)}
            >
              {f.label}
            </button>
          ))}

          <span className="text-slate-300 mx-1">|</span>

          {/* Bộ lọc trạng thái */}
          {[
            { id: 'ALL', label: 'Mọi trạng thái' },
            { id: 'PENDING', label: 'Chưa hoàn thành' },
            { id: 'COMPLETED', label: 'Đã hoàn thành' },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              className={`px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                statusFilter === s.id
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              onClick={() => setStatusFilter(s.id as any)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Ô tìm kiếm */}
        <div className="relative w-full sm:w-64">
          <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Tìm theo tiêu đề, ứng viên, phòng ban..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* 3. MAIN CONTENT AREA (LỊCH BÊN TRÁI + NHIỆM VỤ BÊN PHẢI) */}
      <div className="flex-1 flex overflow-hidden">
        {/* KHUNG LỊCH CHÍNH (CALENDAR VIEW) */}
        <main className="flex-1 overflow-y-auto p-3 lg:p-4 flex flex-col">
          {/* MONTH VIEW */}
          {viewMode === 'MONTH' && (
            <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              {/* Tiêu đề 7 thứ trong tuần */}
              <div className="grid grid-cols-7 bg-slate-100/80 border-b border-slate-200 text-center py-2 text-xs font-semibold text-slate-600">
                <span>Thứ 2</span>
                <span>Thứ 3</span>
                <span>Thứ 4</span>
                <span>Thứ 5</span>
                <span>Thứ 6</span>
                <span className="text-blue-600">Thứ 7</span>
                <span className="text-rose-600">Chủ Nhật</span>
              </div>

              {/* Lưới ô ngày */}
              <div className="flex-1 grid grid-cols-7 grid-rows-5 lg:grid-rows-6 divide-x divide-y divide-slate-100">
                {monthGridDays.map((day, idx) => (
                  <div
                    key={idx}
                    className={`min-h-[90px] p-1.5 flex flex-col transition-colors group cursor-pointer ${
                      !day.isCurrentMonth
                        ? 'bg-slate-50/50 text-slate-300'
                        : day.isToday
                        ? 'bg-blue-50/30'
                        : 'bg-white hover:bg-slate-50/80'
                    }`}
                    onClick={() => {
                      setSelectedDateForNew(day.date);
                      setEditingActivity(null);
                      setModalDefaultType('TASK');
                      setIsModalOpen(true);
                    }}
                  >
                    {/* Header ngày */}
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-xs font-semibold rounded-full w-6 h-6 flex items-center justify-center ${
                          day.isToday
                            ? 'bg-blue-600 text-white shadow-xs'
                            : day.isCurrentMonth
                            ? 'text-slate-700'
                            : 'text-slate-300'
                        }`}
                      >
                        {day.date.getDate()}
                      </span>

                      {day.items.length > 0 && (
                        <span className="text-[10px] font-medium text-slate-400">
                          {day.items.length} việc
                        </span>
                      )}
                    </div>

                    {/* Danh sách chip sự kiện */}
                    <div className="flex-1 space-y-1 overflow-hidden">
                      {day.items.slice(0, 3).map((item) => {
                        const isCall = item.type === 'CALL';
                        const isMeeting = item.type === 'MEETING';
                        const isCompleted = item.status === 'COMPLETED';

                        return (
                          <div
                            key={item.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingActivity(item);
                              setIsModalOpen(true);
                            }}
                            className={`px-1.5 py-0.5 rounded text-[11px] truncate flex items-center gap-1 font-medium border transition-transform hover:scale-[1.02] cursor-pointer ${
                              isCompleted
                                ? 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                                : isCall
                                ? 'bg-amber-50 text-amber-800 border-amber-200/90'
                                : isMeeting
                                ? 'bg-blue-50 text-blue-800 border-blue-200/90'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200/90'
                            }`}
                            title={`${item.title}${item.customer ? ` - ${item.customer.fullName}` : ''}`}
                          >
                            {isCall && <Phone size={10} className="shrink-0 text-amber-600" />}
                            {isMeeting && <CalendarIcon size={10} className="shrink-0 text-blue-600" />}
                            {!isCall && !isMeeting && <CheckSquare size={10} className="shrink-0 text-emerald-600" />}
                            <span className="truncate">{item.title}</span>
                          </div>
                        );
                      })}

                      {day.items.length > 3 && (
                        <div className="text-[10px] text-blue-600 font-semibold px-1">
                          +{day.items.length - 3} việc khác...
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* WEEK VIEW */}
          {viewMode === 'WEEK' && (
            <div className="flex-1 grid grid-cols-1 md:grid-cols-7 gap-2">
              {weekDays.map((day, idx) => (
                <div
                  key={idx}
                  className={`bg-white border rounded-xl p-3 flex flex-col shadow-2xs ${
                    day.isToday ? 'border-blue-400 ring-1 ring-blue-400/30' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                    <div>
                      <span className="text-[11px] text-slate-400 font-medium block">
                        {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'][idx]}
                      </span>
                      <span className={`text-base font-bold ${day.isToday ? 'text-blue-600' : 'text-slate-800'}`}>
                        {day.date.getDate()} Thg {day.date.getMonth() + 1}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDateForNew(day.date);
                        setEditingActivity(null);
                        setModalDefaultType('TASK');
                        setIsModalOpen(true);
                      }}
                      className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-colors"
                      title="Thêm sự kiện ngày này"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <div className="flex-1 space-y-2 overflow-y-auto">
                    {day.items.length === 0 ? (
                      <div className="text-center py-6 text-slate-300 text-xs italic">
                        Không có lịch
                      </div>
                    ) : (
                      day.items.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            setEditingActivity(item);
                            setIsModalOpen(true);
                          }}
                          className="p-2 rounded-lg border border-slate-200/90 hover:border-blue-300 bg-white shadow-2xs hover:shadow-xs transition-all cursor-pointer text-xs space-y-1"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-semibold text-slate-800 leading-tight">
                              {item.title}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleToggleTask(item, e)}
                              className="text-slate-400 hover:text-emerald-600 p-0.5"
                            >
                              {item.status === 'COMPLETED' ? (
                                <CheckCircle2 size={13} className="text-emerald-600" />
                              ) : (
                                <Circle size={13} />
                              )}
                            </button>
                          </div>

                          {item.customer && (
                            <div className="text-[11px] text-blue-700 flex items-center gap-1">
                              <User size={10} />
                              <span>{item.customer.fullName}</span>
                            </div>
                          )}

                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock size={10} />
                            <span>
                              {item.scheduledAt
                                ? new Date(item.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : 'Cả ngày'}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* AGENDA / LIST VIEW */}
          {viewMode === 'AGENDA' && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4 max-w-4xl mx-auto w-full">
              <h3 className="text-sm font-bold text-slate-800 m-0 pb-2 border-b border-slate-100 flex items-center justify-between">
                <span>Toàn bộ Lịch trình & Nhiệm vụ</span>
                <span className="text-xs font-normal text-slate-400">
                  {filteredActivities.length} hoạt động
                </span>
              </h3>

              {filteredActivities.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs italic">
                  Không tìm thấy hoạt động nào phù hợp với bộ lọc hiện tại.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredActivities.map((item) => {
                    const isCall = item.type === 'CALL';
                    const isMeeting = item.type === 'MEETING';
                    const isCompleted = item.status === 'COMPLETED';

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setEditingActivity(item);
                          setIsModalOpen(true);
                        }}
                        className={`p-3 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer ${
                          isCompleted
                            ? 'bg-slate-50/60 border-slate-200/60 opacity-80'
                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <button
                            type="button"
                            onClick={(e) => handleToggleTask(item, e)}
                            className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors"
                          >
                            {isCompleted ? (
                              <CheckCircle2 size={16} className="text-emerald-600" />
                            ) : (
                              <Circle size={16} />
                            )}
                          </button>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${isCompleted ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                {item.title}
                              </span>
                              {item.metadata?.isAutoGenerated && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                  <Sparkles size={10} /> Auto Task
                                </span>
                              )}
                            </div>

                            {item.description && (
                              <p className="text-xs text-slate-500 m-0 line-clamp-1">
                                {item.description}
                              </p>
                            )}

                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                              {item.customer && (
                                <span className="text-blue-600 font-medium">
                                  Ứng viên: {item.customer.fullName}
                                </span>
                              )}
                              <span>Phụ trách: {item.assignedTo || 'Tư vấn viên'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center text-xs">
                          <div className="text-right">
                            <span className="font-semibold text-slate-700 block">
                              {item.scheduledAt
                                ? new Date(item.scheduledAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
                                : (item.dueAt ? new Date(item.dueAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : 'Chưa định ngày')}
                            </span>
                            <span className="text-slate-400 text-[11px]">
                              {item.scheduledAt
                                ? new Date(item.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : ''}
                            </span>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                              isCall
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : isMeeting
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            {isCall ? 'Cuộc gọi' : (isMeeting ? 'Lịch hẹn' : 'Nhiệm vụ')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>

        {/* 4. TASK PANEL BÊN PHẢI (SIDE PANEL - TASKS & REMINDERS) */}
        <aside className="w-80 min-w-[320px] max-w-[320px] border-l border-slate-200 bg-white hidden xl:flex flex-col h-full shadow-2xs">
          {/* Header Panel */}
          <div className="p-3.5 border-b border-slate-200 flex items-center justify-between">
            <h4 className="m-0 text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <CheckSquare size={14} className="text-emerald-600" />
              <span>Nhiệm vụ Hôm nay ({todayTasks.length})</span>
            </h4>

            {onNavigateToKanban && (
              <button
                type="button"
                onClick={onNavigateToKanban}
                className="text-[11px] font-medium text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
              >
                <span>Phễu tuyển sinh</span>
                <ArrowRight size={11} />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {/* Nhiệm vụ quá hạn nếu có */}
            {overdueTasks.length > 0 && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-rose-800 font-bold text-xs">
                  <AlertTriangle size={13} className="text-rose-600" />
                  <span>Quá hạn cần xử lý gấp ({overdueTasks.length})</span>
                </div>

                <div className="space-y-1.5">
                  {overdueTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => {
                        setEditingActivity(task);
                        setIsModalOpen(true);
                      }}
                      className="p-2 bg-white rounded-lg border border-rose-200/80 text-xs space-y-1 cursor-pointer hover:shadow-2xs transition-all"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-rose-950 truncate">{task.title}</span>
                        <button
                          type="button"
                          onClick={(e) => handleToggleTask(task, e)}
                          className="text-slate-400 hover:text-emerald-600"
                        >
                          <Circle size={13} />
                        </button>
                      </div>
                      <span className="text-[10px] text-rose-600 font-medium block">
                        Hạn: {task.dueAt ? new Date(task.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Quá hạn'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Danh sách nhiệm vụ hôm nay */}
            <div className="space-y-2">
              {todayTasks.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs italic">
                  Không có công việc nào đến hạn hôm nay! Tuyệt vời!
                </div>
              ) : (
                todayTasks.map((task) => {
                  const isCompleted = task.status === 'COMPLETED';
                  return (
                    <div
                      key={task.id}
                      onClick={() => {
                        setEditingActivity(task);
                        setIsModalOpen(true);
                      }}
                      className={`p-2.5 rounded-xl border transition-all text-xs cursor-pointer ${
                        isCompleted
                          ? 'bg-slate-50 border-slate-200 opacity-60'
                          : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5 mb-1">
                        <span className={`font-semibold ${isCompleted ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          {task.title}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => handleToggleTask(task, e)}
                          className="text-slate-400 hover:text-emerald-600 shrink-0"
                        >
                          {isCompleted ? (
                            <CheckCircle2 size={14} className="text-emerald-600" />
                          ) : (
                            <Circle size={14} />
                          )}
                        </button>
                      </div>

                      {task.customer && (
                        <div className="text-[11px] text-blue-600 flex items-center gap-1 font-medium">
                          <User size={10} />
                          <span>{task.customer.fullName}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                        <span>{task.assignedTo || 'Tư vấn viên'}</span>
                        <span>
                          {task.scheduledAt
                            ? new Date(task.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : (task.dueAt ? new Date(task.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Modal tạo / sửa hoạt động */}
      <ActivityModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedDateForNew(null);
        }}
        workspaceId={activeWorkspaceId || undefined}
        defaultType={modalDefaultType}
        defaultDate={selectedDateForNew}
        initialActivity={editingActivity}
        onSuccess={() => {
          loadCalendarData();
        }}
      />
    </div>
  );
};
