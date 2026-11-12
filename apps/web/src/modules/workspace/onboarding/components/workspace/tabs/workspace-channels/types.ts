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

export interface WorkspaceChannelsTabProps {
  workspaceId: string;
  workspaceName: string;
  isOwner: boolean;
  canManageChannels?: boolean;
  channels: ConnectedChannelItem[];
  isLoading: boolean;
  syncingChannelId: string | null;
  togglingChannelId: string | null;
  onSyncChannel: (channelId: string) => Promise<void>;
  onToggleChannel: (channelId: string, currentActive: boolean) => Promise<void>;
  onDisconnectChannel: (channelId: string, displayName: string) => Promise<void>;
  onOpenConnectModal: (channelKey: ChannelKey) => void;
}

export interface ConnectedChannelsListProps {
  channels: ConnectedChannelItem[];
  isLoading: boolean;
  hasActiveFilters: boolean;
  canManageChannels: boolean;
  canDisconnect: boolean;
  syncingChannelId: string | null;
  togglingChannelId: string | null;
  onOpenConnectModal: (channelKey: ChannelKey) => void;
  onOpenPlatformPicker: () => void;
  onOpenChannelDetails: (channel: ConnectedChannelItem) => void;
  onSyncChannel: WorkspaceChannelsTabProps["onSyncChannel"];
  onToggleChannel: WorkspaceChannelsTabProps["onToggleChannel"];
  onDisconnectChannel: WorkspaceChannelsTabProps["onDisconnectChannel"];
}

export interface AvailablePlatformsSectionProps {
  canManageChannels: boolean;
  onOpenConnectModal: (channelKey: ChannelKey) => void;
}
