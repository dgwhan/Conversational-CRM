import React from 'react';
import { ExternalLink, Trash2 } from 'lucide-react';
import type { NotificationItem } from '../../../lib/api-client/index.js';
import { getSeverityBadge, getRelativeTimeString } from '../utils/notification-formatters.js';

export interface NotificationItemRowProps {
  item: NotificationItem;
  locale: string;
  t: (k: string, fb?: string) => string;
  onItemClick: (item: NotificationItem) => void;
  onDelete: (item: NotificationItem, e: React.MouseEvent) => void;
  onAcceptInvite: (wsId: string, item: NotificationItem, e: React.MouseEvent) => void;
  onDeclineInvite: (wsId: string, item: NotificationItem, e: React.MouseEvent) => void;
}

export const NotificationItemRow: React.FC<NotificationItemRowProps> = ({
  item,
  locale,
  t,
  onItemClick,
  onDelete,
  onAcceptInvite,
  onDeclineInvite,
}) => {
  const config = getSeverityBadge(item.severity, locale, t);
  const inviteWsId = item.metadata?.workspaceId || item.workspaceId;

  return (
    <div
      onClick={() => onItemClick(item)}
      className={`p-3.5 transition-colors cursor-pointer relative group flex gap-3 ${
        item.isRead ? 'bg-white hover:bg-slate-50' : `${config.bg} hover:brightness-98`
      }`}
    >
      {/* Severity Icon */}
      <div className="shrink-0 mt-0.5">{config.icon}</div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-6">
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <span
            className={`text-[11px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded ${config.badgeClass}`}
          >
            {config.label}
          </span>
          <h4
            className={`text-xs truncate ${
              item.isRead ? 'text-slate-700 font-medium' : 'text-slate-900 font-bold'
            }`}
            title={item.title}
          >
            {item.title}
          </h4>
        </div>

        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
          {item.content}
        </p>

        <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
          <span>{getRelativeTimeString(item.createdAt, locale, t)}</span>
          {item.actionUrl && (
            <span className="inline-flex items-center gap-0.5 text-blue-600 font-medium hover:underline">
              <span>{locale === 'en' ? 'Details' : 'Chi tiết'}</span>
              <ExternalLink size={10} />
            </span>
          )}
        </div>

        {/* Nút hành động trực tiếp nếu là lời mời tham gia Workspace */}
        {(item.type === 'WORKSPACE_INVITATION' || item.metadata?.workspaceId) && (
          <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={(e) => inviteWsId && onAcceptInvite(inviteWsId, item, e)}
              className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition-colors shadow-2xs"
            >
              {t('notifications.accept', 'Chấp nhận')}
            </button>
            <button
              type="button"
              onClick={(e) => inviteWsId && onDeclineInvite(inviteWsId, item, e)}
              className="px-2.5 py-1 text-xs font-medium rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors"
            >
              {t('notifications.decline', 'Từ chối')}
            </button>
          </div>
        )}
      </div>

      {/* Unread dot / Actions */}
      <div className="absolute right-3 top-3 flex items-center gap-1">
        {!item.isRead && (
          <span
            className="w-2 h-2 rounded-full bg-blue-600 shrink-0"
            title={t('notifications.unread', 'Chưa đọc')}
          />
        )}
        <button
          type="button"
          onClick={(e) => onDelete(item, e)}
          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 rounded transition-opacity"
          title={t('common.delete', 'Xóa thông báo')}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
};

