import React, { useState, useEffect, useCallback } from 'react';
import {
  Trash2,
  RefreshCw,
  Zap,
  Save,
} from 'lucide-react';
import { Button, Toggle, SearchableSelect, ConfigSubSectionHeader } from '../../../../../components/ui/index.js';
import { notify } from '../../../../../components/feedback/toastEmitter.js';
import { confirmDialog } from '../../../../../components/feedback/confirmDialog.js';
import { apiClient } from '../../../../../lib/api-client/index.js';
import type {
  MessageStorageMetrics,
  StorageRetentionPolicy,
  PurgeMessagesResponse,
} from '../../../../../lib/api-client/messaging-storage.types.js';
import { PurgeConfirmModal } from '../modals/PurgeConfirmModal.js';

import { useTranslation } from '../../../../../i18n/index.js';
import { translate } from '../../../../../i18n/translate.js';
interface MessageStorageTabProps {
  workspaceId?: string;
  isOwner?: boolean;
}

export const MessageStorageTab: React.FC<MessageStorageTabProps> = ({
  workspaceId,
  isOwner = true,
}) => {
  const { t, locale } = useTranslation();
  const [metrics, setMetrics] = useState<MessageStorageMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Policy Form State
  const [policy, setPolicy] = useState<StorageRetentionPolicy>({
    enabled: true,
    retentionMonths: 12,
    autoCleanupEnabled: true,
    slimPayloadOnly: false,
    cronSchedule: '0 2 * * *',
    lastRunAt: null,
  });
  const [isSavingPolicy, setIsSavingPolicy] = useState<boolean>(false);

  // Purge Modal State
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState<boolean>(false);
  const [isTriggeringRetention, setIsTriggeringRetention] = useState<boolean>(false);

  const fetchMetrics = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const data = await apiClient.getMessageStorageMetrics(workspaceId);
      setMetrics(data);
      if (data.retentionPolicy) {
        setPolicy(data.retentionPolicy);
      }
    } catch (err: any) {
      notify.error(
        err.message || translate('workspaceSettings.storage.loadError', 'Không thể lấy số liệu dung lượng tin nhắn.'),
        translate('workspaceSettings.storage.loadErrorTitle', 'Lỗi tải dữ liệu lưu trữ'),
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const handleSavePolicy = async () => {
    if (!workspaceId) {
      notify.error(
        translate('workspaceSettings.storage.selectWorkspace', 'Vui lòng chọn không gian làm việc để lưu cấu hình.'),
        translate('workspaceSettings.storage.missingInfo', 'Thiếu thông tin'),
      );
      return;
    }

    setIsSavingPolicy(true);
    try {
      const updated = await apiClient.updateMessageStoragePolicy(workspaceId, {
        enabled: policy.enabled,
        retentionMonths: policy.retentionMonths,
        autoCleanupEnabled: policy.autoCleanupEnabled,
        slimPayloadOnly: policy.slimPayloadOnly,
      });
      setPolicy(updated);
      notify.success(
        translate('workspaceSettings.storage.policySaved', 'Chính sách lưu trữ tin nhắn đã được lưu vào hệ thống.'),
        translate('workspaceSettings.storage.updateSuccess', 'Cập nhật thành công'),
      );
    } catch (err: any) {
      notify.error(
        err.message || translate('workspaceSettings.storage.policySaveError', 'Không thể lưu chính sách lưu trữ.'),
        translate('workspaceSettings.storage.updateFailed', 'Cập nhật thất bại'),
      );
    } finally {
      setIsSavingPolicy(false);
    }
  };

  const handleTriggerRetentionNow = async () => {
    const confirmed = await confirmDialog({
      tone: 'warning',
      title: translate('confirmDialog.runCleanupTitle', 'Chạy dọn dẹp ngay?'),
      message: translate(
        'workspaceSettings.storage.confirmRunNow',
        'Bạn có chắc chắn muốn kích hoạt quy trình tự động dọn dẹp tin nhắn quá hạn 12 tháng ngay bây giờ không?',
      ),
      confirmText: translate('confirmDialog.runCleanupConfirm', 'Chạy ngay'),
    });
    if (!confirmed) return;

    setIsTriggeringRetention(true);
    try {
      const res = await apiClient.triggerMessageRetentionNow(workspaceId);
      notify.success(
        translate('workspaceSettings.storage.cleanupDone', 'Đã dọn dẹp {n} tin nhắn, giải phóng {size}.', { n: res.deletedMessagesCount + res.slimmedMessagesCount, size: res.freedSizeFormatted }),
        translate('workspaceSettings.storage.cleanupDoneTitle', 'Dọn dẹp hoàn tất'),
      );
      await fetchMetrics(true);
    } catch (err: any) {
      notify.error(
        err.message || translate('workspaceSettings.storage.cleanupError', 'Không thể chạy dọn dẹp tự động.'),
        translate('workspaceSettings.storage.cleanupErrorTitle', 'Lỗi dọn dẹp định kỳ'),
      );
    } finally {
      setIsTriggeringRetention(false);
    }
  };

  const handlePurgeSuccess = (res: PurgeMessagesResponse) => {
    notify.success(
      translate('workspaceSettings.storage.purgeDone', 'Đã xử lý {n} tin nhắn ({size} giải phóng trong {ms}ms).', { n: res.deletedMessagesCount + res.slimmedMessagesCount, size: res.freedSizeFormatted, ms: res.durationMs }),
      translate('workspaceSettings.storage.purgeDoneTitle', 'Dọn dẹp thành công'),
    );
    fetchMetrics(true);
  };

  if (isLoading && !metrics) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-3" />
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('workspaceSettings.storage.measuring', 'Đang đo lường mức dung lượng tin nhắn từ PostgreSQL...')}</p>
      </div>
    );
  }

  const olderThan12mCount = metrics?.ageBreakdown?.olderThan12Months?.count || 0;
  const olderThan12mSize = metrics?.ageBreakdown?.olderThan12Months?.estimatedSizeFormatted || '0 B';

  return (
    <div className="space-y-8 w-full pb-12">
      {/* 1. Header & Điều khiển thao tác nhanh */}
      <ConfigSubSectionHeader
        title={t('workspaceSettings.storage.title', 'Quản lý Dung lượng & Lưu trữ Tin nhắn')}
        actions={
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchMetrics(true)}
              disabled={isRefreshing}
              className="inline-flex flex-row items-center gap-1.5 whitespace-nowrap text-xs px-3 py-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="whitespace-nowrap">{t('workspaceSettings.storage.refresh', 'Làm mới số liệu')}</span>
            </Button>

            {isOwner && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleTriggerRetentionNow}
                  disabled={isTriggeringRetention}
                  className="inline-flex flex-row items-center gap-1.5 whitespace-nowrap text-xs px-3 py-1.5"
                >
                  <Zap className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                  <span className="whitespace-nowrap">{t('workspaceSettings.storage.runNow', 'Chạy dọn dẹp 12 tháng ngay')}</span>
                </Button>

                <button
                  type="button"
                  onClick={() => setIsPurgeModalOpen(true)}
                  className="inline-flex flex-row items-center gap-1.5 whitespace-nowrap text-xs font-medium px-3 py-1.5 rounded-md border border-red-200 text-red-600 bg-white hover:bg-red-50 transition-colors cursor-pointer shadow-2xs"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">{t('workspaceSettings.storage.manualCleanup', 'Dọn dẹp thủ công')}</span>
                </button>
              </>
            )}
          </div>
        }
        help={{
          title: t('workspaceSettings.storage.title', 'Quản lý Dung lượng & Lưu trữ Tin nhắn'),
          description:
            'Hệ thống giám sát chi tiết dung lượng lưu trữ cơ sở dữ liệu và lượng tài nguyên tiêu thụ theo từng giai đoạn thời gian phát sinh.',
          example:
            'Quản trị viên nhấn "Chạy dọn dẹp 12 tháng ngay". Hệ thống tự động kích hoạt tiến trình xử lý ngầm để giải phóng các dữ liệu tin nhắn quá hạn và tối ưu dung lượng lưu trữ.',
          rules: [
            'Chỉ tài khoản Chủ sở hữu không gian làm việc mới có thẩm quyền thực thi tác vụ dọn dẹp dữ liệu.',
            'Quá trình dọn dẹp chỉ áp dụng với nội dung tin nhắn và tệp đính kèm quá hạn, bảo toàn toàn bộ danh sách liên hệ và lịch sử giao dịch cốt lõi.',
            'Số liệu dung lượng sau dọn dẹp sẽ được đồng bộ và làm mới trên bảng chỉ số ngay khi tiến trình hoàn tất.',
          ],
        }}
        className="pb-4 border-b border-slate-200"
      />

      {/* 2. Unified Flat KPI Strip (4-column horizontal metric strip) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 border-y border-slate-200 py-5 bg-slate-50/40">
        {/* Col 1: Tổng dung lượng */}
        <div className="px-5 py-2 sm:py-0">
          <div className="text-xs font-medium text-slate-600">
            {t('workspaceSettings.storage.totalSize', 'Tổng dung lượng')}
          </div>
          <div className="text-xl font-semibold text-slate-950 mt-1">
            {metrics?.totalSizeFormatted || '0 B'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 truncate">
            TOAST: {apiClient.messageStorageApi ? metrics?.toastSizeBytes ? `${(metrics.toastSizeBytes / (1024 * 1024)).toFixed(1)} MB` : '0 MB' : '0 MB'} · Index: {metrics?.indexSizeBytes ? `${(metrics.indexSizeBytes / (1024 * 1024)).toFixed(1)} MB` : '0 MB'}
          </div>
        </div>

        {/* Col 2: Tổng số tin nhắn */}
        <div className="px-5 py-2 sm:py-0">
          <div className="text-xs font-medium text-slate-600">
            {t('workspaceSettings.storage.totalMessages', 'Tổng số tin nhắn')}
          </div>
          <div className="text-xl font-semibold text-slate-950 mt-1">
            {metrics?.totalMessages?.toLocaleString('vi-VN') || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 truncate">
            {t('workspaceSettings.storage.average', 'Trung bình: ~{n} bytes / tin nhắn', { n: metrics?.averageMessageSizeBytes || 0 })}
          </div>
        </div>

        {/* Col 3: Tin nhắn quá hạn (> 12 tháng) */}
        <div className="px-5 py-2 sm:py-0">
          <div className="text-xs font-medium text-slate-600">
            {t('workspaceSettings.storage.expired', 'Tin nhắn quá hạn (> 12 tháng)')}
          </div>
          <div className="text-xl font-semibold text-slate-950 mt-1 flex items-baseline gap-1.5">
            <span>{olderThan12mCount.toLocaleString('vi-VN')}</span>
            <span className="text-xs font-normal text-slate-500">({olderThan12mSize})</span>
          </div>
          <div className="text-[11px] mt-0.5 truncate">
            {olderThan12mCount > 0 ? (
              <span className="text-amber-600 font-medium">Sẵn sàng dọn dẹp</span>
            ) : (
              <span className="text-emerald-600 font-medium">Tối ưu, không có tin quá hạn</span>
            )}
          </div>
        </div>

        {/* Col 4: Tự động dọn dẹp */}
        <div className="px-5 py-2 sm:py-0">
          <div className="text-xs font-medium text-slate-600">
            {t('workspaceSettings.storage.autoCleanup', 'Tự động dọn dẹp')}
          </div>
          <div className="text-xl font-semibold text-slate-950 mt-1 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${policy.autoCleanupEnabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            <span className={policy.autoCleanupEnabled ? 'text-emerald-700' : 'text-slate-600'}>
              {policy.autoCleanupEnabled ? t('workspaceSettings.storage.active', 'Đang hoạt động') : t('workspaceSettings.storage.paused', 'Tạm dừng')}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 truncate">
            {t('workspaceSettings.storage.scheduleSummary', 'Hàng ngày lúc 02:00 AM • Sau {n} tháng', { n: policy.retentionMonths || 12 })}
          </div>
        </div>
      </div>

      {/* 3. Flat Two-Column Distribution Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 py-6 border-b border-slate-200">
        {/* Phân bổ theo Kênh giao tiếp */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-950 m-0">
              {t('workspaceSettings.storage.byChannel', 'Phân bổ Dung lượng theo Kênh')}
            </h3>
            <span className="text-xs text-slate-500">{t('workspaceSettings.storage.estimate', 'Ước tính Payload & Text')}</span>
          </div>

          <div className="space-y-3.5">
            {metrics?.channelBreakdown?.map((ch) => {
              const totalEst = metrics.totalSizeBytes || 1;
              const percent = Math.min(100, Math.round((ch.estimatedSizeBytes / totalEst) * 100)) || 0;

              const channelLabels: Record<string, { name: string; color: string }> = {
                ZALO: { name: 'Zalo Official Account', color: 'bg-blue-500' },
                FACEBOOK: { name: 'Facebook Messenger', color: 'bg-indigo-600' },
                TIKTOK: { name: 'TikTok Shop / Chat', color: 'bg-slate-800' },
                MANUAL_IMPORT: { name: t('workspaceSettings.storage.manualImport', 'Nhập thủ công / CSV'), color: 'bg-emerald-500' },
              };

              const meta = channelLabels[ch.channel] || { name: ch.channel, color: 'bg-slate-400' };

              return (
                <div key={ch.channel} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800">
                      {meta.name}
                    </span>
                    <div className="flex items-center gap-2 text-slate-600">
                      <span>{ch.messageCount.toLocaleString('vi-VN')} tin</span>
                      <span>•</span>
                      <span className="font-semibold text-slate-900">{ch.estimatedSizeFormatted}</span>
                      <span className="text-[11px] text-slate-400">({percent}%)</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full ${meta.color} transition-all duration-500 rounded-full`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Phân bổ theo Độ tuổi dữ liệu */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-950 m-0">
              {t('workspaceSettings.storage.byLifecycle', 'Phân bổ theo Vòng đời Tin nhắn')}
            </h3>
            <span className="text-xs text-slate-500">{t('workspaceSettings.storage.sentTime', 'Mốc thời gian gửi')}</span>
          </div>

          <div className="space-y-3.5">
            {/* < 30 ngày */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> {t('workspaceSettings.storage.lt30', 'Dưới 30 ngày (Dữ liệu nóng / Đang tương tác)')}
                </span>
                <span className="font-semibold text-slate-900">
                  {metrics?.ageBreakdown?.lessThan30Days?.count?.toLocaleString('vi-VN') || 0} tin ({metrics?.ageBreakdown?.lessThan30Days?.estimatedSizeFormatted || '0 B'})
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{
                    width: `${Math.min(100, Math.round(((metrics?.ageBreakdown?.lessThan30Days?.estimatedSizeBytes || 0) / (metrics?.totalSizeBytes || 1)) * 100))}%`,
                  }}
                />
              </div>
            </div>

            {/* 1 - 6 tháng */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span> {t('workspaceSettings.storage.m1to6', '1 đến 6 tháng (Dữ liệu ấm / Chăm sóc)')}
                </span>
                <span className="font-semibold text-slate-900">
                  {metrics?.ageBreakdown?.oneToSixMonths?.count?.toLocaleString('vi-VN') || 0} tin ({metrics?.ageBreakdown?.oneToSixMonths?.estimatedSizeFormatted || '0 B'})
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{
                    width: `${Math.min(100, Math.round(((metrics?.ageBreakdown?.oneToSixMonths?.estimatedSizeBytes || 0) / (metrics?.totalSizeBytes || 1)) * 100))}%`,
                  }}
                />
              </div>
            </div>

            {/* 6 - 12 tháng */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span> {t('workspaceSettings.storage.m6to12', '6 đến 12 tháng (Dữ liệu lưu trữ định kỳ)')}
                </span>
                <span className="font-semibold text-slate-900">
                  {metrics?.ageBreakdown?.sixToTwelveMonths?.count?.toLocaleString('vi-VN') || 0} tin ({metrics?.ageBreakdown?.sixToTwelveMonths?.estimatedSizeFormatted || '0 B'})
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{
                    width: `${Math.min(100, Math.round(((metrics?.ageBreakdown?.sixToTwelveMonths?.estimatedSizeBytes || 0) / (metrics?.totalSizeBytes || 1)) * 100))}%`,
                  }}
                />
              </div>
            </div>

            {/* > 12 tháng */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span> {t('workspaceSettings.storage.gt12', 'Quá 12 tháng (Hết hạn / Cần dọn dẹp)')}
                </span>
                <span className="font-bold text-red-600">
                  {olderThan12mCount.toLocaleString('vi-VN')} tin ({olderThan12mSize})
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full"
                  style={{
                    width: `${Math.min(100, Math.round(((metrics?.ageBreakdown?.olderThan12Months?.estimatedSizeBytes || 0) / (metrics?.totalSizeBytes || 1)) * 100))}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Cấu hình Chính sách Tự động Dọn dẹp (Retention Policy Settings - Consistent Flat Setting Rows) */}
      <div className="pt-2 space-y-4">
        <ConfigSubSectionHeader
          title={t('workspaceSettings.storage.policyTitle', 'Chính sách Tự động Dọn dẹp & Lưu trữ (Retention Policy)')}
          badge={
            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${policy.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
              }`}>
              {policy.enabled ? t('workspaceSettings.storage.enabled', 'Đã kích hoạt') : t('workspaceSettings.storage.disabled', 'Vô hiệu hóa')}
            </span>
          }
          help={{
            title: t('workspaceSettings.storage.policyTitle', 'Chính sách Tự động Dọn dẹp & Lưu trữ'),
            description:
              'Chính sách lưu trữ quy định thời hạn lưu giữ dữ liệu và lịch trình tự động thu hồi tài nguyên để duy trì hiệu năng vận hành ổn định.',
            example:
              'Kích hoạt chính sách lưu trữ định kỳ 365 ngày. Hệ thống tự động chạy tác vụ ngầm vào lúc 02:00 sáng hàng ngày để quét và giải phóng các tin nhắn cũ hơn 365 ngày.',
            rules: [
              'Tiến trình thu hồi tài nguyên thực hiện hoàn toàn dưới nền và không gây gián đoạn hoạt động tương tác của người dùng.',
              'Các tệp đa phương tiện dung lượng lớn sẽ được ưu tiên dọn dẹp trước để tối ưu hóa không gian lưu trữ.',
              'Thời hạn lưu trữ có thể cấu hình linh hoạt từ 30 ngày đến 365 ngày tùy theo chính sách quản lý dữ liệu.',
            ],
          }}
        />

        <div className="divide-y divide-slate-200 border-t border-b border-slate-200">
          {/* Row 1: Bật tự động dọn dẹp theo lịch */}
          <div className="flex items-center justify-between py-4 gap-4">
            <div className="max-w-xl">
              <div className="text-sm font-semibold text-slate-950">
                {t('workspaceSettings.storage.enableSchedule', 'Bật tự động dọn dẹp theo lịch')}
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                {t('workspaceSettings.storage.enableScheduleDesc', 'Hệ thống tự động kích hoạt Worker quét và giải phóng các tin nhắn quá hạn vào lúc 02:00 AM hàng ngày.')}
              </div>
            </div>
            <div className="shrink-0">
              <Toggle
                checked={policy.autoCleanupEnabled}
                onChange={(checked) => setPolicy({ ...policy, autoCleanupEnabled: checked })}
                disabled={!isOwner}
                size="md"
              />
            </div>
          </div>

          {/* Row 2: Chế độ bảo tồn: Chỉ dọn Raw Payload (Standardized Toggle) */}
          <div className="flex items-center justify-between py-4 gap-4">
            <div className="max-w-xl">
              <div className="text-sm font-semibold text-slate-950">
                {t('workspaceSettings.storage.slimOnly', 'Chế độ bảo tồn: Chỉ dọn Raw Payload (Khuyên dùng)')}
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                {t('workspaceSettings.storage.slimOnlyDesc', 'Loại bỏ các đoạn JSON thô nặng nề của Zalo/Facebook, nhưng vẫn bảo tồn trọn vẹn văn bản tin nhắn và lịch sử tư vấn khách hàng.')}
              </div>
            </div>
            <div className="shrink-0">
              <Toggle
                checked={policy.slimPayloadOnly}
                onChange={(checked) => setPolicy({ ...policy, slimPayloadOnly: checked })}
                disabled={!isOwner}
                size="md"
              />
            </div>
          </div>

          {/* Row 3: Thời hạn lưu trữ tin nhắn tối đa */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-4">
            <div className="max-w-xl">
              <div className="text-sm font-semibold text-slate-950">
                {t('workspaceSettings.storage.maxRetention', 'Thời hạn lưu trữ tin nhắn tối đa')}
              </div>
              <div className="text-xs text-slate-600 mt-0.5 space-y-0.5">
                <div>• {t('workspaceSettings.storage.scanSchedule', 'Lịch quét: Hàng ngày lúc 02:00 AM (giờ Việt Nam)')}</div>
                <div>• {t('workspaceSettings.storage.lastRun', 'Lần chạy gần nhất: {time}', { time: policy.lastRunAt ? new Date(policy.lastRunAt).toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN') : t('workspaceSettings.storage.never', 'Chưa có') })}</div>
                {typeof policy.lastDeletedCount === 'number' && policy.lastDeletedCount > 0 && (
                  <div>• {t('workspaceSettings.storage.lastDeleted', 'Đã dọn dẹp đợt gần nhất: {n} tin nhắn', { n: policy.lastDeletedCount.toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN') })}</div>
                )}
              </div>
            </div>
            <div className="shrink-0">
              <SearchableSelect
                value={String(policy.retentionMonths)}
                onChange={(val) => setPolicy({ ...policy, retentionMonths: Number(val) })}
                disabled={!isOwner}
                options={[
                  { value: '3', label: t('workspaceSettings.storage.months3', '3 tháng') },
                  { value: '6', label: t('workspaceSettings.storage.months6', '6 tháng') },
                  { value: '12', label: t('workspaceSettings.storage.months12', '12 tháng (Chuẩn Khuyến nghị CRM)') },
                  { value: '24', label: t('workspaceSettings.storage.months24', '24 tháng (2 năm)') },
                  { value: '36', label: t('workspaceSettings.storage.months36', '36 tháng (3 năm)') },
                ]}
                searchable={false}
                size="md"
                className="w-full sm:w-64"
              />
            </div>
          </div>
        </div>

        {isOwner && (
          <div className="pt-6 pb-12 flex justify-end">
            <button
              type="button"
              disabled={isSavingPolicy}
              onClick={handleSavePolicy}
              className="rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer border-none shadow-2xs inline-flex flex-row items-center justify-center gap-1.5 whitespace-nowrap"
            >
              {isSavingPolicy ? (
                <RefreshCw size={14} className="animate-spin shrink-0" />
              ) : (
                <Save size={14} className="shrink-0" />
              )}
              <span>
                {isSavingPolicy
                  ? t('workspaceSettings.storage.saving', 'Đang lưu...')
                  : 'Lưu cài đặt'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Modal Dọn dẹp thủ công */}
      <PurgeConfirmModal
        isOpen={isPurgeModalOpen}
        onClose={() => setIsPurgeModalOpen(false)}
        workspaceId={workspaceId}
        onSuccess={handlePurgeSuccess}
      />
    </div>
  );
};
