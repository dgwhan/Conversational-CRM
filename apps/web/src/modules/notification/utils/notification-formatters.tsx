import {
  AlertTriangle,
  AlertCircle,
  Info,
  ShieldAlert,
} from 'lucide-react';
import type { NotificationSeverity } from '../../../lib/api-client/index.js';
import type { SeverityBadgeConfig } from '../types/notification.types.js';

/**
 * Định dạng thời gian tương đối đa ngôn ngữ (Vừa xong, X phút trước, Hôm qua...)
 */
export function getRelativeTimeString(
  dateStr: string,
  locale: string,
  t: (k: string, fb?: string) => string
): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 1) return t('common.justNow', 'Vừa xong');
    if (minutes < 60) return `${minutes} ${t('common.minutesAgo', 'phút trước')}`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ${t('common.hoursAgo', 'giờ trước')}`;
    const days = Math.floor(hours / 24);
    if (days === 1) return t('common.yesterday', 'Hôm qua');
    if (days < 30) return `${days} ${t('common.daysAgo', 'ngày trước')}`;
    return new Date(dateStr).toLocaleDateString(locale === 'en' ? 'en-US' : 'vi-VN');
  } catch {
    return t('common.justNow', 'Vừa xong');
  }
}

/**
 * Trả về cấu hình hiển thị Badge & Màu sắc theo cấp độ nghiêm trọng của thông báo
 */
export function getSeverityBadge(
  severity: NotificationSeverity,
  locale: string,
  t: (k: string, fb?: string) => string
): SeverityBadgeConfig {
  switch (severity) {
    case 'CRITICAL':
      return {
        icon: <ShieldAlert size={16} className="text-red-500" />,
        bg: 'bg-red-50/50 border-l-2 border-l-red-500',
        badgeClass: 'bg-red-100 text-red-700 border border-red-200',
        label: locale === 'en' ? 'Critical' : 'Nguy cấp',
      };
    case 'URGENT':
      return {
        icon: <AlertCircle size={16} className="text-orange-500" />,
        bg: 'bg-orange-50/50 border-l-2 border-l-orange-500',
        badgeClass: 'bg-orange-100 text-orange-700 border border-orange-200',
        label: locale === 'en' ? 'Urgent' : 'Khẩn cấp',
      };
    case 'WARNING':
      return {
        icon: <AlertTriangle size={16} className="text-amber-500" />,
        bg: 'bg-amber-50/50 border-l-2 border-l-amber-500',
        badgeClass: 'bg-amber-100 text-amber-700 border border-amber-200',
        label: t('common.warning', 'Cảnh báo'),
      };
    case 'INFO':
    default:
      return {
        icon: <Info size={16} className="text-blue-500" />,
        bg: 'bg-blue-50/40 border-l-2 border-l-blue-500',
        badgeClass: 'bg-blue-100 text-blue-700 border border-blue-200',
        label: t('common.info', 'Thông tin'),
      };
  }
}

