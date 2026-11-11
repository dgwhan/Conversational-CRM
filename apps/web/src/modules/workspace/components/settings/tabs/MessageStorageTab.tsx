import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  HardDrive,
  Trash2,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Calendar,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Button, Badge } from '../../../../../components/ui/index.js';
import { notify } from '../../../../../components/feedback/toastEmitter.js';
import { apiClient } from '../../../../../lib/api-client/index.js';
import type {
  MessageStorageMetrics,
  StorageRetentionPolicy,
  PurgeMessagesResponse,
} from '../../../../../lib/api-client/messaging-storage.types.js';
import { PurgeConfirmModal } from '../modals/PurgeConfirmModal.js';

interface MessageStorageTabProps {
  workspaceId?: string;
  isOwner?: boolean;
}

export const MessageStorageTab: React.FC<MessageStorageTabProps> = ({
  workspaceId,
  isOwner = true,
}) => {
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
        err.message || 'Không thể lấy số liệu dung lượng tin nhắn.',
        'Lỗi tải dữ liệu lưu trữ',
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
        'Vui lòng chọn không gian làm việc để lưu cấu hình.',
        'Thiếu thông tin',
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
        'Chính sách lưu trữ tin nhắn đã được lưu vào hệ thống.',
        'Cập nhật thành công',
      );
    } catch (err: any) {
      notify.error(
        err.message || 'Không thể lưu chính sách lưu trữ.',
        'Cập nhật thất bại',
      );
    } finally {
      setIsSavingPolicy(false);
    }
  };

  const handleTriggerRetentionNow = async () => {
    if (!confirm('Bạn có chắc chắn muốn kích hoạt quy trình tự động dọn dẹp tin nhắn quá hạn 12 tháng ngay bây giờ không?')) {
      return;
    }

    setIsTriggeringRetention(true);
    try {
      const res = await apiClient.triggerMessageRetentionNow(workspaceId);
      notify.success(
        `Đã dọn dẹp ${res.deletedMessagesCount + res.slimmedMessagesCount} tin nhắn, giải phóng ${res.freedSizeFormatted}.`,
        'Dọn dẹp hoàn tất',
      );
      await fetchMetrics(true);
    } catch (err: any) {
      notify.error(
        err.message || 'Không thể chạy dọn dẹp tự động.',
        'Lỗi dọn dẹp định kỳ',
      );
    } finally {
      setIsTriggeringRetention(false);
    }
  };

  const handlePurgeSuccess = (res: PurgeMessagesResponse) => {
    notify.success(
      `Đã xử lý ${res.deletedMessagesCount + res.slimmedMessagesCount} tin nhắn (${res.freedSizeFormatted} giải phóng trong ${res.durationMs}ms).`,
      'Dọn dẹp thành công',
    );
    fetchMetrics(true);
  };

  if (isLoading && !metrics) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-3" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Đang đo lường mức dung lượng tin nhắn từ PostgreSQL...</p>
      </div>
    );
  }

  const olderThan12mCount = metrics?.ageBreakdown?.olderThan12Months?.count || 0;
  const olderThan12mSize = metrics?.ageBreakdown?.olderThan12Months?.estimatedSizeFormatted || '0 B';

  return (
    <div className="space-y-6">
      {/* 1. Header & Điều khiển thao tác nhanh */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Quản lý Dung lượng & Lưu trữ Tin nhắn
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Đo lường dung lượng lưu trữ PostgreSQL, chống phình dữ liệu và tự động dọn dẹp tin nhắn cũ sau 12 tháng.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <Button
            variant="secondary"
            onClick={() => fetchMetrics(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 text-xs py-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Làm mới số liệu</span>
          </Button>

          {isOwner && (
            <>
              <Button
                variant="secondary"
                onClick={handleTriggerRetentionNow}
                disabled={isTriggeringRetention}
                className="flex items-center gap-1.5 text-xs py-2 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Chạy dọn dẹp 12 tháng ngay</span>
              </Button>

              <Button
                variant="danger"
                onClick={() => setIsPurgeModalOpen(true)}
                className="flex items-center gap-1.5 text-xs py-2 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Dọn dẹp thủ công</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 2. Hàng Thống kê (Stat Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng dung lượng */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tổng dung lượng</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            {metrics?.totalSizeFormatted || '0 B'}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 space-x-2">
            <span>TOAST: {apiClient.messageStorageApi ? metrics?.toastSizeBytes ? `${(metrics.toastSizeBytes / (1024 * 1024)).toFixed(1)} MB` : '0 MB' : '0 MB'}</span>
            <span>•</span>
            <span>Index: {metrics?.indexSizeBytes ? `${(metrics.indexSizeBytes / (1024 * 1024)).toFixed(1)} MB` : '0 MB'}</span>
          </div>
        </div>

        {/* Card 2: Tổng số tin nhắn */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tổng số tin nhắn</span>
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            {metrics?.totalMessages?.toLocaleString('vi-VN') || 0}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Trung bình: ~{metrics?.averageMessageSizeBytes || 0} bytes / tin nhắn
          </div>
        </div>

        {/* Card 3: Dữ liệu quá hạn (> 12 tháng) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tin nhắn quá hạn ({'>'} 12 tháng)</span>
            <div className={`p-1.5 rounded-lg ${olderThan12mCount > 0 ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600' : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600'}`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1 flex items-baseline gap-2">
            <span>{olderThan12mCount.toLocaleString('vi-VN')}</span>
            <span className="text-xs font-normal text-slate-500">({olderThan12mSize})</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            {olderThan12mCount > 0 ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Sẵn sàng dọn dẹp
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Database tối ưu, không có tin quá hạn
              </span>
            )}
          </div>
        </div>

        {/* Card 4: Tự động dọn dẹp (Retention Status) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tự động dọn dẹp</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{policy.autoCleanupEnabled ? 'Đang hoạt động' : 'Tạm dừng'}</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Hàng ngày lúc 02:00 AM • Sau {policy.retentionMonths || 12} tháng
          </div>
        </div>
      </div>

      {/* 3. Phân bổ dữ liệu (Theo Kênh & Theo Độ tuổi) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Phân bổ theo Kênh giao tiếp */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-500" />
              <span>Phân bổ Dung lượng theo Kênh</span>
            </h3>
            <span className="text-xs text-slate-500">Ước tính Payload & Text</span>
          </div>

          <div className="space-y-3.5">
            {metrics?.channelBreakdown?.map((ch) => {
              const totalEst = metrics.totalSizeBytes || 1;
              const percent = Math.min(100, Math.round((ch.estimatedSizeBytes / totalEst) * 100)) || 0;

              const channelLabels: Record<string, { name: string; color: string; badge: string }> = {
                ZALO: { name: 'Zalo Official Account', color: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' },
                FACEBOOK: { name: 'Facebook Messenger', color: 'bg-indigo-600', badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300' },
                TIKTOK: { name: 'TikTok Shop / Chat', color: 'bg-slate-800', badge: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200' },
                MANUAL_IMPORT: { name: 'Nhập thủ công / CSV', color: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' },
              };

              const meta = channelLabels[ch.channel] || { name: ch.channel, color: 'bg-slate-400', badge: 'bg-slate-100 text-slate-700' };

              return (
                <div key={ch.channel} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {meta.name}
                    </span>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <span>{ch.messageCount.toLocaleString('vi-VN')} tin</span>
                      <span>•</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{ch.estimatedSizeFormatted}</span>
                      <span className="text-[11px] text-slate-400">({percent}%)</span>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
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
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-500" />
              <span>Phân bổ theo Vòng đời Tin nhắn</span>
            </h3>
            <span className="text-xs text-slate-500">Mốc thời gian gửi</span>
          </div>

          <div className="space-y-3.5">
            {/* < 30 ngày */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Dưới 30 ngày (Dữ liệu nóng / Đang tương tác)
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {metrics?.ageBreakdown?.lessThan30Days?.count?.toLocaleString('vi-VN') || 0} tin ({metrics?.ageBreakdown?.lessThan30Days?.estimatedSizeFormatted || '0 B'})
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
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
                <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span> 1 đến 6 tháng (Dữ liệu ấm / Chăm sóc)
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {metrics?.ageBreakdown?.oneToSixMonths?.count?.toLocaleString('vi-VN') || 0} tin ({metrics?.ageBreakdown?.oneToSixMonths?.estimatedSizeFormatted || '0 B'})
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
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
                <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span> 6 đến 12 tháng (Dữ liệu lưu trữ định kỳ)
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {metrics?.ageBreakdown?.sixToTwelveMonths?.count?.toLocaleString('vi-VN') || 0} tin ({metrics?.ageBreakdown?.sixToTwelveMonths?.estimatedSizeFormatted || '0 B'})
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
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
                <span className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span> Quá 12 tháng (Hết hạn / Cần dọn dẹp)
                </span>
                <span className="font-bold text-red-600 dark:text-red-400">
                  {olderThan12mCount.toLocaleString('vi-VN')} tin ({olderThan12mSize})
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
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

      {/* 4. Cấu hình Chính sách Tự động Dọn dẹp (Retention Policy Settings) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              <span>Chính sách Tự động Dọn dẹp & Lưu trữ (Retention Policy)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Quy tắc hệ thống chạy định kỳ hàng ngày giúp cơ sở dữ liệu luôn gọn gàng và đạt hiệu năng cao nhất.
            </p>
          </div>
          <Badge variant={policy.enabled ? 'success' : 'secondary'}>
            {policy.enabled ? 'Đã kích hoạt' : 'Vô hiệu hóa'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Toggle Bật/tắt */}
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
              <div>
                <label className="text-sm font-semibold text-slate-900 dark:text-white block">
                  Bật tự động dọn dẹp theo lịch
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Hệ thống tự động kích hoạt Worker quét và giải phóng các tin nhắn quá hạn vào lúc 02:00 AM hàng ngày.
                </p>
              </div>
              <input
                type="checkbox"
                checked={policy.autoCleanupEnabled}
                onChange={(e) => setPolicy({ ...policy, autoCleanupEnabled: e.target.checked })}
                disabled={!isOwner}
                className="mt-1 w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            {/* Thời gian lưu trữ */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-500" />
                <span>Thời hạn lưu trữ tin nhắn tối đa</span>
              </label>
              <select
                value={policy.retentionMonths}
                onChange={(e) => setPolicy({ ...policy, retentionMonths: Number(e.target.value) })}
                disabled={!isOwner}
                className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value={3}>3 tháng</option>
                <option value={6}>6 tháng</option>
                <option value={12}>12 tháng (Chuẩn Khuyến nghị CRM)</option>
                <option value={24}>24 tháng (2 năm)</option>
                <option value={36}>36 tháng (3 năm)</option>
              </select>
            </div>
          </div>

          {/* Tùy chọn dọn dẹp nhẹ */}
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
              <div>
                <label className="text-sm font-semibold text-slate-900 dark:text-white block">
                  Chế độ bảo tồn: Chỉ dọn Raw Payload (Khuyên dùng)
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Loại bỏ các đoạn JSON thô nặng nề của Zalo/Facebook, nhưng vẫn bảo tồn trọn vẹn văn bản tin nhắn
                  và lịch sử tư vấn khách hàng.
                </p>
              </div>
              <input
                type="checkbox"
                checked={policy.slimPayloadOnly}
                onChange={(e) => setPolicy({ ...policy, slimPayloadOnly: e.target.checked })}
                disabled={!isOwner}
                className="mt-1 w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            {/* Thông tin lần chạy gần nhất */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-800 dark:text-slate-200 block">Trạng thái vận hành:</span>
              <p>• Lịch quét: Hàng ngày lúc 02:00 AM (giờ Việt Nam)</p>
              <p>• Lần chạy gần nhất: {policy.lastRunAt ? new Date(policy.lastRunAt).toLocaleString('vi-VN') : 'Chưa có'}</p>
              {typeof policy.lastDeletedCount === 'number' && policy.lastDeletedCount > 0 && (
                <p>• Đã dọn dẹp đợt gần nhất: {policy.lastDeletedCount.toLocaleString('vi-VN')} tin nhắn</p>
              )}
            </div>
          </div>
        </div>

        {isOwner && (
          <div className="pt-2 flex justify-end">
            <Button
              variant="primary"
              onClick={handleSavePolicy}
              disabled={isSavingPolicy}
              className="flex items-center gap-2 py-2 px-5 shadow-sm"
            >
              {isSavingPolicy ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Lưu Chính Sách Lưu Trữ</span>
                </>
              )}
            </Button>
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
