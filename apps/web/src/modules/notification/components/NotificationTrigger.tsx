import React from 'react';
import { Bell } from 'lucide-react';

import { useTranslation } from '../../../i18n/index.js';
import { translate } from '../../../i18n/translate.js';
export interface NotificationTriggerProps {
  isOpen: boolean;
  unreadCount: number;
  onClick: () => void;
  title?: string;
}

export const NotificationTrigger: React.FC<NotificationTriggerProps> = ({
  isOpen,
  unreadCount,
  onClick,
  title = translate('notifications.triggerTitle', 'Thông báo hệ thống'),
}) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative p-2 rounded-full transition-colors ${
        isOpen
          ? 'bg-blue-50 text-blue-600'
          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
      }`}
      title={title}
      aria-label={t('notifications.triggerLabel', 'Thông báo')}
    >
      <Bell size={18} />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};

