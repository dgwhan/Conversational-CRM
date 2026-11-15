import React, { useState, useEffect } from 'react';
import {
  Save,
  Loader2,
  Moon,
  Copy,
  Sparkles,
  Calendar,
  Tag as TagIcon,
  ShieldAlert,
} from 'lucide-react';
import type {
  WorkingHoursConfig,
  DayWorkingSchedule,
} from '../../workspaceConfig.types.js';
import { getDefaultWorkingHoursConfig } from '../../workspaceConfig.types.js';
import { WorkingHoursToggle } from './WorkingHoursToggle.js';
import { ConfigSubSectionHeader } from '../../../../components/ui/index.js';

import { useTranslation } from '../../../../i18n/index.js';
export interface WorkingHoursTabProps {
  workingHours?: WorkingHoursConfig;
  isOwner: boolean;
  isLoading?: boolean;
  onSave: (config: WorkingHoursConfig) => void;
}

export const WorkingHoursTab: React.FC<WorkingHoursTabProps> = ({
  workingHours,
  isOwner,
  isLoading = false,
  onSave,
}) => {
  const { t } = useTranslation();
  const [config, setConfig] = useState<WorkingHoursConfig>(() => {
    return workingHours || getDefaultWorkingHoursConfig();
  });

  // Đồng bộ lại khi prop workingHours từ cha thay đổi
  useEffect(() => {
    if (workingHours) {
      setConfig(workingHours);
    }
  }, [workingHours]);

  // Handler cập nhật trạng thái bật/tắt toàn bộ tính năng
  const handleToggleEnabled = () => {
    if (!isOwner) return;
    setConfig((prev) => ({
      ...prev,
      enabled: !prev.enabled,
    }));
  };

  // Handler cập nhật lịch làm việc của 1 ngày
  const handleUpdateSchedule = (
    dayOfWeek: number,
    field: keyof DayWorkingSchedule,
    value: any,
  ) => {
    if (!isOwner) return;
    setConfig((prev) => {
      const currentSchedules = Array.isArray(prev.schedules) ? [...prev.schedules] : [];
      const updated = currentSchedules.map((item) => {
        if (item.dayOfWeek === dayOfWeek) {
          return { ...item, [field]: value };
        }
        return item;
      });
      return { ...prev, schedules: updated };
    });
  };

  // Hành động nhanh: Đặt T2 - T6 từ 07:00 đến 17:00, T7 & CN nghỉ
  const applyPresetMondayToFriday = () => {
    if (!isOwner) return;
    setConfig((prev) => ({
      ...prev,
      schedules: [
        { dayOfWeek: 1, dayName: 'Thứ Hai', isOpen: true, openTime: '07:00', closeTime: '17:00' },
        { dayOfWeek: 2, dayName: 'Thứ Ba', isOpen: true, openTime: '07:00', closeTime: '17:00' },
        { dayOfWeek: 3, dayName: 'Thứ Tư', isOpen: true, openTime: '07:00', closeTime: '17:00' },
        { dayOfWeek: 4, dayName: 'Thứ Năm', isOpen: true, openTime: '07:00', closeTime: '17:00' },
        { dayOfWeek: 5, dayName: 'Thứ Sáu', isOpen: true, openTime: '07:00', closeTime: '17:00' },
        { dayOfWeek: 6, dayName: 'Thứ Bảy', isOpen: false, openTime: '07:00', closeTime: '12:00' },
        { dayOfWeek: 7, dayName: 'Chủ Nhật', isOpen: false, openTime: '07:00', closeTime: '12:00' },
      ],
      autoReplyMessage:
        t('workspaceSettings.workingHours.sampleReplyWeekdays', 'Cảm ơn bạn đã liên hệ! Hiện tại đang ngoài khung giờ làm việc của chúng tôi (Thứ 2 - Thứ 6: 07:00 - 17:00). Chúng tôi đã ghi nhận tin nhắn và tư vấn viên sẽ liên hệ lại với bạn ngay vào đầu giờ làm việc tiếp theo. Chúc bạn một ngày tốt lành!'),
    }));
  };

  // Hành động nhanh: Đặt T2 - T7 từ 07:30 đến 17:30, CN nghỉ
  const applyPresetMondayToSaturday = () => {
    if (!isOwner) return;
    setConfig((prev) => ({
      ...prev,
      schedules: [
        { dayOfWeek: 1, dayName: 'Thứ Hai', isOpen: true, openTime: '07:30', closeTime: '17:30' },
        { dayOfWeek: 2, dayName: 'Thứ Ba', isOpen: true, openTime: '07:30', closeTime: '17:30' },
        { dayOfWeek: 3, dayName: 'Thứ Tư', isOpen: true, openTime: '07:30', closeTime: '17:30' },
        { dayOfWeek: 4, dayName: 'Thứ Năm', isOpen: true, openTime: '07:30', closeTime: '17:30' },
        { dayOfWeek: 5, dayName: 'Thứ Sáu', isOpen: true, openTime: '07:30', closeTime: '17:30' },
        { dayOfWeek: 6, dayName: 'Thứ Bảy', isOpen: true, openTime: '07:30', closeTime: '17:30' },
        { dayOfWeek: 7, dayName: 'Chủ Nhật', isOpen: false, openTime: '07:30', closeTime: '12:00' },
      ],
    }));
  };

  // Sao chép giờ của một ngày áp dụng cho tất cả các ngày đang bật làm việc
  const copyTimeToAllOpenDays = (openTime: string, closeTime: string) => {
    if (!isOwner) return;
    setConfig((prev) => ({
      ...prev,
      schedules: (prev.schedules || []).map((s) =>
        s.isOpen ? { ...s, openTime, closeTime } : s,
      ),
    }));
  };

  // Nạp câu mẫu trả lời tự động gợi ý
  const setSampleAutoReply = () => {
    if (!isOwner) return;
    setConfig((prev) => ({
      ...prev,
      autoReplyMessage:
        t('workspaceSettings.workingHours.sampleReply', 'Cảm ơn bạn đã nhắn tin cho chúng tôi! Hiện tại đang ngoài khung giờ tư vấn viên làm việc. Chúng tôi đã lưu lại thông tin và sẽ gọi điện/nhắn tin phản hồi bạn sớm nhất vào đầu ngày làm việc tiếp theo. Chúc bạn có những phút giây thư giãn tuyệt vời!'),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(config);
  };

  return (
    <div className="w-full space-y-8 pb-12">
      {/* 1. Header Section */}
      <ConfigSubSectionHeader
        title={t('workspaceSettings.workingHours.title', 'Khung Giờ Làm Việc & Tự Động Trả Lời')}
        badge={
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Ngoài giờ làm việc
          </span>
        }
        actions={
          <WorkingHoursToggle
            checked={config.enabled}
            onChange={handleToggleEnabled}
            disabled={!isOwner}
            labelOn={t('workspaceSettings.workingHours.on', 'Đang bật')}
            labelOff={t('workspaceSettings.workingHours.off', 'Tạm tắt')}
          />
        }
        help={{
          title: t('workspaceSettings.workingHours.title', 'Khung Giờ Làm Việc & Tự Động Trả Lời'),
          description:
            'Hệ thống đối soát thời gian tiếp nhận thông tin theo từng ngày trong tuần để tự động gửi thông báo phản hồi khi phát sinh tương tác ngoài giờ vận hành.',
          example:
            'Khách hàng gửi tin nhắn vào lúc 22:30 ngoài khung giờ hoạt động. Hệ thống tự động gửi tin nhắn phản hồi đã cài đặt và gắn nhãn trạng thái "Ngoài giờ làm việc" trên hội thoại để nhân sự ưu tiên xử lý vào đầu ca kế tiếp.',
          rules: [
            'Khung giờ làm việc được xác định tự động theo múi giờ (timezone) đã cấu hình của không gian làm việc.',
            'Mỗi người liên hệ chỉ nhận tối đa 1 tin nhắn tự động trong suốt một phiên ngoài giờ để tránh trùng lặp nội dung.',
            'Thành viên phụ trách vẫn có thể chủ động gửi tin nhắn phản hồi trực tiếp bất cứ lúc nào khi cần thiết.',
          ],
        }}
        className="border-b border-slate-200 pb-4"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 2. Quick Preset Actions (Unboxed Flat Strip) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-slate-500 shrink-0" />
            <span className="text-xs font-semibold text-slate-700">
              {t('workspaceSettings.workingHours.quickPresets', 'Mẫu thiết lập nhanh:')}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={applyPresetMondayToFriday}
              disabled={!isOwner}
              className="h-7 px-3 text-xs font-medium rounded-full bg-white border border-slate-300 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-slate-700 transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
            >
              <Sparkles size={11} className="text-blue-500" />
              <span>{t('workspaceSettings.workingHours.presetMonFri', 'T2 - T6 (7h - 17h)')}</span>
            </button>
            <button
              type="button"
              onClick={applyPresetMondayToSaturday}
              disabled={!isOwner}
              className="h-7 px-3 text-xs font-medium rounded-full bg-white border border-slate-300 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-slate-700 transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
            >
              <span>{t('workspaceSettings.workingHours.presetMonSat', 'T2 - T7 (7h30 - 17h30)')}</span>
            </button>
          </div>
        </div>

        {/* 3. Bảng lịch làm việc 7 ngày trong tuần (Flattened Weekly Schedule) */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <label className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>{t('workspaceSettings.workingHours.weeklySchedule', 'Lịch Làm Việc Theo Ngày Trong Tuần')}</span>
            </label>
            <span className="text-[11px] text-slate-500">
              {t('workspaceSettings.workingHours.timezone', 'Múi giờ: {tz} (UTC+7)', { tz: config.timezone || 'Asia/Ho_Chi_Minh' })}
            </span>
          </div>

          <div className="border-t border-b border-slate-200 divide-y divide-slate-200 bg-white">
            {(config.schedules || []).map((schedule) => {
              const isWorking = schedule.isOpen;
              return (
                <div
                  key={schedule.dayOfWeek}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 px-1 sm:px-2 transition-colors ${isWorking ? 'bg-white' : 'bg-slate-50/40 text-slate-400'
                    }`}
                >
                  {/* Ngày & Trạng thái mở cửa */}
                  <div className="flex items-center gap-3 sm:min-w-[140px]">
                    <input
                      type="checkbox"
                      checked={schedule.isOpen}
                      onChange={(e) =>
                        handleUpdateSchedule(schedule.dayOfWeek, 'isOpen', e.target.checked)
                      }
                      disabled={!isOwner || !config.enabled}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                    />
                    <span className={`text-xs font-semibold ${isWorking ? 'text-slate-900' : 'text-slate-400'}`}>
                      {t(`workspaceSettings.workingHours.days.d${schedule.dayOfWeek}`, schedule.dayName)}
                    </span>
                    {!isWorking && (
                      <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded leading-none">
                        {t('workspaceSettings.workingHours.dayOff', 'Nghỉ')}
                      </span>
                    )}
                  </div>

                  {/* Khung giờ mở - đóng cửa */}
                  <div className="flex flex-wrap items-center gap-2 pl-7 sm:pl-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 font-medium">
                        {t('workspaceSettings.workingHours.from', 'Từ')}
                      </span>
                      <input
                        type="time"
                        value={schedule.openTime || '07:00'}
                        onChange={(e) =>
                          handleUpdateSchedule(schedule.dayOfWeek, 'openTime', e.target.value)
                        }
                        disabled={!isOwner || !isWorking || !config.enabled}
                        className="h-7 px-2 text-xs font-semibold text-slate-800 border border-slate-200 rounded-md outline-none focus:border-blue-500 bg-white disabled:bg-slate-100 disabled:text-slate-400 shadow-2xs"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 font-medium">
                        {t('workspaceSettings.workingHours.to', 'Đến')}
                      </span>
                      <input
                        type="time"
                        value={schedule.closeTime || '17:00'}
                        onChange={(e) =>
                          handleUpdateSchedule(schedule.dayOfWeek, 'closeTime', e.target.value)
                        }
                        disabled={!isOwner || !isWorking || !config.enabled}
                        className="h-7 px-2 text-xs font-semibold text-slate-800 border border-slate-200 rounded-md outline-none focus:border-blue-500 bg-white disabled:bg-slate-100 disabled:text-slate-400 shadow-2xs"
                      />
                    </div>

                    {isWorking && (
                      <button
                        type="button"
                        onClick={() => copyTimeToAllOpenDays(schedule.openTime, schedule.closeTime)}
                        disabled={!isOwner || !config.enabled}
                        title={t('workspaceSettings.workingHours.copyToAll', 'Áp dụng khung giờ này cho toàn bộ các ngày làm việc khác')}
                        className="h-7 px-2 text-[11px] font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded border border-transparent hover:border-blue-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Copy size={11} />
                        <span className="hidden md:inline">{t('workspaceSettings.workingHours.copy', 'Sao chép')}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Lời nhắn tự động khi nhận tin ngoài giờ */}
        <div className="py-6 border-b border-slate-200 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <label className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Moon size={13} className="text-amber-500" />
              <span>{t('workspaceSettings.workingHours.autoReplyTitle', 'Nội Dung Lời Nhắn Tự Động Sau Giờ Làm Việc')}</span>
            </label>
            <button
              type="button"
              onClick={setSampleAutoReply}
              disabled={!isOwner}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline cursor-pointer inline-flex items-center gap-1 border-none bg-transparent"
            >
              <Sparkles size={11} />
              <span>{t('workspaceSettings.workingHours.fillSample', 'Điền câu mẫu chuẩn')}</span>
            </button>
          </div>
          <textarea
            rows={3}
            value={config.autoReplyMessage || ''}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, autoReplyMessage: e.target.value }))
            }
            disabled={!isOwner || !config.enabled}
            placeholder={t('workspaceSettings.workingHours.autoReplyPlaceholder', 'VD: Cảm ơn bạn đã liên hệ! Hiện tại đang ngoài khung giờ làm việc...')}
            className="w-full p-3 text-xs text-slate-800 rounded-md border border-transparent bg-slate-100/80 outline-none focus:bg-white focus:border-blue-500 transition-colors disabled:bg-slate-50 disabled:text-slate-400 placeholder:text-slate-400"
          />
          <p className="text-xs text-slate-500 mt-1 mb-0">
            {t('workspaceSettings.workingHours.autoReplyHint', 'Tin nhắn này sẽ được tự động gửi ngay lập tức tới khách hàng trên kênh chat (Facebook Messenger, Zalo OA...) khi nhận được tin nhắn ngoài giờ.')}
          </p>
        </div>

        {/* 5. Cấu hình Tag đánh dấu & Chống spam Cooldown */}
        <div className="py-6 border-b border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Tag đánh dấu */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <TagIcon size={14} className="text-slate-600" />
                <label className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  {t('workspaceSettings.workingHours.tagLabel', 'Nhãn (Tag) Đánh Dấu Hội Thoại')}
                </label>
              </div>
              <input
                type="text"
                value={config.outOfOfficeTag || t('workspaceSettings.workingHours.defaultTag', 'HẸN TƯ VẤN SÁNG HÔM SAU')}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, outOfOfficeTag: e.target.value.trim() }))
                }
                disabled={!isOwner || !config.enabled}
                placeholder={t('workspaceSettings.workingHours.tagPlaceholder', 'VD: HẸN TƯ VẤN SÁNG HÔM SAU')}
                className="w-full h-9 px-3 text-xs font-medium text-slate-800 rounded-md border border-transparent bg-slate-100/80 outline-none focus:bg-white focus:border-blue-500 transition-colors placeholder:text-slate-400"
              />
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span>{t('workspaceSettings.workingHours.preview', 'Xem trước:')}</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded leading-none">
                  <Moon size={9} className="text-amber-700" />
                  <span>{config.outOfOfficeTag || t('workspaceSettings.workingHours.defaultTag', 'HẸN TƯ VẤN SÁNG HÔM SAU')}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed mb-0">
                {t('workspaceSettings.workingHours.tagHint', 'Đoạn hội thoại sẽ tự động gắn nhãn này và hiển thị huy hiệu nổi bật trong Inbox để nhân viên ưu tiên lọc và gọi tư vấn vào sáng hôm sau.')}
              </p>
            </div>

            {/* Giãn cách chống spam (Cooldown) */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <ShieldAlert size={14} className="text-slate-600" />
                <label className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  {t('workspaceSettings.workingHours.cooldownLabel', 'Thời Gian Chống Lặp Lại (Cooldown)')}
                </label>
              </div>
              <div className="relative inline-flex items-center w-full sm:w-44">
                <input
                  type="number"
                  min="0"
                  max="1440"
                  value={config.cooldownMinutes ?? 60}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      cooldownMinutes: Math.max(0, parseInt(e.target.value, 10) || 0),
                    }))
                  }
                  disabled={!isOwner || !config.enabled}
                  className="w-full h-9 pl-3 pr-12 text-xs font-semibold text-slate-800 rounded-md border border-transparent bg-slate-100/80 outline-none focus:bg-white focus:border-blue-500 transition-colors"
                />
                <span className="absolute right-3 text-xs font-medium text-slate-500 pointer-events-none">
                  {t('workspaceSettings.minutesUnit', 'phút')}
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed mb-0">
                {t('workspaceSettings.workingHours.cooldownHint', 'Nếu một khách hàng gửi liên tục nhiều tin nhắn trong đêm, hệ thống chỉ gửi 1 lời nhắn tự động duy nhất trong khoảng thời gian này (tránh làm phiền khách).')}
              </p>
            </div>
          </div>
        </div>

        {/* 6. Nút Lưu Cấu Hình */}
        {isOwner && (
          <div className="pt-6 pb-12 flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer border-none shadow-2xs inline-flex flex-row items-center justify-center gap-1.5 whitespace-nowrap"
            >
              {isLoading ? (
                <Loader2 size={14} className="animate-spin shrink-0" />
              ) : (
                <Save size={14} className="shrink-0" />
              )}
              <span>{isLoading ? 'Đang lưu...' : 'Lưu cài đặt'}</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
