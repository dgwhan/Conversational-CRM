import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  PageToolbar,
  SearchInput,
  Select,
  Button,
} from '../../../../../../../components/ui/index.js';
import { ConnectedChannelsList } from './ConnectedChannelsList.js';
import { AvailablePlatformsSection } from './AvailablePlatformsSection.js';
import { PlatformPickerModal, ChannelDetailModal } from '../modals/index.js';
import type {
  ConnectedChannelItem,
  WorkspaceChannelsTabProps,
} from './types.js';

export const WorkspaceChannelsTab: React.FC<WorkspaceChannelsTabProps> = ({
  channels,
  isOwner,
  canManageChannels = isOwner,
  isLoading,
  syncingChannelId,
  togglingChannelId,
  onSyncChannel,
  onToggleChannel,
  onDisconnectChannel,
  onOpenConnectModal,
}) => {
  const [isPlatformPickerOpen, setIsPlatformPickerOpen] = useState(false);
  const [selectedChannelDetail, setSelectedChannelDetail] = useState<ConnectedChannelItem | null>(null);
  const [channelSearch, setChannelSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('ALL');

  const filteredChannels = channels.filter((ch) => {
    if (platformFilter !== 'ALL' && ch.channel !== platformFilter) {
      return false;
    }
    const q = channelSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      ch.displayName.toLowerCase().includes(q) ||
      ch.externalAccountId.toLowerCase().includes(q) ||
      ch.channel.toLowerCase().includes(q)
    );
  });

  const platformFilterOptions = [
    { value: 'ALL', label: 'Tất cả nền tảng' },
    { value: 'FACEBOOK', label: 'Facebook Messenger' },
    { value: 'ZALO', label: 'Zalo OA' },
    { value: 'TIKTOK', label: 'TikTok' },
  ];

  const hasActiveFilters = Boolean(channelSearch.trim()) || platformFilter !== 'ALL';

  return (
    <div className="space-y-3.5 pt-1">
      {/* 1. Toolbar tìm kiếm & lọc kênh */}
      <PageToolbar
        search={
          <SearchInput
            value={channelSearch}
            onChange={setChannelSearch}
            placeholder="Tìm kiếm kênh kết nối theo tên hoặc ID... (Nhấn /)"
            shortcutHint="/"
            size="sm"
          />
        }
        filters={
          <Select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            options={platformFilterOptions}
            size="sm"
          />
        }
        actions={
          canManageChannels && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={13} />}
              onClick={() => setIsPlatformPickerOpen(true)}
            >
              Thêm kênh
            </Button>
          )
        }
      />

      {/* 2. Danh sách kênh kết nối */}
      <ConnectedChannelsList
        channels={filteredChannels}
        isLoading={isLoading}
        hasActiveFilters={hasActiveFilters}
        canManageChannels={canManageChannels}
        canDisconnect={isOwner}
        syncingChannelId={syncingChannelId}
        togglingChannelId={togglingChannelId}
        onOpenConnectModal={onOpenConnectModal}
        onOpenPlatformPicker={() => setIsPlatformPickerOpen(true)}
        onOpenChannelDetails={setSelectedChannelDetail}
        onSyncChannel={onSyncChannel}
        onToggleChannel={onToggleChannel}
        onDisconnectChannel={onDisconnectChannel}
      />

      {/* 3. Nền tảng khả dụng (Sử dụng PageSection chuẩn hệ thống) */}
      <AvailablePlatformsSection
        canManageChannels={canManageChannels}
        onOpenConnectModal={onOpenConnectModal}
      />

      {/* 4. Modal Chọn nền tảng */}
      <PlatformPickerModal
        isOpen={isPlatformPickerOpen}
        onClose={() => setIsPlatformPickerOpen(false)}
        onSelectPlatform={onOpenConnectModal}
      />

      {/* 5. Modal Chi tiết kết nối */}
      <ChannelDetailModal
        channel={selectedChannelDetail}
        onClose={() => setSelectedChannelDetail(null)}
        onOpenConnectModal={onOpenConnectModal}
        onSyncChannel={onSyncChannel}
        onDisconnectChannel={onDisconnectChannel}
        canDisconnect={isOwner}
        isSyncing={selectedChannelDetail ? syncingChannelId === selectedChannelDetail.id : false}
      />
    </div>
  );
};
