import React from 'react';
import type {
  ConversationChannelFilter,
  ConversationStatusFilter,
} from '../../../types.js';
import { useTranslation } from '../../../../../i18n/index.js';
import { SearchInput } from '../../../../../components/ui/SearchInput.js';
import { SearchableSelect } from '../../../../../components/ui/SearchableSelect.js';

export interface ConversationListFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedChannel: ConversationChannelFilter;
  onChannelChange: (channel: ConversationChannelFilter) => void;
  statusFilter: ConversationStatusFilter;
  onStatusFilterChange: (status: ConversationStatusFilter) => void;
  zaloAccounts?: { id: string; name: string }[];
  selectedZaloAccount?: string;
  onZaloAccountChange?: (accountId: string) => void;
  alertThresholdMinutes?: number;
}

export const ConversationListFilters: React.FC<ConversationListFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedChannel,
  onChannelChange,
  statusFilter,
  onStatusFilterChange,
  zaloAccounts,
  selectedZaloAccount,
  onZaloAccountChange,
  alertThresholdMinutes = 15,
}) => {
  const { t } = useTranslation();

  const channels: Array<{ id: ConversationChannelFilter; label: string; count?: number }> = [
    { id: 'ALL', label: t('common.all') },
    { id: 'FACEBOOK', label: 'Facebook' },
    {
      id: 'ZALO',
      label: 'Zalo',
      count: zaloAccounts && zaloAccounts.length > 1 ? zaloAccounts.length : undefined,
    },
    { id: 'TIKTOK', label: 'TikTok' },
  ];

  return (
    <div className="flex flex-col border-b border-slate-200">
      {/* 1. Thanh tìm kiếm mềm */}
      <div className="px-3 pt-2.5 pb-1.5">
        <SearchInput
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Tìm tên, SĐT, tin nhắn..."
          size="sm"
          className="w-full text-[13px]"
        />
      </div>

      {/* 2. Tabs kênh dạng Underline mảnh tiết kiệm chiều cao */}
      <div className="px-3 border-b border-slate-100 flex items-center gap-4 text-xs">
        {channels.map((ch) => {
          const isActive = selectedChannel === ch.id;
          return (
            <button
              key={ch.id}
              type="button"
              onClick={() => onChannelChange(ch.id)}
              className={`relative py-2 font-medium transition-colors cursor-pointer whitespace-nowrap ${isActive
                  ? 'text-blue-600 font-semibold after:absolute after:bottom-0 after:inset-x-0 after:h-[2px] after:bg-blue-600 after:rounded-full'
                  : 'text-slate-500 hover:text-slate-900'
                }`}
            >
              <span>{ch.label}</span>
              {ch.count !== undefined && (
                <span className="ml-1 text-[11px] text-slate-400 tabular-nums">
                  {ch.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Bộ lọc trạng thái & tài khoản Zalo phụ */}
      <div className="px-3 py-2 flex flex-col gap-1.5 bg-slate-50/50">
        {selectedChannel === 'ZALO' && zaloAccounts && zaloAccounts.length > 1 && (
          <SearchableSelect
            value={selectedZaloAccount || 'ALL'}
            onChange={(val) => onZaloAccountChange?.(val)}
            options={[
              { value: 'ALL', label: 'Tất cả tài khoản Zalo' },
              ...zaloAccounts.map((acc) => ({ value: acc.id, label: acc.name })),
            ]}
            size="sm"
            fullWidth
            searchable={false}
          />
        )}

        <SearchableSelect
          value={statusFilter}
          onChange={(val) => onStatusFilterChange(val as ConversationStatusFilter)}
          options={[
            { value: 'ALL', label: 'Mọi trạng thái hội thoại' },
            { value: 'UNREAD', label: t('inbox.filterUnread') },
            ...(alertThresholdMinutes !== undefined && alertThresholdMinutes > 0
              ? [
                {
                  value: 'UNRESPONSIVE',
                  label: `Chưa phản hồi (> ${alertThresholdMinutes} phút)`,
                },
              ]
              : []),
            {
              value: 'OUT_OF_OFFICE',
              label: 'Ngoài giờ - Cần tư vấn hôm sau',
            },
            {
              value: 'ASSIGNED_TO_ME',
              label: t('inbox.filterAssignedToMe'),
            },
            {
              value: 'UNASSIGNED',
              label: t('inbox.filterUnassigned'),
            },
          ]}
          size="sm"
          fullWidth
          searchable={false}
        />
      </div>
    </div>
  );
};