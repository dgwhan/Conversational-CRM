import React, { useState, useEffect } from 'react';
import { Clock, Loader2, Save } from 'lucide-react';
import { notify } from '../../../../../components/feedback/toastEmitter.js';
import { Toggle, ConfigSubSectionHeader } from '../../../../../components/ui/index.js';

import { useTranslation } from '../../../../../i18n/index.js';
export interface AlertsTabProps {
  unresponsiveAlertMinutes?: number;
  isOwner: boolean;
  isLoading?: boolean;
  onSave: (minutes: number) => Promise<void>;
}

export const AlertsTab: React.FC<AlertsTabProps> = ({
  unresponsiveAlertMinutes = 15,
  isOwner,
  isLoading = false,
  onSave,
}) => {
  const { t } = useTranslation();
  const [minutes, setMinutes] = useState<number>(
    unresponsiveAlertMinutes > 0 ? unresponsiveAlertMinutes : 15
  );
  const [isEnabled, setIsEnabled] = useState<boolean>(unresponsiveAlertMinutes > 0);

  useEffect(() => {
    const mins = unresponsiveAlertMinutes > 0 ? unresponsiveAlertMinutes : 15;
    setMinutes(mins);
    setIsEnabled(unresponsiveAlertMinutes > 0);
  }, [unresponsiveAlertMinutes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalMinutes = isEnabled ? Math.max(1, Number(minutes) || 15) : 0;
    await onSave(finalMinutes);
    notify.success(
      finalMinutes > 0
        ? t('workspaceSettings.alerts.updated', 'Đã cập nhật cảnh báo tin nhắn chưa phản hồi sau {n} phút!', { n: finalMinutes })
        : t('workspaceSettings.alerts.disabled', 'Đã tắt cảnh báo tin nhắn chưa phản hồi.')
    );
  };

  return (
    <div className="w-full space-y-8 pb-12">
      <ConfigSubSectionHeader
        title={t('workspaceSettings.alerts.title', 'Cảnh Báo Tin Nhắn Chưa Phản Hồi (SLA)')}
        help={{
          title: t('workspaceSettings.alerts.title', 'Cảnh Báo Tin Nhắn Chưa Phản Hồi (SLA)'),
          description:
            'Hệ thống theo dõi thời gian phản hồi tin nhắn của nhân sự (SLA) và tự động gắn cờ cảnh báo khi thời gian chờ vượt quá giới hạn thiết lập.',
          example:
            'Khách hàng gửi tin nhắn mới và chưa có phản hồi sau 15 phút. Hệ thống tự động kích hoạt cảnh báo trễ phản hồi trên hội thoại và đẩy lên đầu danh sách ưu tiên.',
          rules: [
            'Cảnh báo chỉ áp dụng khi tin nhắn gần nhất đến từ khách hàng và chưa được nhân viên hoặc hệ thống phản hồi.',
            'Cờ cảnh báo tự động được gỡ bỏ ngay sau khi nhân sự gửi tin nhắn trả lời hoặc thực hiện thao tác bàn giao.',
            'Thời gian phản hồi được tính liên tục theo thời gian thực với ngưỡng cấu hình tối thiểu từ 1 phút.',
          ],
        }}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Right-Aligned Toggle Row */}
        <div className="flex items-center justify-between py-4 border-b border-slate-200">
          <div className="space-y-1 pr-4">
            <label htmlFor="enableAlertToggle" className="block text-sm font-semibold text-slate-800 cursor-pointer">
              {t('workspaceSettings.alerts.enable', 'Bật tính năng cảnh báo tin nhắn chậm phản hồi')}
            </label>
            <p className="text-xs text-slate-600 m-0 max-w-xl">
              {t('workspaceSettings.alerts.enableDesc', 'Hệ thống đo lường thời gian từ lúc khách gửi tin nhắn cuối cùng nếu chưa có phản hồi từ nhân viên tư vấn.')}
            </p>
          </div>
          <Toggle
            id="enableAlertToggle"
            checked={isEnabled}
            onChange={setIsEnabled}
            disabled={!isOwner}
            showStatusLabel
            labelOn={t('workspaceSettings.workingHours.on', 'Đang bật')}
            labelOff={t('workspaceSettings.workingHours.off', 'Tạm tắt')}
          />
        </div>

        {isEnabled && (
          <div className="space-y-6 py-2 border-b border-slate-200 pb-6">
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                {t('workspaceSettings.alerts.maxWait', 'Thời gian chờ tối đa trước khi cảnh báo (phút):')}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="1440"
                  placeholder="15"
                  value={minutes}
                  onChange={(e) =>
                    setMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))
                  }
                  disabled={!isOwner}
                  className="w-28 h-9 rounded-md border border-transparent bg-slate-100/80 px-3 text-sm font-semibold text-slate-800 text-center focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none transition-all"
                />
                <span className="text-sm text-slate-600 font-medium">{t('workspaceSettings.minutesUnit', 'phút')}</span>
              </div>
            </div>

            <div>
              <span className="block text-xs font-medium text-slate-500 mb-2">
                {t('workspaceSettings.alerts.quickPresets', 'Gợi ý mốc thời gian nhanh:')}
              </span>
              <div className="flex flex-wrap gap-2">
                {[5, 10, 15, 30, 60, 120].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setMinutes(mins)}
                    disabled={!isOwner}
                    className={`h-8 px-3 text-xs font-medium rounded-md transition-all cursor-pointer border-none ${minutes === mins
                        ? 'bg-blue-600 text-white font-semibold shadow-xs'
                        : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200/80'
                      }`}
                  >
                    {t('workspaceSettings.alerts.minsOption', '{n} phút', { n: mins })}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <span className="block text-xs font-semibold text-slate-600 mb-2">
                {t('workspaceSettings.alerts.preview', 'Hiển thị xem trước trên giao diện Inbox:')}
              </span>
              <div className="flex items-center gap-3 p-3 bg-slate-50/80 rounded-lg">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200/80 px-2.5 py-1 rounded-md leading-none shrink-0">
                  <Clock size={12} className="text-rose-600 animate-pulse" />
                  {t('workspaceSettings.alerts.previewBadge', 'Chưa trả lời {n}p', { n: minutes })}
                </span>
                <span className="text-xs text-slate-500">
                  {t('workspaceSettings.alerts.previewDesc', 'Gắn cờ đỏ nổi bật và hỗ trợ lọc nhanh hội thoại vượt quá {n} phút.', { n: minutes })}
                </span>
              </div>
            </div>
          </div>
        )}

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

