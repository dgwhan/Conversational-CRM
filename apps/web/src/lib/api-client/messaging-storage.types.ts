export interface ChannelStorageBreakdown {
  channel: 'ZALO' | 'FACEBOOK' | 'TIKTOK' | 'MANUAL_IMPORT';
  messageCount: number;
  estimatedSizeBytes: number;
  estimatedSizeFormatted: string;
}

export interface AgeGroupStorage {
  count: number;
  estimatedSizeBytes: number;
  estimatedSizeFormatted: string;
}

export interface StorageRetentionPolicy {
  enabled: boolean;
  retentionMonths: number;
  autoCleanupEnabled: boolean;
  slimPayloadOnly: boolean;
  cronSchedule: string;
  lastRunAt?: string | null;
  lastDeletedCount?: number;
  lastFreedBytes?: number;
}

export interface MessageStorageMetrics {
  totalMessages: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  tableSizeBytes: number;
  indexSizeBytes: number;
  toastSizeBytes: number;
  averageMessageSizeBytes: number;
  channelBreakdown: ChannelStorageBreakdown[];
  ageBreakdown: {
    lessThan30Days: AgeGroupStorage;
    oneToSixMonths: AgeGroupStorage;
    sixToTwelveMonths: AgeGroupStorage;
    olderThan12Months: AgeGroupStorage;
  };
  retentionPolicy: StorageRetentionPolicy;
  updatedAt: string;
}

export interface EstimatePurgeRequest {
  workspaceId?: string;
  retentionMonths?: number;
  beforeDate?: string;
  slimPayloadOnly?: boolean;
  channel?: 'ZALO' | 'FACEBOOK' | 'TIKTOK' | 'MANUAL_IMPORT';
  onlyResolvedConversations?: boolean;
}

export interface EstimatePurgeResponse {
  matchedMessagesCount: number;
  estimatedFreedBytes: number;
  estimatedFreedFormatted: string;
  earliestMessageDate: string | null;
  latestMessageDate: string | null;
  slimPayloadOnly: boolean;
  cutoffDate: string;
}

export interface PurgeMessagesRequest {
  workspaceId?: string;
  retentionMonths?: number;
  beforeDate?: string;
  slimPayloadOnly?: boolean;
  channel?: 'ZALO' | 'FACEBOOK' | 'TIKTOK' | 'MANUAL_IMPORT';
  onlyResolvedConversations?: boolean;
  cleanEmptyConversations?: boolean;
}

export interface PurgeMessagesResponse {
  success: boolean;
  deletedMessagesCount: number;
  slimmedMessagesCount: number;
  cleanedConversationsCount: number;
  freedSizeBytes: number;
  freedSizeFormatted: string;
  durationMs: number;
  executedAt: string;
  executionType: 'MANUAL' | 'AUTOMATED';
}
