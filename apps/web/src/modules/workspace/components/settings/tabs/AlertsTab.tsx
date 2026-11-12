import React, { useState, useEffect } from 'react';
import { Clock, Save } from 'lucide-react';
import { notify } from '../../../../../components/feedback/toastEmitter.js';

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
    <div className="w-full">
      <div className="p-4 sm:p-5 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-4 w-full">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600 shadow-2xs shrink-0">
            <Clock size={14} />
          </div>
          <div>
            <h4 className="m-0 text-xs font-bold text-slate-900 uppercase tracking-wider">
              {t('workspaceSettings.alerts.title', 'Cảnh Báo Tin Nhắn Chưa Phản Hồi (SLA)')}
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5 mb-0">
              {t('workspaceSettings.alerts.desc', 'Tự động gắn cờ cảnh báo trên danh sách tin nhắn Inbox khi khách nhắn tin nhưng tư vấn viên chưa phản hồi sau n phút.')}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-slate-50/70 rounded-xl border border-slate-200/80">
            <input
              type="checkbox"
              id="enableAlertToggle"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              disabled={!isOwner}
              className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
            />
            <label htmlFor="enableAlertToggle" className="cursor-pointer">
              <span className="block text-xs font-bold text-slate-800">
                {t('workspaceSettings.alerts.enable', 'Bật tính năng cảnh báo tin nhắn chậm phản hồi')}
              </span>
              <span className="block text-[11px] text-slate-500 mt-0.5">
                {t('workspaceSettings.alerts.enableDesc', 'Hệ thống đo lường thời gian từ lúc khách gửi tin nhắn cuối cùng nếu chưa có phản hồi từ nhân viên tư vấn.')}
              </span>
            </label>
          </div>

          {isEnabled && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-3.5 bg-rose-50/30 border border-rose-200/80 rounded-xl">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('workspaceSettings.alerts.maxWait', 'Thời gian chờ tối đa trước khi cảnh báo (phút):')}
                  </label>
                  <div className="flex items-center gap-2">
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
                      className="w-28 h-8 px-2.5 text-xs font-bold text-slate-800 border border-slate-300 rounded-lg outline-none focus:border-rose-500 bg-white shadow-2xs"
                    />
                    <span className="text-xs text-slate-600 font-medium">{t('workspaceSettings.minutesUnit', 'phút')}</span>
                  </div>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-1.5">
                    {t('workspaceSettings.alerts.quickPresets', 'Gợi ý mốc thời gian nhanh:')}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[5, 10, 15, 30, 60, 120].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setMinutes(mins)}
                        disabled={!isOwner}
                        className={`h-7 px-2.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                          minutes === mins
                            ? 'bg-blue-50 text-blue-600 border-blue-200/80 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {t('workspaceSettings.alerts.minsOption', '{n} phút', { n: mins })}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-rose-200/60 pt-3 lg:pt-0 lg:pl-4">
                <span className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                  {t('workspaceSettings.alerts.preview', 'Hiển thị xem trước trên giao diện Inbox:')}
                </span>
                <div className="flex items-center gap-2.5 p-2.5 bg-white rounded-lg border border-rose-200/80 shadow-2xs">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-md leading-none shrink-0">
                    <Clock size={11} className="text-rose-600 animate-pulse" />
                    {t('workspaceSettings.alerts.previewBadge', 'Chưa trả lời {n}p', { n: minutes })}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {t('workspaceSettings.alerts.previewDesc', 'Gắn cờ đỏ nổi bật và hỗ trợ lọc nhanh hội thoại vượt quá {n} phút.', { n: minutes })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {isOwner && (
            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="h-8 px-4 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white inline-flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
              >
                <Save size={13} />
                <span>{t('workspaceSettings.alerts.save', 'Lưu Cấu Hình Cảnh Báo')}</span>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

