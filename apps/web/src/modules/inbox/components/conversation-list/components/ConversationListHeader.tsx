import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from '../../../../../i18n/index.js';

export interface ConversationListHeaderProps {
  totalCount: number;
  totalUnread: number;
  onSyncFacebook?: () => void;
  isSyncingFacebook?: boolean;
  onSyncZalo?: () => void;
  isSyncingZalo?: boolean;
}

export const ConversationListHeader: React.FC<ConversationListHeaderProps> = ({
  totalCount,
  totalUnread,
  onSyncFacebook,
  isSyncingFacebook,
  onSyncZalo,
  isSyncingZalo,
}) => {
  const { t } = useTranslation();
  const isSyncingAny = Boolean(isSyncingFacebook || isSyncingZalo);
  const canSync = Boolean(onSyncFacebook || onSyncZalo);

  const handleSyncAll = () => {
    if (onSyncFacebook && !isSyncingFacebook) onSyncFacebook();
    if (onSyncZalo && !isSyncingZalo) onSyncZalo();
  };

  return (
    <div className="h-11 px-3.5 border-b border-slate-100 flex items-center justify-between">
      <div className="flex items-center gap-1.5 min-w-0">
        <h2 className="text-[13.5px] font-semibold text-slate-950 m-0 truncate">
          {t('inbox.conversationsTitle')}
        </h2>
        <span className="text-xs font-medium text-slate-400 tabular-nums">
          {totalCount}
        </span>
        {totalUnread > 0 && (
          <span className="ml-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-full leading-none tabular-nums">
            {totalUnread} chưa đọc
          </span>
        )}
      </div>

      {canSync && (
        <button
          type="button"
          disabled={isSyncingAny}
          onClick={handleSyncAll}
          className="w-7 h-7 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          title="Đồng bộ tin nhắn các kênh"
          aria-label="Đồng bộ tin nhắn các kênh"
        >
          <RefreshCw
            size={14}
            className={isSyncingAny ? 'animate-spin text-blue-600' : ''}
          />
        </button>
      )}
    </div>
  );
};