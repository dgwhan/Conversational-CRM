import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, HelpCircle, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal.js';
import { ModalIcon } from '../ui/ModalIcon.js';
import { Button } from '../ui/Button.js';
import { useOptionalTranslation } from '../../i18n/index.js';
import {
  registerConfirmDialog,
  type ConfirmDialogOptions,
  type ConfirmDialogTone,
} from './confirmDialog.js';

interface PendingConfirm {
  options: ConfirmDialogOptions;
  resolve: (confirmed: boolean) => void;
  /** Đã có câu trả lời; chỉ còn chờ animation đóng xong để rời hàng đợi. */
  settled: boolean;
}

const TONE_ICON: Record<ConfirmDialogTone, { variant: 'danger' | 'warning' | 'info'; icon: React.ReactNode }> = {
  danger: { variant: 'danger', icon: <Trash2 size={18} strokeWidth={2.4} className="text-white" /> },
  warning: { variant: 'warning', icon: <AlertTriangle size={18} strokeWidth={2.4} className="text-white" /> },
  info: { variant: 'info', icon: <HelpCircle size={18} strokeWidth={2.4} className="text-white" /> },
};

/**
 * Hiển thị hộp thoại xác nhận được gọi qua `confirmDialog()`.
 * Mount một lần ở gốc ứng dụng (cạnh ToastContainer). Các yêu cầu đến dồn dập được xếp hàng.
 */
export const ConfirmDialogHost: React.FC = () => {
  const { t } = useOptionalTranslation();
  const [queue, setQueue] = useState<PendingConfirm[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const current = queue[0];

  useEffect(() => {
    registerConfirmDialog(
      (options) =>
        new Promise<boolean>((resolve) => {
          setQueue((prev) => [...prev, { options, resolve, settled: false }]);
        }),
    );
    return () => registerConfirmDialog(null);
  }, []);

  // Mở hộp thoại khi đầu hàng đợi là một yêu cầu chưa được trả lời
  useEffect(() => {
    if (current && !current.settled && !isOpen) setIsOpen(true);
  }, [current, isOpen]);

  const settle = useCallback(
    (confirmed: boolean) => {
      if (!current || current.settled) return;
      current.resolve(confirmed);
      setQueue((prev) => (prev[0] === current ? [{ ...current, settled: true }, ...prev.slice(1)] : prev));
      setIsOpen(false);
    },
    [current],
  );

  // Sau khi animation đóng kết thúc mới bỏ yêu cầu đã trả lời và mở yêu cầu kế tiếp
  const handleExited = useCallback(() => {
    setQueue((prev) => (prev[0]?.settled ? prev.slice(1) : prev));
  }, []);

  const tone = current?.options.tone ?? 'danger';
  const { variant, icon } = TONE_ICON[tone];

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => settle(false)}
      onExited={handleExited}
      size="sm"
      showCloseButton={false}
      layerClassName="z-[10050]"
    >
      {current && (
        <div role="alertdialog" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-message">
          <div className="flex items-start gap-3.5">
            <ModalIcon variant={variant} size="sm" icon={icon} />
            <div className="min-w-0 flex-1 pt-0.5">
              <h2
                id="confirm-dialog-title"
                className="m-0 text-base font-bold tracking-tight text-slate-900 break-words"
              >
                {current.options.title}
              </h2>
              {current.options.message && (
                <div
                  id="confirm-dialog-message"
                  className="mt-1.5 text-sm leading-relaxed text-slate-600 break-words"
                >
                  {current.options.message}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {/* Focus mặc định vào nút Hủy để Enter không vô tình xác nhận hành động phá hủy */}
            <Button
              autoFocus
              type="button"
              variant="secondary"
              size="sm"
              className="w-full justify-center px-4 py-2 text-xs sm:w-auto"
              onClick={() => settle(false)}
            >
              {current.options.cancelText ?? t('common.cancel', 'Hủy bỏ')}
            </Button>
            <Button
              type="button"
              variant={tone === 'danger' ? 'danger' : 'primary'}
              size="sm"
              className="w-full justify-center px-5 py-2 text-xs sm:w-auto"
              onClick={() => settle(true)}
            >
              {current.options.confirmText ?? t('common.confirm', 'Xác nhận')}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
