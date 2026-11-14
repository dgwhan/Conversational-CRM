import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import { MessageStorageService } from './message-storage.service.js';
import type { PurgeMessagesResponse } from '../../../contracts/message-storage.js';
import { DistributedLockService } from '../../../platform/redis/distributed-lock.service.js';
import { MediaArchiveService } from './media-archive.service.js';

/** Giữ khóa tối đa 2 giờ: đủ cho một lượt dọn dẹp lớn, tự hết hạn nếu instance chết giữa chừng. */
const RETENTION_LOCK_TTL_MS = 2 * 60 * 60 * 1000;

@Injectable()
export class RetentionSchedulerService {
  private readonly logger = new Logger(RetentionSchedulerService.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: MessageStorageService,
    @Optional() private readonly locks?: DistributedLockService,
    @Optional() private readonly media?: MediaArchiveService,
  ) {}

  /** 03:00 hằng ngày: xóa bản sao media quá MEDIA_RETENTION_DAYS (giữ metadata, đánh dấu hết hạn). */
  @Cron('0 3 * * *', { name: 'media-retention-cleanup', timeZone: 'Asia/Ho_Chi_Minh' })
  async handleMediaRetention(): Promise<void> {
    if (!this.media) return;
    const task = () => this.media!.cleanupExpired();
    try {
      if (this.locks) await this.locks.runExclusive('cron:media-retention', RETENTION_LOCK_TTL_MS, task);
      else await task();
    } catch (err) {
      this.logger.error(`Media retention cleanup failed: ${(err as Error).message}`);
    }
  }

  /**
   * Cron Job tự động dọn dẹp tin nhắn quá hạn định kỳ hàng ngày vào 02:00 AM (giờ Việt Nam).
   * Mặc định xóa các tin nhắn cũ hơn 12 tháng.
   */
  @Cron('0 2 * * *', {
    name: 'auto-purge-expired-messages',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async handleDailyMessageRetention(): Promise<void> {
    // Khi chạy nhiều instance, mọi instance đều kích hoạt cron lúc 02:00: chỉ instance giành được khóa mới chạy
    if (this.locks) {
      const ran = await this.locks.runExclusive('cron:message-retention', RETENTION_LOCK_TTL_MS, async () => {
        await this.runDailyMessageRetention();
        return true;
      });
      if (!ran) {
        this.logger.log('Message retention is being handled by another instance. Skipping.');
      }
      return;
    }
    await this.runDailyMessageRetention();
  }

  private async runDailyMessageRetention(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Previous message retention cleanup job is still running. Skipping this trigger.');
      return;
    }

    this.isRunning = true;
    this.logger.log('=== [RETENTION CRON] Starting daily automated message storage cleanup ===');

    try {
      // 1. Lấy danh sách các workspace hiện có
      const workspaces = await this.prisma.workspace.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      });

      let totalCleanedWorkspaces = 0;
      let totalDeleted = 0;
      let totalSlimmed = 0;
      let totalFreedBytes = 0;

      for (const ws of workspaces) {
        try {
          const policy = await this.storageService.getRetentionPolicy(ws.id);
          if (!policy.enabled || !policy.autoCleanupEnabled) {
            this.logger.debug(`Auto-cleanup is disabled for workspace ${ws.name} (${ws.id}). Skipping.`);
            continue;
          }

          const retentionMonths = policy.retentionMonths || 12;
          const slimPayloadOnly = !!policy.slimPayloadOnly;

          const result = await this.storageService.purgeMessages(
            {
              workspaceId: ws.id,
              retentionMonths,
              slimPayloadOnly,
              cleanEmptyConversations: true,
              onlyResolvedConversations: false,
            },
            'AUTOMATED',
          );

          totalCleanedWorkspaces++;
          totalDeleted += result.deletedMessagesCount;
          totalSlimmed += result.slimmedMessagesCount;
          totalFreedBytes += result.freedSizeBytes;
        } catch (wsErr) {
          this.logger.error(`Failed to execute retention cleanup for workspace ${ws.id}: ${(wsErr as Error).message}`);
        }
      }

      // 2. Chạy dọn dẹp các tin nhắn toàn cục (nếu có tin nhắn mồ côi không gắn workspace nào)
      try {
        const globalResult = await this.storageService.purgeMessages(
          {
            retentionMonths: 12,
            slimPayloadOnly: false,
            onlyResolvedConversations: false,
            cleanEmptyConversations: true,
          },
          'AUTOMATED',
        );
        totalDeleted += globalResult.deletedMessagesCount;
        totalSlimmed += globalResult.slimmedMessagesCount;
        totalFreedBytes += globalResult.freedSizeBytes;
      } catch (globalErr) {
        this.logger.warn(`Global retention cleanup step completed with warning: ${(globalErr as Error).message}`);
      }

      this.logger.log(
        `=== [RETENTION CRON] Completed: processed ${totalCleanedWorkspaces} workspace(s), deleted ${totalDeleted} message(s), slimmed ${totalSlimmed}, freed ${this.storageService.formatBytes(totalFreedBytes)} ===`,
      );
    } catch (error) {
      this.logger.error(`Critical error during message retention cleanup: ${(error as Error).message}`, error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Kích hoạt dọn dẹp thủ công ngay lập tức qua API (Admin Trigger)
   */
  async triggerRetentionNow(workspaceId?: string, actorId?: string): Promise<PurgeMessagesResponse> {
    this.logger.log(`Manual trigger for message retention requested by actor=${actorId || 'SYSTEM'}, workspace=${workspaceId || 'GLOBAL'}`);
    const policy = await this.storageService.getRetentionPolicy(workspaceId);
    return this.storageService.purgeMessages(
      {
        workspaceId,
        retentionMonths: policy.retentionMonths || 12,
        slimPayloadOnly: policy.slimPayloadOnly,
        onlyResolvedConversations: false,
        cleanEmptyConversations: true,
      },
      'MANUAL',
      actorId,
    );
  }
}
