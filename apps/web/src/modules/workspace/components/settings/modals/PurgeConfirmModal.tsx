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
import { Modal, Button } from '../../../../../components/ui/index.js';
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
  const [retentionMonths, setRetentionMonths] = useState<number>(12);
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
    >
      <div className="space-y-5 py-2">
        {/* Banner Lưu ý */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900 dark:text-amber-200 space-y-1">
            <p className="font-semibold">{t('workspaceSettings.purge.adminNote', 'Lưu ý quản trị hệ thống')}</p>
            <p className="text-xs leading-relaxed text-amber-800/90 dark:text-amber-300/80">
              {t('workspaceSettings.purge.adminNoteDesc', 'Thao tác này sẽ xử lý các tin nhắn đã quá hạn theo chính sách để giải phóng bộ nhớ và chống phình Database PostgreSQL. Dữ liệu được xử lý ngầm theo từng mẻ nhỏ (Batch 1,000 dòng) để không làm gián đoạn các luồng tư vấn khách hàng.')}
            </p>
          </div>
        </div>

        {/* Tiêu chí lọc */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" /> {t('workspaceSettings.purge.cutoffLabel', 'Mốc thời gian lưu trữ')}
            </label>
            <select
              disabled={isPurging}
              value={retentionMonths}
              onChange={(e) => setRetentionMonths(Number(e.target.value))}
              className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
            >
              <option value={3}>{t('workspaceSettings.purge.older3', 'Cũ hơn 3 tháng')}</option>
              <option value={6}>{t('workspaceSettings.purge.older6', 'Cũ hơn 6 tháng')}</option>
              <option value={12}>{t('workspaceSettings.purge.older12', 'Cũ hơn 12 tháng (Khuyến nghị chuẩn)')}</option>
              <option value={24}>{t('workspaceSettings.purge.older24', 'Cũ hơn 24 tháng')}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-indigo-500" /> {t('workspaceSettings.purge.channelLabel', 'Kênh giao tiếp')}
            </label>
            <select
              disabled={isPurging}
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">{t('workspaceSettings.purge.allChannels', 'Tất cả các kênh')}</option>
              <option value="ZALO">Zalo OA</option>
              <option value="FACEBOOK">Facebook Messenger</option>
              <option value="TIKTOK">TikTok</option>
              <option value="MANUAL_IMPORT">{t('workspaceSettings.storage.manualImport', 'Nhập thủ công / CSV')}</option>
            </select>
          </div>
        </div>

        {/* Chế độ dọn dẹp */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t('workspaceSettings.purge.methodLabel', 'Phương thức dọn dẹp dung lượng')}
          </label>

          <div
            onClick={() => !isPurging && setSlimPayloadOnly(true)}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
              slimPayloadOnly
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-500 ring-2 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <input
              type="radio"
              checked={slimPayloadOnly}
              onChange={() => setSlimPayloadOnly(true)}
              className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
              disabled={isPurging}
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t('workspaceSettings.purge.slimTitle', 'Dọn dẹp Raw Payload thô (Khuyên dùng)')}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold tracking-wide rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                  {t('workspaceSettings.purge.slimBadge', 'TIẾT KIỆM 80% DUNG LƯỢNG')}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {t('workspaceSettings.purge.slimDesc', 'Giữ nguyên văn bản tin nhắn chat và lịch sử tư vấn khách hàng. Chỉ loại bỏ trường webhook thô (raw JSON) chiếm phần lớn dung lượng bảng TOAST trong cơ sở dữ liệu.')}
              </p>
            </div>
          </div>

          <div
            onClick={() => !isPurging && setSlimPayloadOnly(false)}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
              !slimPayloadOnly
                ? 'border-red-600 bg-red-50/40 dark:bg-red-950/20 dark:border-red-500 ring-2 ring-red-500/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <input
              type="radio"
              checked={!slimPayloadOnly}
              onChange={() => setSlimPayloadOnly(false)}
              className="mt-0.5 text-red-600 focus:ring-red-500"
              disabled={isPurging}
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t('workspaceSettings.purge.hardTitle', 'Xóa hoàn toàn tin nhắn quá hạn (Hard Delete)')}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold tracking-wide rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
                  {t('workspaceSettings.purge.hardBadge', 'KHÔNG THỂ KHÔI PHỤC')}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {t('workspaceSettings.purge.hardDesc', 'Xóa vĩnh viễn toàn bộ các bản ghi tin nhắn và tệp đính kèm cũ hơn mốc đã chọn.')}
              </p>
            </div>
          </div>
        </div>

        {/* Tùy chọn nâng cao */}
        <div className="pt-1 flex flex-col gap-2">
          <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyResolved}
              onChange={(e) => setOnlyResolved(e.target.checked)}
              disabled={isPurging}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span>{t('workspaceSettings.purge.resolvedOnly', 'Chỉ áp dụng cho các cuộc hội thoại đã đóng/giải quyết xong (RESOLVED)')}</span>
          </label>
          <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={cleanEmptyConversations}
              onChange={(e) => setCleanEmptyConversations(e.target.checked)}
              disabled={isPurging}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span>{t('workspaceSettings.purge.orphans', 'Dọn dẹp các hội thoại mồ côi (không còn tin nhắn nào) sau khi dọn')}</span>
          </label>
        </div>

        {/* Kết quả Dry-run Preview */}
        <div className="bg-slate-900 text-slate-100 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-emerald-400" /> {t('workspaceSettings.purge.dryRun', 'Kết quả ước tính trước (Dry Run)')}
            </span>
            {isEstimating ? (
              <span className="text-xs text-indigo-300 flex items-center gap-1 animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> {t('workspaceSettings.purge.calculating', 'Đang tính toán...')}
              </span>
            ) : (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {t('workspaceSettings.purge.exactMatch', 'Khớp chính xác')}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
              <span className="text-[11px] text-slate-400 block mb-0.5">{t('workspaceSettings.purge.affected', 'Số tin nhắn ảnh hưởng')}</span>
              <span className="text-lg font-bold text-white">
                {estimate?.matchedMessagesCount?.toLocaleString('vi-VN') || 0}
              </span>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
              <span className="text-[11px] text-slate-400 block mb-0.5">{t('workspaceSettings.purge.freed', 'Dung lượng giải phóng')}</span>
              <span className="text-lg font-bold text-emerald-400">
                {estimate?.estimatedFreedFormatted || '0 B'}
              </span>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 col-span-2 sm:col-span-1">
              <span className="text-[11px] text-slate-400 block mb-0.5">{t('workspaceSettings.purge.cutoffDate', 'Mốc thời gian cắt')}</span>
              <span className="text-xs font-semibold text-slate-300">
                {estimate?.cutoffDate ? new Date(estimate.cutoffDate).toLocaleDateString('vi-VN') : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Xác thực an toàn nếu chọn Hard Delete */}
        {!slimPayloadOnly && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-3.5 space-y-2">
            <label className="block text-xs font-bold text-red-900 dark:text-red-300">
              {t('workspaceSettings.purge.confirmLabel', 'Xác nhận xóa vĩnh viễn dữ liệu (Gõ chữ "XOA" vào ô dưới đây)')}
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="XOA"
              disabled={isPurging}
              className="w-full text-sm rounded-lg border border-red-300 dark:border-red-700 bg-white dark:bg-slate-900 px-3 py-2 text-red-900 dark:text-red-100 font-mono focus:ring-2 focus:ring-red-500 uppercase"
            />
          </div>
        )}

        {/* Thông báo lỗi nếu có */}
        {errorMsg && (
          <div className="p-3 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-xs rounded-lg">
            {errorMsg}
          </div>
        )}

        {/* Nút hành động */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isPurging}
          >
            {t('workspaceSettings.purge.cancel', 'Hủy bỏ')}
          </Button>
          <Button
            variant={slimPayloadOnly ? 'primary' : 'danger'}
            onClick={handleExecutePurge}
            disabled={
              isPurging ||
              isEstimating ||
              (estimate?.matchedMessagesCount === 0) ||
              (!slimPayloadOnly && confirmText.trim().toUpperCase() !== 'XOA')
            }
            className="flex items-center gap-2"
          >
            {isPurging ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{t('workspaceSettings.purge.processing', 'Đang xử lý dọn dẹp theo batch...')}</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
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
