import React, { useState, useEffect } from 'react';
import {
  Phone,
  Calendar,
  CheckSquare,
  MapPin,
  Video,
  User,
  Send,
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal.js';
import {
  apiClient,
  type ActivityItem,
  type ActivityType,
  type ActivityPriority,
  type MeetingType,
} from '../../../lib/api-client/index.js';
import { notify } from '../../../components/feedback/toastEmitter.js';
import { useTranslation } from '../../../i18n/index.js';
import {
  formatLocalDate,
  formatLocalTime,
  parseLocalDateTime,
} from '../../calendar/utils/dateTimeUtils.js';

export interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId?: string;
  defaultType?: ActivityType;
  defaultDate?: Date | null;
  defaultCustomerId?: string;
  defaultContactId?: string;
  defaultCustomerName?: string;
  initialActivity?: ActivityItem | null;
  onSuccess?: (activity: ActivityItem) => void;
}

const getCallResultsPresets = (t: (k: string, fb?: string) => string) => [
  t('activities.callPresets.agreedEnroll', 'Đã kết nối - Đồng ý học, hỏi thêm học bổng'),
  t('activities.callPresets.bookedEntranceTest', 'Đã kết nối - Hẹn lên trung tâm làm bài test'),
  t('activities.callPresets.parentConsidering', 'Đã kết nối - Phụ huynh cân nhắc học phí'),
  t('activities.callPresets.unreachable', 'Thuê bao / Không nghe máy'),
  t('activities.callPresets.busyCallBackLater', 'Máy bận - Hẹn gọi lại sau'),
  t('activities.callPresets.wrongNumber', 'Sai số / Nhầm máy'),
  t('activities.callPresets.declinedNoNeed', 'Từ chối - Không có nhu cầu'),
];

