import type { ReactNode } from 'react';

export type ConfirmDialogTone = 'danger' | 'warning' | 'info';

export interface ConfirmDialogOptions {
  /** Tiêu đề ngắn dạng câu hỏi, ví dụ "Ngắt kết nối kênh?" */
  title: ReactNode;
  /** Mô tả hệ quả của hành động. */
  message?: ReactNode;
  /** Nhãn nút xác nhận (mặc định: "Xác nhận"). */
  confirmText?: string;
  /** Nhãn nút hủy (mặc định: "Hủy bỏ"). */
  cancelText?: string;
  /** danger: hành động phá hủy (nút đỏ); warning: cần cân nhắc; info: thông thường. */
  tone?: ConfirmDialogTone;
}

type ConfirmHandler = (options: ConfirmDialogOptions) => Promise<boolean>;

let handler: ConfirmHandler | null = null;

/** ConfirmDialogHost gọi hàm này khi mount/unmount. */
export function registerConfirmDialog(fn: ConfirmHandler | null): void {
  handler = fn;
}

const toPlainText = (node: ReactNode): string =>
  typeof node === 'string' || typeof node === 'number' ? String(node) : '';

/**
 * Hộp thoại xác nhận thay cho window.confirm.
 * Dùng: `if (!(await confirmDialog({ title, message, tone: 'danger' }))) return;`
 * Trả về true khi người dùng bấm xác nhận; false khi hủy, bấm ra ngoài hoặc nhấn Esc.
 */
export function confirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
  if (handler) return handler(options);
  // Dự phòng khi host chưa được mount (ví dụ trong test): giữ hành vi cũ.
  const text = [toPlainText(options.title), toPlainText(options.message)].filter(Boolean).join('\n\n');
  return Promise.resolve(typeof window !== 'undefined' ? window.confirm(text) : false);
}
