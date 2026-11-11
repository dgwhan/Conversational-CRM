import { Injectable, Logger } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { AuditService } from '../../audit/audit.service.js';
import { WorkspaceConfigService } from '../../workspace-config/application/workspace-config/workspace-config.service.js';
import { MessageStorageRepository } from '../infrastructure/message-storage.repository.js';
import type {
  MessageStorageMetrics,
  EstimatePurgeRequest,
  EstimatePurgeResponse,
  PurgeMessagesRequest,
  PurgeMessagesResponse,
  StorageRetentionPolicy,
  UpdateRetentionPolicyRequest,
} from '../../../contracts/message-storage.js';

@Injectable()
export class MessageStorageService {
  private readonly logger = new Logger(MessageStorageService.name);

  constructor(
    private readonly repository: MessageStorageRepository,
    private readonly auditService: AuditService,
    private readonly workspaceConfigService: WorkspaceConfigService,
  ) {}

  /**
   * Định dạng bytes thành chuỗi dễ đọc (B, KB, MB, GB)
   */
  public formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);
    return `${size.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
  }

  /**
   * Lấy cấu hình chính sách lưu trữ của Workspace (mặc định 12 tháng)
   */
  async getRetentionPolicy(workspaceId?: string): Promise<StorageRetentionPolicy> {
    const defaultPolicy: StorageRetentionPolicy = {
      enabled: true,
      retentionMonths: 12,
      autoCleanupEnabled: true,
      slimPayloadOnly: false,
      cronSchedule: '0 2 * * *',
      lastRunAt: null,
      lastDeletedCount: 0,
      lastFreedBytes: 0,
    };

    if (!workspaceId) return defaultPolicy;

    try {
      const config = await this.workspaceConfigService.getConfig(workspaceId);
      const terminology = (config.terminology as Record<string, unknown>) || {};
      const storedPolicy = terminology.messageRetentionPolicy as Partial<StorageRetentionPolicy> | undefined;

      if (storedPolicy) {
        return {
          ...defaultPolicy,
          ...storedPolicy,
        };
      }
    } catch (error) {
      this.logger.debug(`Could not load workspace retention policy, using defaults: ${(error as Error).message}`);
    }

    return defaultPolicy;
  }

  /**
   * Cập nhật chính sách lưu trữ của Workspace
   */
  async updateRetentionPolicy(
    workspaceId: string,
    update: UpdateRetentionPolicyRequest,
    actorId?: string,
  ): Promise<StorageRetentionPolicy> {
    const current = await this.getRetentionPolicy(workspaceId);
    const updatedPolicy: StorageRetentionPolicy = {
      ...current,
      ...update,
    };

    const config = await this.workspaceConfigService.getConfig(workspaceId);
    const terminology = {
      ...(config.terminology as Record<string, unknown>),
      messageRetentionPolicy: updatedPolicy,
    };

    await this.workspaceConfigService.updateConfig(
      workspaceId,
      { terminology: terminology as any },
      actorId,
    );

    this.logger.log(`Updated message retention policy for workspace ${workspaceId}: ${JSON.stringify(updatedPolicy)}`);
    return updatedPolicy;
  }

  /**
   * Lấy báo cáo số liệu dung lượng lưu trữ đầy đủ
   */
  async getMetrics(workspaceId?: string): Promise<MessageStorageMetrics> {
    const [physical, logical, channels, ageBreakdown, policy] = await Promise.all([
      this.repository.getPhysicalTableSizes(),
      this.repository.getLogicalStats(workspaceId),
      this.repository.getChannelBreakdown(workspaceId),
      this.repository.getAgeBreakdown(workspaceId),
      this.getRetentionPolicy(workspaceId),
    ]);

    const totalLogicalBytes = logical.textContentBytes + logical.rawPayloadBytes + logical.attachmentsBytes;
    const totalSizeBytes = physical.totalBytes > 0 ? physical.totalBytes : totalLogicalBytes;
    const avgSizeBytes = logical.totalMessages > 0 ? Math.round(totalSizeBytes / logical.totalMessages) : 0;

    return {
      totalMessages: logical.totalMessages,
      totalSizeBytes,
      totalSizeFormatted: this.formatBytes(totalSizeBytes),
      tableSizeBytes: physical.tableBytes > 0 ? physical.tableBytes : logical.textContentBytes,
      indexSizeBytes: physical.indexBytes,
      toastSizeBytes: physical.toastBytes > 0 ? physical.toastBytes : logical.rawPayloadBytes,
      averageMessageSizeBytes: avgSizeBytes,
      channelBreakdown: channels.map((c) => ({
        channel: c.channel,
        messageCount: c.messageCount,
        estimatedSizeBytes: c.estimatedBytes,
        estimatedSizeFormatted: this.formatBytes(c.estimatedBytes),
      })),
      ageBreakdown: {
        lessThan30Days: {
          count: ageBreakdown.lessThan30Days.count,
          estimatedSizeBytes: ageBreakdown.lessThan30Days.estimatedBytes,
          estimatedSizeFormatted: this.formatBytes(ageBreakdown.lessThan30Days.estimatedBytes),
        },
        oneToSixMonths: {
          count: ageBreakdown.oneToSixMonths.count,
          estimatedSizeBytes: ageBreakdown.oneToSixMonths.estimatedBytes,
          estimatedSizeFormatted: this.formatBytes(ageBreakdown.oneToSixMonths.estimatedBytes),
        },
        sixToTwelveMonths: {
          count: ageBreakdown.sixToTwelveMonths.count,
          estimatedSizeBytes: ageBreakdown.sixToTwelveMonths.estimatedBytes,
          estimatedSizeFormatted: this.formatBytes(ageBreakdown.sixToTwelveMonths.estimatedBytes),
        },
        olderThan12Months: {
          count: ageBreakdown.olderThan12Months.count,
          estimatedSizeBytes: ageBreakdown.olderThan12Months.estimatedBytes,
          estimatedSizeFormatted: this.formatBytes(ageBreakdown.olderThan12Months.estimatedBytes),
        },
      },
      retentionPolicy: policy,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Tính toán thời điểm cắt (Cutoff Date) dựa vào retentionMonths hoặc beforeDate
   */
  public calculateCutoffDate(retentionMonths?: number, beforeDate?: string): Date {
    if (beforeDate) {
      return new Date(beforeDate);
    }
    const months = retentionMonths && retentionMonths > 0 ? retentionMonths : 12;
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    return date;
  }

  /**
   * Xem trước số lượng và dung lượng ước tính giải phóng (Dry Run)
   */
  async estimatePurge(request: EstimatePurgeRequest): Promise<EstimatePurgeResponse> {
    const cutoffDate = this.calculateCutoffDate(request.retentionMonths, request.beforeDate);
    const slimPayloadOnly = !!request.slimPayloadOnly;

    const result = await this.repository.estimatePurge({
      workspaceId: request.workspaceId,
      cutoffDate,
      slimPayloadOnly,
      channel: request.channel,
      onlyResolvedConversations: request.onlyResolvedConversations,
    });

    return {
      matchedMessagesCount: result.matchedCount,
      estimatedFreedBytes: result.estimatedFreedBytes,
      estimatedFreedFormatted: this.formatBytes(result.estimatedFreedBytes),
      earliestMessageDate: result.earliestDate ? result.earliestDate.toISOString() : null,
      latestMessageDate: result.latestDate ? result.latestDate.toISOString() : null,
      slimPayloadOnly,
      cutoffDate: cutoffDate.toISOString(),
    };
  }

  /**
   * Thực thi dọn dẹp tin nhắn (Thủ công hoặc Tự động)
   */
  async purgeMessages(
    request: PurgeMessagesRequest,
    executionType: 'MANUAL' | 'AUTOMATED' = 'MANUAL',
    actorUserId?: string,
  ): Promise<PurgeMessagesResponse> {
    const startTime = Date.now();
    const cutoffDate = this.calculateCutoffDate(request.retentionMonths, request.beforeDate);
    const slimPayloadOnly = !!request.slimPayloadOnly;

    this.logger.log(
      `Starting message purge [${executionType}]: cutoff=${cutoffDate.toISOString()}, slimPayload=${slimPayloadOnly}, workspace=${request.workspaceId || 'ALL'}`,
    );

    const purgeResult = await this.repository.executeChunkedPurge({
      workspaceId: request.workspaceId,
      cutoffDate,
      slimPayloadOnly,
      channel: request.channel,
      onlyResolvedConversations: request.onlyResolvedConversations,
    });

    let cleanedConversationsCount = 0;
    if (request.cleanEmptyConversations) {
      cleanedConversationsCount = await this.repository.cleanEmptyConversations(request.workspaceId);
    }

    const durationMs = Date.now() - startTime;
    const response: PurgeMessagesResponse = {
      success: true,
      deletedMessagesCount: purgeResult.deletedCount,
      slimmedMessagesCount: purgeResult.slimmedCount,
      cleanedConversationsCount,
      freedSizeBytes: purgeResult.freedBytes,
      freedSizeFormatted: this.formatBytes(purgeResult.freedBytes),
      durationMs,
      executedAt: new Date().toISOString(),
      executionType,
    };

    // Cập nhật thống kê lần chạy gần nhất vào workspace nếu có
    if (request.workspaceId) {
      try {
        const policy = await this.getRetentionPolicy(request.workspaceId);
        await this.updateRetentionPolicy(
          request.workspaceId,
          {
            ...policy,
            lastRunAt: response.executedAt,
            lastDeletedCount: response.deletedMessagesCount + response.slimmedMessagesCount,
            lastFreedBytes: response.freedSizeBytes,
          },
          actorUserId,
        );
      } catch (err) {
        this.logger.warn(`Could not update retention policy run stats: ${(err as Error).message}`);
      }
    }

    // Ghi Audit Log
    await this.auditService.recordEvent({
      action: AuditAction.MESSAGE_STORAGE_PURGED,
      userId: actorUserId,
      actorId: actorUserId,
      metadata: {
        executionType,
        workspaceId: request.workspaceId || 'GLOBAL',
        deletedMessagesCount: response.deletedMessagesCount,
        slimmedMessagesCount: response.slimmedMessagesCount,
        cleanedConversationsCount,
        freedSizeBytes: response.freedSizeBytes,
        durationMs,
        cutoffDate: cutoffDate.toISOString(),
        slimPayloadOnly,
      },
    });

    this.logger.log(
      `Finished message purge: ${response.deletedMessagesCount} deleted, ${response.slimmedMessagesCount} slimmed, ${response.freedSizeFormatted} freed in ${durationMs}ms`,
    );

    return response;
  }
}