export const ActivityModal: React.FC<ActivityModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  defaultType = 'CALL',
  defaultDate,
  defaultCustomerId,
  defaultContactId,
  defaultCustomerName,
  initialActivity,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const callResultsPresets = getCallResultsPresets(t);
  const [activeTab, setActiveTab] = useState<ActivityType>(defaultType);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [customerId, setCustomerId] = useState(defaultCustomerId || '');
  const [customerName, setCustomerName] = useState(defaultCustomerName || '');

  // Call states
  const [callResult, setCallResult] = useState(callResultsPresets[0]);
  const [callMinutes, setCallMinutes] = useState('3');
  const [callSeconds, setCallSeconds] = useState('30');

  // Meeting states
  const [meetingType, setMeetingType] = useState<MeetingType>('OFFLINE');
  const [meetingLocation, setMeetingLocation] = useState('Văn phòng Tuyển sinh CUSC - Khu 3, ĐH Cần Thơ, Số 01 Lý Tự Trọng');
  const [meetingJoinUrl, setMeetingJoinUrl] = useState('');

  // Task & Time states
  const [priority, setPriority] = useState<ActivityPriority>('MEDIUM');
  const [assignedTo, setAssignedTo] = useState('Tư vấn viên');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [hasReminder, setHasReminder] = useState(true);

  // Điền dữ liệu khi chỉnh sửa hoặc mở mới
  useEffect(() => {
    if (!isOpen) return;

    if (initialActivity) {
      setActiveTab(initialActivity.type);
      setTitle(initialActivity.title);
      setDescription(initialActivity.description || '');
      setCustomerId(initialActivity.customerId || '');
      setCustomerName(initialActivity.customer?.fullName || '');
      setPriority(initialActivity.priority || 'MEDIUM');
      setAssignedTo(initialActivity.assignedTo || 'Tư vấn viên');

      if (initialActivity.type === 'CALL') {
        setCallResult(initialActivity.callResult || callResultsPresets[0]);
        const dur = initialActivity.callDuration || 0;
        setCallMinutes(String(Math.floor(dur / 60)));
        setCallSeconds(String(dur % 60));
      }

      if (initialActivity.type === 'MEETING') {
        setMeetingType((initialActivity.meetingType as MeetingType) || 'OFFLINE');
        setMeetingLocation(initialActivity.meetingLocation || '');
        setMeetingJoinUrl(initialActivity.meetingJoinUrl || '');
      }

      const dateObj = initialActivity.scheduledAt
        ? new Date(initialActivity.scheduledAt)
        : (initialActivity.dueAt ? new Date(initialActivity.dueAt) : new Date());
      setScheduledDate(formatLocalDate(dateObj));
      setScheduledTime(formatLocalTime(dateObj));
    } else {
      setActiveTab(defaultType);
      setCustomerId(defaultCustomerId || '');
      setCustomerName(defaultCustomerName || '');

      // Thiết lập ngày mặc định theo giờ địa phương (ưu tiên defaultDate nếu được chọn từ ô lịch)
      const now = new Date();
      const baseDate = defaultDate || (defaultType === 'TASK' ? new Date(now.getTime() + 86400000) : (defaultType === 'MEETING' ? new Date(now.getTime() + 2 * 86400000) : now));
      setScheduledDate(formatLocalDate(baseDate));

      if (defaultType === 'TASK') {
        setScheduledTime('14:00');
        setTitle(defaultCustomerName ? `Gọi lại cho bạn ${defaultCustomerName}` : 'Gọi lại tư vấn ứng viên');
        setDescription('Liên hệ trao đổi thông tin học bổng và xác nhận lịch học');
      } else if (defaultType === 'MEETING') {
        setScheduledTime('09:00');
        setTitle(defaultCustomerName ? `Hẹn test đầu vào cho ${defaultCustomerName}` : 'Hẹn làm bài kiểm tra đầu vào');
        setDescription('Thí sinh đến làm bài test tiếng Anh và logic tại phòng thực hành CUSC');
      } else {
        setScheduledTime(formatLocalTime(now));
        setTitle(defaultCustomerName ? `Tư vấn điện thoại: ${defaultCustomerName}` : 'Nhật ký gọi điện tư vấn');
        setDescription('Đã trao đổi về lộ trình đào tạo và điều kiện tuyển sinh');
      }
    }
  }, [isOpen, defaultType, defaultDate, defaultCustomerId, defaultCustomerName, initialActivity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      notify.warning(t('activities.titleRequiredWarn', 'Vui lòng nhập tiêu đề hoạt động'));
      return;
    }

    setIsSubmitting(true);
    try {
      // Tính toán thời gian datetime chuẩn theo giờ địa phương (GMT+7)
      const scheduledDateTime = parseLocalDateTime(scheduledDate, scheduledTime);

      const totalSeconds = (parseInt(callMinutes, 10) || 0) * 60 + (parseInt(callSeconds, 10) || 0);

      const payload: any = {
        workspaceId,
        customerId: customerId || undefined,
        contactId: defaultContactId || undefined,
        metadata: { customerName },
        type: activeTab,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        assignedTo,
        status: initialActivity?.status || 'PENDING',
        scheduledAt: scheduledDateTime || undefined,
        dueAt: activeTab === 'TASK' ? (scheduledDateTime || undefined) : undefined,
        reminderAt: hasReminder && scheduledDateTime ? new Date(scheduledDateTime.getTime() - 15 * 60000) : undefined,
      };

      if (activeTab === 'CALL') {
        payload.callResult = callResult;
        payload.callDuration = totalSeconds;
        // Nếu là cuộc gọi vừa xong thì đánh dấu COMPLETED luôn
        if (!initialActivity) {
          payload.status = 'COMPLETED';
          payload.completedAt = new Date().toISOString();
        }
      } else if (activeTab === 'MEETING') {
        payload.meetingType = meetingType;
        payload.meetingLocation = meetingType === 'OFFLINE' ? meetingLocation : undefined;
        payload.meetingJoinUrl = meetingType !== 'OFFLINE' ? meetingJoinUrl : undefined;
      }

      let result: ActivityItem;
      if (initialActivity) {
        result = await apiClient.updateActivity(initialActivity.id, payload);
        notify.success(`${t('activities.updateSuccess', 'Đã cập nhật')}: "${result.title}"`);
      } else {
        result = await apiClient.createActivity(payload);
        notify.success(`${t('activities.createSuccess', 'Đã tạo thành công')}: "${result.title}"`);
      }

      onSuccess?.(result);
      onClose();
    } catch (err) {
      notify.error(`${t('activities.saveError', 'Lỗi khi lưu hoạt động')}: ${(err as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialActivity ? t('activities.modalTitleEdit', 'Chỉnh sửa Hoạt động & Nhiệm vụ') : t('activities.modalTitleCreate', 'Ghi nhận Hoạt động / Tạo Lịch hẹn')}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Navigation Tabs */}
        {!initialActivity && (
          <div className="flex border-b border-slate-200">
            <button
              type="button"
              className={`flex items-center gap-1.5 py-2.5 px-3 font-medium transition-colors border-b-2 -mb-[1px] cursor-pointer ${
                activeTab === 'CALL'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
              onClick={() => {
                setActiveTab('CALL');
                setTitle(customerName ? `Tư vấn điện thoại: ${customerName}` : 'Nhật ký cuộc gọi');
              }}
            >
              <Phone size={14} />
              <span>{t('activities.tabCall', 'Ghi cuộc gọi')}</span>
            </button>

            <button
              type="button"
              className={`flex items-center gap-1.5 py-2.5 px-3 font-medium transition-colors border-b-2 -mb-[1px] cursor-pointer ${
                activeTab === 'MEETING'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
              onClick={() => {
                setActiveTab('MEETING');
                setTitle(customerName ? `Hẹn test đầu vào cho ${customerName}` : 'Đặt lịch hẹn test / tư vấn');
              }}
            >
              <Calendar size={14} />
              <span>{t('activities.tabMeeting', 'Đặt lịch hẹn')}</span>
            </button>

            <button
              type="button"
              className={`flex items-center gap-1.5 py-2.5 px-3 font-medium transition-colors border-b-2 -mb-[1px] cursor-pointer ${
                activeTab === 'TASK'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
              onClick={() => {
                setActiveTab('TASK');
                setTitle(customerName ? `Gọi lại cho bạn ${customerName}` : 'Nhiệm vụ & Nhắc việc');
              }}
            >
              <CheckSquare size={14} />
              <span>{t('activities.tabTask', 'Nhiệm vụ / Nhắc việc')}</span>
            </button>
          </div>
        )}

        {/* Thông tin khách hàng liên kết */}
        {customerName && (
          <div className="flex items-center gap-2 p-2 bg-blue-50/70 border border-blue-100 rounded-lg text-blue-900">
            <User size={14} className="text-blue-600 shrink-0" />
            <span className="font-semibold">{customerName}</span>
            <span className="text-slate-500 text-[11px] ml-auto">{t('activities.linkedToCandidate', 'Gắn vào hồ sơ ứng viên')}</span>
          </div>
        )}

        {/* Tiêu đề */}
        <div>
          <label className="block font-medium text-slate-700 mb-1">
            {t('activities.titleLabel', 'Tiêu đề')} <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('activities.titlePlaceholder', 'Ví dụ: Gọi lại tư vấn học bổng, Hẹn làm test đầu vào...')}
            required
          />
        </div>

        {/* Tab 1: Cuộc gọi */}
        {activeTab === 'CALL' && (
          <div className="space-y-3 bg-amber-50/40 p-3 rounded-lg border border-amber-100">
            <div>
              <label className="block font-medium text-slate-700 mb-1">{t('activities.callResultLabel', 'Kết quả cuộc gọi')}</label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={callResult}
                onChange={(e) => setCallResult(e.target.value)}
              >
                {callResultsPresets.map((res, i) => (
                  <option key={i} value={res}>
                    {res}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">{t('activities.callDurationLabel', 'Thời lượng cuộc gọi')}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="180"
                    className="w-16 px-2 py-1.5 border border-slate-300 rounded bg-white text-center"
                    value={callMinutes}
                    onChange={(e) => setCallMinutes(e.target.value)}
                  />
                  <span>{t('activities.minutes', 'phút')}</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    className="w-16 px-2 py-1.5 border border-slate-300 rounded bg-white text-center"
                    value={callSeconds}
                    onChange={(e) => setCallSeconds(e.target.value)}
                  />
                  <span>{t('activities.seconds', 'giây')}</span>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">{t('activities.callTimeLabel', 'Thời điểm gọi')}</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                  <input
                    type="time"
                    className="w-24 px-2 py-1.5 border border-slate-300 rounded bg-white"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Lịch hẹn */}
        {activeTab === 'MEETING' && (
          <div className="space-y-3 bg-blue-50/40 p-3 rounded-lg border border-blue-100">
            <div>
              <label className="block font-medium text-slate-700 mb-1">{t('activities.meetingTypeLabel', 'Hình thức cuộc hẹn')}</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border cursor-pointer font-medium ${
                    meetingType === 'OFFLINE'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                  onClick={() => setMeetingType('OFFLINE')}
                >
                  <MapPin size={13} />
                  <span>{t('activities.meetingOffline', 'Trực tiếp')}</span>
                </button>
                <button
                  type="button"
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border cursor-pointer font-medium ${
                    meetingType === 'GOOGLE_MEET'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                  onClick={() => {
                    setMeetingType('GOOGLE_MEET');
                    if (!meetingJoinUrl) setMeetingJoinUrl('https://meet.google.com/cusc-recruitment');
                  }}
                >
                  <Video size={13} />
                  <span>{t('activities.meetingGoogleMeet', 'Google Meet')}</span>
                </button>
                <button
                  type="button"
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border cursor-pointer font-medium ${
                    meetingType === 'ZOOM'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                  onClick={() => {
                    setMeetingType('ZOOM');
                    if (!meetingJoinUrl) setMeetingJoinUrl('https://zoom.us/j/8889991234');
                  }}
                >
                  <Video size={13} />
                  <span>{t('activities.meetingZoom', 'Zoom Meeting')}</span>
                </button>
              </div>
            </div>

            {meetingType === 'OFFLINE' ? (
              <div>
                <label className="block font-medium text-slate-700 mb-1">{t('activities.meetingLocationLabel', 'Địa điểm hẹn')}</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  value={meetingLocation}
                  onChange={(e) => setMeetingLocation(e.target.value)}
                  placeholder={t('activities.meetingLocationPlaceholder', 'Ví dụ: Phòng Lab 03, Tầng 2 Trung tâm CUSC')}
                />
              </div>
            ) : (
              <div>
                <label className="block font-medium text-slate-700 mb-1">{t('activities.meetingLinkLabel', 'Link phòng họp trực tuyến')}</label>
                <input
                  type="url"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  value={meetingJoinUrl}
                  onChange={(e) => setMeetingJoinUrl(e.target.value)}
                  placeholder="https://meet.google.com/..."
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">{t('activities.meetingDateLabel', 'Ngày hẹn')}</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">{t('activities.meetingTimeLabel', 'Giờ hẹn')}</label>
                <input
                  type="time"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Nhiệm vụ */}
        {activeTab === 'TASK' && (
          <div className="space-y-3 bg-emerald-50/40 p-3 rounded-lg border border-emerald-100">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">{t('activities.assignedToLabel', 'Phân công thực hiện')}</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                >
                  <option value="Tư vấn viên">{t('activities.counselorRole', 'Tư vấn viên phụ trách')}</option>
                  <option value="Phòng Đào tạo">{t('activities.academicRole', 'Phòng Đào tạo (Xếp máy/Coi thi)')}</option>
                  <option value="Ban Giám đốc Tuyển sinh">{t('activities.directorRole', 'Ban Giám đốc Tuyển sinh')}</option>
                  <option value="Bộ phận Kế toán">{t('activities.accountingRole', 'Bộ phận Kế toán (Thu học phí)')}</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">{t('activities.priorityLabel', 'Mức độ ưu tiên')}</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as ActivityPriority)}
                >
                  <option value="LOW">{t('deals.priorityLow', 'Thấp (Có thể hoãn)')}</option>
                  <option value="MEDIUM">{t('deals.priorityMedium', 'Bình thường')}</option>
                  <option value="HIGH">{t('deals.priorityHigh', 'Quan trọng / Ưu tiên')}</option>
                  <option value="URGENT">{t('deals.priorityUrgent', 'Khẩn cấp (Hôm nay)')}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">{t('activities.dueDateLabel', 'Hạn chót hoàn thành')}</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">{t('activities.dueTimeLabel', 'Thời gian')}</label>
                <input
                  type="time"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="reminderCheckbox"
                checked={hasReminder}
                onChange={(e) => setHasReminder(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="reminderCheckbox" className="text-slate-700 cursor-pointer select-none">
                {t('activities.reminderLabel', 'Kích hoạt chuông thông báo & nhắc nhở trước 15 phút')}
              </label>
            </div>
          </div>
        )}

        {/* Nội dung ghi chú / chi tiết */}
        <div>
          <label className="block font-medium text-slate-700 mb-1">
            {t('activities.notesLabel', 'Nội dung chi tiết / Kết quả tư vấn')}
          </label>
          <textarea
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('activities.notesPlaceholder', 'Ghi chú thêm thông tin phụ huynh, câu hỏi về học bổng hoặc yêu cầu chuẩn bị...')}
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
          <button
            type="button"
            className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors font-medium cursor-pointer"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t('common.cancel', 'Hủy')}
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span>{t('activities.savingBtn', 'Đang lưu...')}</span>
            ) : (
              <>
                <Send size={13} />
                <span>{initialActivity ? t('activities.saveChangesBtn', 'Lưu thay đổi') : t('activities.confirmCreateBtn', 'Xác nhận tạo')}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
