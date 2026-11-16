import type { ChannelKey } from "../../../../types.js";
import type { ConnectionStatus } from "../../workspace.config.js";

export interface ConnectedChannelItem {
  id: string;
  workspaceId: string;
  channel: ChannelKey;
  externalAccountId: string;
  displayName: string;
  avatarUrl?: string;
  isActive: boolean;
  isWebhookSubscribed?: boolean;
  hasToken?: boolean;
  tokenExpiresAt?: string | null;
  disconnectedAt?: string | null;
  status?: ConnectionStatus;
  lastSyncAt?: string;
  webhookStatus?: "Healthy" | "Degraded" | "Down";
  metadata?: {
    category?: string;
    followerCount?: number;
    isPersonal?: boolean;
    phone?: string;
    autoAssign?: boolean;
    engine?: string;
    [key: string]: any;
  };
  createdAt?: string;
}

export interface ConnectRenewTarget {
  externalAccountId: string;
  displayName: string;
}

export interface WorkspaceChannelsTabProps {
  workspaceId: string;
  workspaceName: string;
  isOwner: boolean;
  /** Owner/Manager may establish or renew channels; STAFF remains limited by the API to Zalo. */
  canConnectChannels?: boolean;
  /** Owner-only channel administration such as activation toggles and detail management. */
  canManageChannels?: boolean;
  channels: ConnectedChannelItem[];
  isLoading: boolean;
  syncingChannelId: string | null;
  togglingChannelId: string | null;
  onSyncChannel: (channelId: string) => Promise<void>;
  onToggleChannel: (channelId: string, currentActive: boolean) => Promise<void>;
  onDisconnectChannel: (channelId: string, displayName: string) => Promise<void>;
  /** renewTarget: gia hạn đúng kênh Zalo đang chọn (QR phải quét bằng chính tài khoản đó) */
  onOpenConnectModal: (channelKey: ChannelKey, renewTarget?: ConnectRenewTarget) => void;
}

export interface ConnectedChannelsListProps {
  channels: ConnectedChannelItem[];
  isLoading: boolean;
  hasActiveFilters: boolean;
  canManageChannels: boolean;
  canConnectChannels: boolean;
  canDisconnect: boolean;
  syncingChannelId: string | null;
  togglingChannelId: string | null;
  onOpenConnectModal: (channelKey: ChannelKey, renewTarget?: ConnectRenewTarget) => void;
  onOpenPlatformPicker: () => void;
  onOpenChannelDetails: (channel: ConnectedChannelItem) => void;
  onSyncChannel: WorkspaceChannelsTabProps["onSyncChannel"];
  onToggleChannel: WorkspaceChannelsTabProps["onToggleChannel"];
  onDisconnectChannel: WorkspaceChannelsTabProps["onDisconnectChannel"];
}

export interface AvailablePlatformsSectionProps {
  canConnectChannels: boolean;
  onOpenConnectModal: (channelKey: ChannelKey) => void;
}
