import React, { useState, useEffect, useCallback } from 'react';
import {
  Phone,
  Calendar,
  CheckSquare,
  Clock,
  MapPin,
  Video,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Sparkles,
  Bot,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import {
  apiClient,
  type ActivityItem,
  type ActivityType,
} from '../../../lib/api-client/index.js';
import { ActivityModal } from './ActivityModal.js';
import { notify } from '../../../components/feedback/toastEmitter.js';

export interface ActivityTimelineSectionProps {
  customerId: string;
  customerName: string;
  workspaceId?: string;
  onNavigateToCalendar?: () => void;
}

export const ActivityTimelineSection: React.FC<ActivityTimelineSectionProps> = ({
  customerId,
  customerName,
  workspaceId,
  onNavigateToCalendar,
}) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | ActivityType>('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDefaultType, setModalDefaultType] = useState<ActivityType>('CALL');
  const [editingActivity, setEditingActivity] = useState<ActivityItem | null>(null);

  const loadActivities = useCallback(async () => {
    if (!customerId) return;
    setIsLoading(true);
    try {
      const res = await apiClient.getActivities({
        workspaceId,
        customerId,
        type: filterType === 'ALL' ? undefined : filterType,
        limit: 50,
      });
      setActivities(res.items || []);
    } catch {
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  }, [customerId, workspaceId, filterType]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const handleOpenCreateModal = (type: ActivityType) => {
    setEditingActivity(null);
    setModalDefaultType(type);
    setIsModalOpen(true);
  };

  const handleToggleTaskStatus = async (activity: ActivityItem) => {
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
          : `Đã mở lại nhiệm vụ: "${activity.title}"`
      );
    } catch {
      notify.error('Không thể cập nhật trạng thái nhiệm vụ');
    }
  };

  const handleDeleteActivity = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Bạn có chắc chắn muốn xóa hoạt động này?')) return;
    try {
      await apiClient.deleteActivity(id);
      setActivities((prev) => prev.filter((a) => a.id !== id));
      notify.success('Đã xóa hoạt động');
    } catch {
      notify.error('Lỗi khi xóa hoạt động');
    }
  };

  const formatRelativeTime = (isoString?: string | null) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-4 bg-white space-y-3">
      {/* 1. Header Dòng thời gian */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h4 className="m-0 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Nhật Ký Tương Tác ({activities.length})
          </h4>
        </div>

        {onNavigateToCalendar && (
          <button
            type="button"
            onClick={onNavigateToCalendar}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 bg-transparent border-0 cursor-pointer p-0 transition-colors"
            title="Mở Lịch biểu toàn màn hình"
          >
            <span>Xem Lịch</span>
            <ExternalLink size={11} />
          </button>
        )}
      </div>

      {/* 2. Bộ 3 nút thao tác nhanh (Quick Action Buttons) */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={() => handleOpenCreateModal('CALL')}
          className="flex flex-col items-center justify-center p-2 rounded-lg border border-amber-200/90 bg-amber-50/60 hover:bg-amber-100 text-amber-900 transition-all cursor-pointer group shadow-2xs"
          title="Lưu lại kết quả cuộc gọi tư vấn"
        >
          <Phone size={14} className="text-amber-600 mb-0.5 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-medium leading-tight">+ Cuộc gọi</span>
        </button>

        <button
          type="button"
          onClick={() => handleOpenCreateModal('MEETING')}
          className="flex flex-col items-center justify-center p-2 rounded-lg border border-blue-200/90 bg-blue-50/60 hover:bg-blue-100 text-blue-900 transition-all cursor-pointer group shadow-2xs"
          title="Đặt lịch hẹn test hoặc tư vấn trực tiếp"
        >
          <Calendar size={14} className="text-blue-600 mb-0.5 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-medium leading-tight">+ Lịch hẹn</span>
        </button>

        <button
          type="button"
          onClick={() => handleOpenCreateModal('TASK')}
          className="flex flex-col items-center justify-center p-2 rounded-lg border border-emerald-200/90 bg-emerald-50/60 hover:bg-emerald-100 text-emerald-900 transition-all cursor-pointer group shadow-2xs"
          title="Tạo việc cần làm & nhắc nhở"
        >
          <CheckSquare size={14} className="text-emerald-600 mb-0.5 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-medium leading-tight">+ Nhiệm vụ</span>
        </button>
      </div>

      {/* 3. Lọc theo loại hoạt động */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] scrollbar-none">
        {(['ALL', 'CALL', 'MEETING', 'TASK'] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`px-2 py-0.5 rounded-full border transition-colors cursor-pointer shrink-0 ${
              filterType === t
                ? 'bg-slate-800 text-white border-slate-800 font-medium'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            onClick={() => setFilterType(t)}
          >
            {t === 'ALL' && 'Tất cả'}
            {t === 'CALL' && 'Cuộc gọi'}
            {t === 'MEETING' && 'Lịch hẹn'}
            {t === 'TASK' && 'Nhiệm vụ'}
          </button>
        ))}
      </div>

      {/* 4. Dòng thời gian chi tiết (Vertical Timeline List) */}
      <div className="relative pl-5 space-y-3 pt-1 before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
        {activities.length === 0 ? (
          <div className="text-center py-4 text-slate-400 text-xs italic">
            Chưa có nhật ký hoạt động nào. Hãy bấm các nút trên để ghi lại cuộc gọi hoặc đặt lịch hẹn!
          </div>
        ) : (
          activities.map((item) => {
            const isCall = item.type === 'CALL';
            const isMeeting = item.type === 'MEETING';
            const isTask = item.type === 'TASK';
            const isAuto = Boolean(item.metadata?.isAutoGenerated);
            const isCompleted = item.status === 'COMPLETED';

            return (
              <div
                key={item.id}
                className="relative group text-xs cursor-pointer"
                onClick={() => {
                  setEditingActivity(item);
                  setIsModalOpen(true);
                }}
              >
                {/* Timeline Icon Point */}
                <div
                  className={`absolute -left-[25px] top-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 bg-white ${
                    isCall
                      ? 'border-amber-500 text-amber-500'
                      : isMeeting
                      ? 'border-blue-500 text-blue-500'
                      : isAuto
                      ? 'border-purple-500 text-purple-600'
                      : 'border-emerald-500 text-emerald-500'
                  }`}
                >
                  {isCall && <Phone size={8} />}
                  {isMeeting && <Calendar size={8} />}
                  {isTask && !isAuto && (isCompleted ? <CheckCircle2 size={9} className="text-emerald-600" /> : <Circle size={8} />)}
                  {isAuto && <Bot size={9} />}
                </div>

                {/* Card Container */}
                <div className={`p-2.5 rounded-lg border transition-all ${
                  isCompleted
                    ? 'bg-slate-50/70 border-slate-200/60 opacity-80'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                }`}>
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className={`font-semibold text-xs leading-snug ${isCompleted ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                      {item.title}
                    </span>

                    <button
                      type="button"
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-0.5 transition-opacity"
                      onClick={(e) => handleDeleteActivity(item.id, e)}
                      title="Xóa hoạt động này"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {/* Badge tags: Kết quả cuộc gọi / Hình thức meeting / Trạng thái Task */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    {isCall && item.callResult && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200/80">
                        <Phone size={9} />
                        <span>{item.callResult}</span>
                      </span>
                    )}

                    {isCall && Boolean(item.callDuration) && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-500">
                        <Clock size={9} />
                        <span>{Math.floor((item.callDuration || 0) / 60)}p {(item.callDuration || 0) % 60}s</span>
                      </span>
                    )}

                    {isMeeting && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-800 border border-blue-200/80">
                        {item.meetingType === 'OFFLINE' ? <MapPin size={9} /> : <Video size={9} />}
                        <span>{item.meetingType === 'OFFLINE' ? 'Trực tiếp CUSC' : (item.meetingType === 'GOOGLE_MEET' ? 'Google Meet' : 'Zoom')}</span>
                      </span>
                    )}

                    {isTask && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleTaskStatus(item);
                        }}
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border cursor-pointer ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 size={10} /> : <Circle size={9} />}
                        <span>{isCompleted ? 'Đã xong' : 'Chưa xong'}</span>
                      </button>
                    )}

                    {isAuto && (
                      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        <Sparkles size={9} />
                        <span>Tự động tạo</span>
                      </span>
                    )}

                    {item.assignedTo && (
                      <span className="text-[10px] text-slate-500 font-medium">
                        Phụ trách: {item.assignedTo}
                      </span>
                    )}
                  </div>

                  {/* Nội dung chi tiết */}
                  {item.description && (
                    <p className="text-[11px] text-slate-600 m-0 line-clamp-2 leading-relaxed bg-slate-50/80 p-1.5 rounded">
                      {item.description}
                    </p>
                  )}

                  {/* Footer thời gian */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
                    <span>
                      {item.scheduledAt
                        ? `Lịch hẹn: ${new Date(item.scheduledAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`
                        : (item.dueAt ? `Hạn chót: ${new Date(item.dueAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : '')}
                    </span>
                    <span>{formatRelativeTime(item.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal tạo / chỉnh sửa hoạt động */}
      <ActivityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        workspaceId={workspaceId}
        defaultType={modalDefaultType}
        defaultCustomerId={customerId}
        defaultCustomerName={customerName}
        initialActivity={editingActivity}
        onSuccess={() => {
          loadActivities();
        }}
      />
    </div>
  );
};
