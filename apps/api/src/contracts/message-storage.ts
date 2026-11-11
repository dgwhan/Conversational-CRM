import { z } from 'zod';

export const ChannelStorageBreakdownSchema = z.object({
  channel: z.enum(['ZALO', 'FACEBOOK', 'TIKTOK', 'MANUAL_IMPORT']),
  messageCount: z.number().int().nonnegative(),
  estimatedSizeBytes: z.number().int().nonnegative(),
  estimatedSizeFormatted: z.string(),
});
export type ChannelStorageBreakdown = z.infer<typeof ChannelStorageBreakdownSchema>;

export const AgeGroupStorageSchema = z.object({
  count: z.number().int().nonnegative(),
  estimatedSizeBytes: z.number().int().nonnegative(),
  estimatedSizeFormatted: z.string(),
});
export type AgeGroupStorage = z.infer<typeof AgeGroupStorageSchema>;

export const StorageRetentionPolicySchema = z.object({
  enabled: z.boolean().default(true),
  retentionMonths: z.number().int().min(1).max(120).default(12),
  autoCleanupEnabled: z.boolean().default(true),
  slimPayloadOnly: z.boolean().default(false),
  cronSchedule: z.string().default('0 2 * * *'),
  lastRunAt: z.string().nullable().optional(),
  lastDeletedCount: z.number().int().nonnegative().optional(),
  lastFreedBytes: z.number().int().nonnegative().optional(),
});
export type StorageRetentionPolicy = z.infer<typeof StorageRetentionPolicySchema>;

export const MessageStorageMetricsSchema = z.object({
  totalMessages: z.number().int().nonnegative(),
  totalSizeBytes: z.number().int().nonnegative(),
  totalSizeFormatted: z.string(),
  tableSizeBytes: z.number().int().nonnegative(),
  indexSizeBytes: z.number().int().nonnegative(),
  toastSizeBytes: z.number().int().nonnegative(),
  averageMessageSizeBytes: z.number().int().nonnegative(),
  channelBreakdown: z.array(ChannelStorageBreakdownSchema),
  ageBreakdown: z.object({
    lessThan30Days: AgeGroupStorageSchema,
    oneToSixMonths: AgeGroupStorageSchema,
    sixToTwelveMonths: AgeGroupStorageSchema,
    olderThan12Months: AgeGroupStorageSchema,
  }),
  retentionPolicy: StorageRetentionPolicySchema,
  updatedAt: z.string(),
});
export type MessageStorageMetrics = z.infer<typeof MessageStorageMetricsSchema>;

export const EstimatePurgeRequestSchema = z.object({
  workspaceId: z.string().optional(),
  retentionMonths: z.number().int().min(1).max(120).optional().default(12),
  beforeDate: z.string().datetime().optional(),
  slimPayloadOnly: z.boolean().optional().default(false),
  channel: z.enum(['ZALO', 'FACEBOOK', 'TIKTOK', 'MANUAL_IMPORT']).optional(),
  onlyResolvedConversations: z.boolean().optional().default(false),
});
export type EstimatePurgeRequest = z.infer<typeof EstimatePurgeRequestSchema>;

export const EstimatePurgeResponseSchema = z.object({
  matchedMessagesCount: z.number().int().nonnegative(),
  estimatedFreedBytes: z.number().int().nonnegative(),
  estimatedFreedFormatted: z.string(),
  earliestMessageDate: z.string().nullable(),
  latestMessageDate: z.string().nullable(),
  slimPayloadOnly: z.boolean(),
  cutoffDate: z.string(),
});
export type EstimatePurgeResponse = z.infer<typeof EstimatePurgeResponseSchema>;

export const PurgeMessagesRequestSchema = z.object({
  workspaceId: z.string().optional(),
  retentionMonths: z.number().int().min(1).max(120).optional().default(12),
  beforeDate: z.string().datetime().optional(),
  slimPayloadOnly: z.boolean().optional().default(false),
  channel: z.enum(['ZALO', 'FACEBOOK', 'TIKTOK', 'MANUAL_IMPORT']).optional(),
  onlyResolvedConversations: z.boolean().optional().default(false),
  cleanEmptyConversations: z.boolean().optional().default(false),
});
export type PurgeMessagesRequest = z.infer<typeof PurgeMessagesRequestSchema>;

export const PurgeMessagesResponseSchema = z.object({
  success: z.boolean(),
  deletedMessagesCount: z.number().int().nonnegative(),
  slimmedMessagesCount: z.number().int().nonnegative(),
  cleanedConversationsCount: z.number().int().nonnegative(),
  freedSizeBytes: z.number().int().nonnegative(),
  freedSizeFormatted: z.string(),
  durationMs: z.number().int().nonnegative(),
  executedAt: z.string(),
  executionType: z.enum(['MANUAL', 'AUTOMATED']),
});
export type PurgeMessagesResponse = z.infer<typeof PurgeMessagesResponseSchema>;

export const UpdateRetentionPolicyRequestSchema = z.object({
  enabled: z.boolean().optional(),
  retentionMonths: z.number().int().min(1).max(120).optional(),
  autoCleanupEnabled: z.boolean().optional(),
  slimPayloadOnly: z.boolean().optional(),
  lastRunAt: z.string().nullable().optional(),
  lastDeletedCount: z.number().int().nonnegative().optional(),
  lastFreedBytes: z.number().int().nonnegative().optional(),
});
export type UpdateRetentionPolicyRequest = z.infer<typeof UpdateRetentionPolicyRequestSchema>;
