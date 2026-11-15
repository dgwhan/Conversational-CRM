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

  const channels: Array<{ id: ConversationChannelFilter; label: string; badge?: string }> = [
    { id: 'ALL', label: t('common.all') },
    { id: 'FACEBOOK', label: 'Facebook' },
    { id: 'ZALO', label: 'Zalo', badge: zaloAccounts && zaloAccounts.length > 1 ? `${zaloAccounts.length}` : undefined },
    { id: 'TIKTOK', label: 'TikTok' },
  ];

  return (
    <div className="flex flex-col gap-2">
      {/* 1. Thanh tìm kiếm chuẩn CUS-05 */}
      <div className="w-full">
        <SearchInput
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Tìm tên, SĐT, tin nhắn..."
          size="sm"
          className="w-full text-xs"
        />
      </div>

      {/* 2. Tabs kênh dạng Segment Control tinh gọn chuẩn B2B SaaS */}
      <div className="w-full bg-slate-100 p-0.5 rounded-lg flex items-center text-xs font-medium text-slate-500">
        {channels.map((ch) => {
          const isActive = selectedChannel === ch.id;
          return (
            <button
              key={ch.id}
              type="button"
              onClick={() => onChannelChange(ch.id)}
              className={`flex-1 py-1 text-center rounded-md transition-all cursor-pointer truncate ${
                isActive
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              <span>{ch.label}</span>
              {ch.badge && <span className="ml-1 opacity-70 text-[10px]">({ch.badge})</span>}
            </button>
          );
        })}
      </div>

      {/* 3. Tài khoản Zalo phụ (nếu có nhiều Zalo) */}
      {selectedChannel === 'ZALO' && zaloAccounts && zaloAccounts.length > 1 && (
        <div className="w-full">
          <SearchableSelect
            value={selectedZaloAccount || 'ALL'}
            onChange={(val) => onZaloAccountChange?.(val)}
            options={[
              { value: 'ALL', label: 'Tất cả tài khoản' },
              ...zaloAccounts.map((acc) => ({ value: acc.id, label: acc.name })),
            ]}
            size="sm"
            fullWidth
            searchable={false}
          />
        </div>
      )}

      {/* 4. Dropdown lọc trạng thái phụ tinh tế */}
      <div className="w-full">
        <SearchableSelect
          value={statusFilter}
          onChange={(val) =>
            onStatusFilterChange(val as ConversationStatusFilter)
          }
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
              label: '🌙 Ngoài giờ - Cần tư vấn hôm sau',
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
