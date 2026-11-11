import React from 'react';
import type { NotificationFilter } from '../types/notification.types.js';

export interface NotificationTabsProps {
  filter: NotificationFilter;
  totalCount: number;
  unreadCount: number;
  allLabel: string;
  unreadLabel: string;
  onFilterChange: (filter: NotificationFilter) => void;
}

export const NotificationTabs: React.FC<NotificationTabsProps> = ({
  filter,
  totalCount,
  unreadCount,
  allLabel,
  unreadLabel,
  onFilterChange,
}) => {
  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-100 text-xs">
      <button
        type="button"
        onClick={() => onFilterChange('ALL')}
        className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
          filter === 'ALL'
            ? 'bg-blue-50 text-blue-700 font-semibold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        {allLabel} ({totalCount})
      </button>
      <button
        type="button"
        onClick={() => onFilterChange('UNREAD')}
        className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
          filter === 'UNREAD'
            ? 'bg-blue-50 text-blue-700 font-semibold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        {unreadLabel} ({unreadCount})
      </button>
    </div>
  );
};

