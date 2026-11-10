import React from 'react';
import { Bell } from 'lucide-react';

export interface NotificationEmptyStateProps {
  isFilteredUnread: boolean;
  emptyAllText: string;
  emptyUnreadText: string;
}

export const NotificationEmptyState: React.FC<NotificationEmptyStateProps> = ({
  isFilteredUnread,
  emptyAllText,
  emptyUnreadText,
}) => {
  return (
    <div className="py-12 px-4 text-center">
      <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
        <Bell size={18} />
      </div>
      <p className="text-xs text-slate-500 m-0">
        {isFilteredUnread ? emptyUnreadText : emptyAllText}
      </p>
    </div>
  );
};

