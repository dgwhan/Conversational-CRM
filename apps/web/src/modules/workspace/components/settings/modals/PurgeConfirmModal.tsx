import React, { useState, useEffect } from 'react';
import {
  Trash2,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  HardDrive,
  Calendar,
  Filter,
} from 'lucide-react';
import { Modal, Button, Select } from '../../../../../components/ui/index.js';
import { apiClient } from '../../../../../lib/api-client/index.js';
import type {
  EstimatePurgeResponse,
  PurgeMessagesResponse,
} from '../../../../../lib/api-client/messaging-storage.types.js';

import { useTranslation } from '../../../../../i18n/index.js';
import { translate } from '../../../../../i18n/translate.js';
interface PurgeConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId?: string;
  onSuccess: (result: PurgeMessagesResponse) => void;
}

export const PurgeConfirmModal: React.FC<PurgeConfirmModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [retentionMonths, setRetentionMonths] = useState<number>(0);
  const [slimPayloadOnly, setSlimPayloadOnly] = useState<boolean>(true);
  const [channel, setChannel] = useState<string>('ALL');
  const [onlyResolved, setOnlyResolved] = useState<boolean>(false);
  const [cleanEmptyConversations, setCleanEmptyConversations] = useState<boolean>(true);

  const [isEstimating, setIsEstimating] = useState<boolean>(false);
  const [estimate, setEstimate] = useState<EstimatePurgeResponse | null>(null);

  const [isPurging, setIsPurging] = useState<boolean>(false);
  const [confirmText, setConfirmText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch estimate whenever filter criteria change
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchEstimate = async () => {
      setIsEstimating(true);
      setErrorMsg(null);
      try {
        const res = await apiClient.estimateMessageStoragePurge({
          workspaceId,
          retentionMonths,
          slimPayloadOnly,
          channel: channel === 'ALL' ? undefined : (channel as any),
          onlyResolvedConversations: onlyResolved,
        });
        if (isMounted) {
          setEstimate(res);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMsg(err.message || translate('workspaceSettings.purge.estimateError', 'Không thể tính toán ước tính dung lượng'));
        }
      } finally {
        if (isMounted) setIsEstimating(false);
      }
    };

    fetchEstimate();

    return () => {
      isMounted = false;
    };
  }, [isOpen, retentionMonths, slimPayloadOnly, channel, onlyResolved, workspaceId]);

  const handleExecutePurge = async () => {
    if (!slimPayloadOnly && confirmText.trim().toUpperCase() !== 'XOA') {
      setErrorMsg(translate('workspaceSettings.purge.typeXoa', 'Vui lòng nhập chữ "XOA" để xác nhận xóa toàn bộ tin nhắn.'));
      return;
    }

    setIsPurging(true);
    setErrorMsg(null);
    try {
      const res = await apiClient.purgeStoredMessages({
        workspaceId,
        retentionMonths,
        slimPayloadOnly,
        channel: channel === 'ALL' ? undefined : (channel as any),
        onlyResolvedConversations: onlyResolved,
        cleanEmptyConversations,
      });
      onSuccess(res);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || translate('workspaceSettings.purge.purgeError', 'Có lỗi xảy ra trong quá trình dọn dẹp tin nhắn'));
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isPurging ? () => {} : onClose}
      title={t('workspaceSettings.purge.title', 'Dọn Dẹp Lưu Trữ Tin Nhắn Cũ')}
      size="lg"
      variant="flat"
      showCloseButton={!isPurging}
    >
      <div className="space-y-4 py-1 text-slate-800">
        {/* Banner Lưu ý */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 space-y-1">
            <p className="font-semibold">{t('workspaceSettings.purge.adminNote', 'Lưu ý quản trị hệ thống')}</p>
            <p className="leading-relaxed text-amber-800">
              {t('workspaceSettings.purge.adminNoteDesc', 'Thao tác này sẽ xử lý các tin nhắn theo tiêu chí đã chọn để giải phóng bộ nhớ và chống phình Database. Dữ liệu được xử lý ngầm theo từng mẻ nhỏ (Batch 1,000 dòng) an toàn.')}
            </p>
          </div>
        </div>

        {/* Tiêu chí lọc */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" /> {t('workspaceSettings.purge.cutoffLabel', 'Mốc thời gian lưu trữ')}
            </label>
            <Select
              disabled={isPurging}
              value={String(retentionMonths)}
              onChange={(e) => setRetentionMonths(Number(e.target.value))}
              options={[
                { value: '0', label: 'Tất cả tin nhắn (Bao gồm dữ liệu hiện tại)' },
                { value: '1', label: 'Cũ hơn 1 tháng' },
                { value: '3', label: t('workspaceSettings.purge.older3', 'Cũ hơn 3 tháng') },
                { value: '6', label: t('workspaceSettings.purge.older6', 'Cũ hơn 6 tháng') },
                { value: '12', label: t('workspaceSettings.purge.older12', 'Cũ hơn 12 tháng (Khuyến nghị chuẩn)') },
                { value: '24', label: t('workspaceSettings.purge.older24', 'Cũ hơn 24 tháng') },
              ]}
              size="sm"
              fullWidth
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-blue-600" /> {t('workspaceSettings.purge.channelLabel', 'Kênh giao tiếp')}
            </label>
            <Select
              disabled={isPurging}
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              options={[
                { value: 'ALL', label: t('workspaceSettings.purge.allChannels', 'Tất cả các kênh') },
                { value: 'ZALO', label: 'Zalo OA' },
                { value: 'FACEBOOK', label: 'Facebook Messenger' },
                { value: 'TIKTOK', label: 'TikTok' },
                { value: 'MANUAL_IMPORT', label: t('workspaceSettings.storage.manualImport', 'Nhập thủ công / CSV') },
              ]}
              size="sm"
              fullWidth
            />
          </div>
        </div>

        {/* Chế độ dọn dẹp */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700">
            {t('workspaceSettings.purge.methodLabel', 'Phương thức dọn dẹp dung lượng')}
          </label>

          <div
            onClick={() => !isPurging && setSlimPayloadOnly(true)}
            className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
              slimPayloadOnly
                ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-500'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <input
              type="radio"
              checked={slimPayloadOnly}
              onChange={() => setSlimPayloadOnly(true)}
              className="mt-0.5 text-blue-600 focus:ring-blue-500 cursor-pointer"
              disabled={isPurging}
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">
                  {t('workspaceSettings.purge.slimTitle', 'Dọn dẹp Raw Payload thô (Khuyên dùng)')}
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800">
                  {t('workspaceSettings.purge.slimBadge', 'TIẾT KIỆM 80% DUNG LƯỢNG')}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t('workspaceSettings.purge.slimDesc', 'Giữ nguyên văn bản tin nhắn chat và lịch sử tư vấn khách hàng. Chỉ loại bỏ trường webhook thô (raw JSON) chiếm phần lớn dung lượng bảng TOAST trong cơ sở dữ liệu.')}
              </p>
            </div>
          </div>

          <div
            onClick={() => !isPurging && setSlimPayloadOnly(false)}
            className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
              !slimPayloadOnly
                ? 'border-red-600 bg-red-50/50 ring-1 ring-red-500'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <input
              type="radio"
              checked={!slimPayloadOnly}
              onChange={() => setSlimPayloadOnly(false)}
              className="mt-0.5 text-red-600 focus:ring-red-500 cursor-pointer"
              disabled={isPurging}
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">
                  {t('workspaceSettings.purge.hardTitle', 'Xóa hoàn toàn tin nhắn quá hạn (Hard Delete)')}
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-100 text-red-800">
                  {t('workspaceSettings.purge.hardBadge', 'KHÔNG THỂ KHÔI PHỤC')}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t('workspaceSettings.purge.hardDesc', 'Xóa vĩnh viễn toàn bộ các bản ghi tin nhắn và tệp đính kèm cũ hơn mốc đã chọn.')}
              </p>
            </div>
          </div>
        </div>

        {/* Tùy chọn nâng cao */}
        <div className="pt-0.5 flex flex-col gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyResolved}
              onChange={(e) => setOnlyResolved(e.target.checked)}
              disabled={isPurging}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>{t('workspaceSettings.purge.resolvedOnly', 'Chỉ áp dụng cho các cuộc hội thoại đã đóng/giải quyết xong (RESOLVED)')}</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={cleanEmptyConversations}
              onChange={(e) => setCleanEmptyConversations(e.target.checked)}
              disabled={isPurging}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>{t('workspaceSettings.purge.orphans', 'Dọn dẹp các hội thoại mồ côi (không còn tin nhắn nào) sau khi dọn')}</span>
          </label>
        </div>

        {/* Kết quả Dry-run Preview */}
        <div className="bg-slate-900 text-slate-100 rounded-lg p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" /> {t('workspaceSettings.purge.dryRun', 'Kết quả ước tính trước (Dry Run)')}
            </span>
            {isEstimating ? (
              <span className="text-xs text-blue-300 flex items-center gap-1 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" /> {t('workspaceSettings.purge.calculating', 'Đang tính toán...')}
              </span>
            ) : (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {t('workspaceSettings.purge.exactMatch', 'Khớp chính xác')}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="bg-slate-800 p-2.5 rounded border border-slate-700">
              <span className="text-[10px] text-slate-400 block mb-0.5">{t('workspaceSettings.purge.affected', 'Số tin nhắn ảnh hưởng')}</span>
              <span className="text-base font-bold text-white">
                {estimate?.matchedMessagesCount?.toLocaleString('vi-VN') || 0}
              </span>
            </div>

            <div className="bg-slate-800 p-2.5 rounded border border-slate-700">
              <span className="text-[10px] text-slate-400 block mb-0.5">{t('workspaceSettings.purge.freed', 'Dung lượng giải phóng')}</span>
              <span className="text-base font-bold text-emerald-400">
                {estimate?.estimatedFreedFormatted || '0 B'}
              </span>
            </div>

            <div className="bg-slate-800 p-2.5 rounded border border-slate-700 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-400 block mb-0.5">{t('workspaceSettings.purge.cutoffDate', 'Mốc thời gian cắt')}</span>
              <span className="text-xs font-semibold text-slate-200">
                {retentionMonths === 0
                  ? 'Hiện tại (toàn bộ)'
                  : estimate?.cutoffDate
                  ? new Date(estimate.cutoffDate).toLocaleDateString('vi-VN')
                  : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Xác thực an toàn nếu chọn Hard Delete */}
        {!slimPayloadOnly && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1.5">
            <label className="block text-xs font-bold text-red-900">
              {t('workspaceSettings.purge.confirmLabel', 'Xác nhận xóa vĩnh viễn dữ liệu (Gõ chữ "XOA" vào ô dưới đây)')}
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="XOA"
              disabled={isPurging}
              className="w-full text-xs rounded border border-red-300 bg-white px-2.5 py-1.5 text-red-900 font-mono focus:outline-none focus:ring-1 focus:ring-red-500 uppercase"
            />
          </div>
        )}

        {/* Thông báo lỗi nếu có */}
        {errorMsg && (
          <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
            {errorMsg}
          </div>
        )}

        {/* Nút hành động */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isPurging}
          >
            {t('workspaceSettings.purge.cancel', 'Hủy bỏ')}
          </Button>
          <Button
            variant={slimPayloadOnly ? 'primary' : 'danger'}
            size="sm"
            onClick={handleExecutePurge}
            disabled={
              isPurging ||
              isEstimating ||
              (estimate?.matchedMessagesCount === 0) ||
              (!slimPayloadOnly && confirmText.trim().toUpperCase() !== 'XOA')
            }
            className="flex items-center gap-1.5"
          >
            {isPurging ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{t('workspaceSettings.purge.processing', 'Đang xử lý dọn dẹp theo batch...')}</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  {slimPayloadOnly ? t('workspaceSettings.purge.runSlim', 'Thực hiện dọn dẹp Payload') : t('workspaceSettings.purge.runHard', 'Xác nhận xóa tin nhắn')}
                </span>
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
