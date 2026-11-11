import React from 'react';
import { CheckCheck, X } from 'lucide-react';

export interface NotificationHeaderProps {
  unreadCount: number;
  title: string;
  subtitle: string;
  markAllReadLabel: string;
  onMarkAllAsRead: () => void;
  onClose: () => void;
}

export const NotificationHeader: React.FC<NotificationHeaderProps> = ({
  unreadCount,
  title,
  subtitle,
  markAllReadLabel,
  onMarkAllAsRead,
  onClose,
}) => {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-slate-800 m-0">{title}</h3>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-rose-100 text-rose-700 rounded-full">
              {unreadCount} mới
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-[11px] text-slate-500 truncate m-0">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllAsRead}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            <CheckCheck size={13} />
            <span>{markAllReadLabel}</span>
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
          aria-label="Đóng"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
