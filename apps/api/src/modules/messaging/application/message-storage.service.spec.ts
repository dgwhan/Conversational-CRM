import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Channel, AuditAction } from '@prisma/client';
import { MessageStorageService } from './message-storage.service.js';
import { RetentionSchedulerService } from './retention-scheduler.service.js';

describe('MessageStorageService & RetentionSchedulerService', () => {
  let storageService: MessageStorageService;
  let schedulerService: RetentionSchedulerService;

  const mockRepo = {
    getPhysicalTableSizes: vi.fn(),
    getLogicalStats: vi.fn(),
    getChannelBreakdown: vi.fn(),
    getAgeBreakdown: vi.fn(),
    estimatePurge: vi.fn(),
    executeChunkedPurge: vi.fn(),
    cleanEmptyConversations: vi.fn(),
  };

  const mockAuditService = {
    recordEvent: vi.fn().mockResolvedValue({ id: 'audit-1' }),
  };

  const mockWorkspaceConfigService = {
    getConfig: vi.fn(),
    updateConfig: vi.fn(),
  };

  const mockPrisma = {
    workspace: {
      findMany: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    storageService = new MessageStorageService(
      mockRepo as any,
      mockAuditService as any,
      mockWorkspaceConfigService as any,
    );

    schedulerService = new RetentionSchedulerService(
      mockPrisma as any,
      storageService,
    );
  });

  describe('formatBytes', () => {
    it('should format bytes into appropriate units', () => {
      expect(storageService.formatBytes(0)).toBe('0 B');
      expect(storageService.formatBytes(500)).toBe('500 B');
      expect(storageService.formatBytes(1024)).toBe('1.00 KB');
      expect(storageService.formatBytes(1048576)).toBe('1.00 MB');
      expect(storageService.formatBytes(1073741824)).toBe('1.00 GB');
      expect(storageService.formatBytes(5368709120)).toBe('5.00 GB');
    });
  });

  describe('calculateCutoffDate', () => {
    it('should default to 12 months ago if no params provided', () => {
      const now = new Date();
      const cutoff = storageService.calculateCutoffDate();
      const diffMonths = (now.getFullYear() - cutoff.getFullYear()) * 12 + (now.getMonth() - cutoff.getMonth());
      expect(diffMonths).toBe(12);
    });

    it('should calculate cutoff date for custom retention months', () => {
      const now = new Date();
      const cutoff = storageService.calculateCutoffDate(6);
      const diffMonths = (now.getFullYear() - cutoff.getFullYear()) * 12 + (now.getMonth() - cutoff.getMonth());
      expect(diffMonths).toBe(6);
    });

    it('should honor beforeDate when specified', () => {
      const specificDate = '2025-01-01T00:00:00.000Z';
      const cutoff = storageService.calculateCutoffDate(12, specificDate);
      expect(cutoff.toISOString()).toBe(specificDate);
    });
  });

  describe('getMetrics', () => {
    it('should return complete storage metrics', () => {
      mockRepo.getPhysicalTableSizes.mockResolvedValue({
        totalBytes: 52428800, // 50 MB
        tableBytes: 10485760, // 10 MB
        indexBytes: 5242880,  // 5 MB
        toastBytes: 36700160, // 35 MB
      });

      mockRepo.getLogicalStats.mockResolvedValue({
        totalMessages: 25000,
        textContentBytes: 5000000,
        rawPayloadBytes: 35000000,
        attachmentsBytes: 2000000,
      });

      mockRepo.getChannelBreakdown.mockResolvedValue([
        { channel: Channel.ZALO, messageCount: 15000, estimatedBytes: 30000000 },
        { channel: Channel.FACEBOOK, messageCount: 8000, estimatedBytes: 18000000 },
        { channel: Channel.TIKTOK, messageCount: 1500, estimatedBytes: 3000000 },
        { channel: Channel.MANUAL_IMPORT, messageCount: 500, estimatedBytes: 1428800 },
      ]);

      mockRepo.getAgeBreakdown.mockResolvedValue({
        lessThan30Days: { count: 10000, estimatedBytes: 20000000 },
        oneToSixMonths: { count: 8000, estimatedBytes: 16000000 },
        sixToTwelveMonths: { count: 5000, estimatedBytes: 10000000 },
        olderThan12Months: { count: 2000, estimatedBytes: 6428800 },
      });

      mockWorkspaceConfigService.getConfig.mockResolvedValue({
        terminology: {
          messageRetentionPolicy: {
            enabled: true,
            retentionMonths: 12,
            autoCleanupEnabled: true,
            slimPayloadOnly: false,
          },
        },
      });

      return storageService.getMetrics('ws-1').then((metrics) => {
        expect(metrics.totalMessages).toBe(25000);
        expect(metrics.totalSizeBytes).toBe(52428800);
        expect(metrics.totalSizeFormatted).toBe('50.00 MB');
        expect(metrics.toastSizeBytes).toBe(36700160);
        expect(metrics.channelBreakdown).toHaveLength(4);
        expect(metrics.ageBreakdown.olderThan12Months.count).toBe(2000);
        expect(metrics.retentionPolicy.retentionMonths).toBe(12);
      });
    });
  });

  describe('estimatePurge (Dry Run)', () => {
    it('should calculate estimated purge impacts without modifying database', async () => {
      const earliest = new Date('2024-01-01');
      const latest = new Date('2025-01-01');

      mockRepo.estimatePurge.mockResolvedValue({
        matchedCount: 3500,
        estimatedFreedBytes: 15728640, // 15 MB
        earliestDate: earliest,
        latestDate: latest,
      });

      const response = await storageService.estimatePurge({
        workspaceId: 'ws-1',
        retentionMonths: 12,
        slimPayloadOnly: false,
      });

      expect(response.matchedMessagesCount).toBe(3500);
      expect(response.estimatedFreedBytes).toBe(15728640);
      expect(response.estimatedFreedFormatted).toBe('15.00 MB');
      expect(response.earliestMessageDate).toBe(earliest.toISOString());
      expect(response.latestMessageDate).toBe(latest.toISOString());
      expect(mockRepo.executeChunkedPurge).not.toHaveBeenCalled();
    });
  });

  describe('purgeMessages', () => {
    it('should execute purge in chunks, record audit event, and update policy stats', async () => {
      mockRepo.executeChunkedPurge.mockResolvedValue({
        deletedCount: 1200,
        slimmedCount: 0,
        freedBytes: 10485760, // 10 MB
      });
      mockRepo.cleanEmptyConversations.mockResolvedValue(5);

      mockWorkspaceConfigService.getConfig.mockResolvedValue({
        terminology: {
          messageRetentionPolicy: {
            enabled: true,
            retentionMonths: 12,
          },
        },
      });

      const res = await storageService.purgeMessages(
        {
          workspaceId: 'ws-1',
          retentionMonths: 12,
          slimPayloadOnly: false,
          cleanEmptyConversations: true,
        },
        'MANUAL',
        'user-admin-1',
      );

      expect(res.success).toBe(true);
      expect(res.deletedMessagesCount).toBe(1200);
      expect(res.cleanedConversationsCount).toBe(5);
      expect(res.freedSizeFormatted).toBe('10.00 MB');
      expect(mockAuditService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.MESSAGE_STORAGE_PURGED,
          userId: 'user-admin-1',
        }),
      );
      expect(mockWorkspaceConfigService.updateConfig).toHaveBeenCalled();
    });
  });

  describe('RetentionSchedulerService', () => {
    it('should run daily automated retention on active workspaces', async () => {
      mockPrisma.workspace.findMany.mockResolvedValue([
        { id: 'ws-1', name: 'Khoa CNTT' },
        { id: 'ws-2', name: 'Khoa Ngoại Ngữ' },
      ]);

      mockWorkspaceConfigService.getConfig.mockResolvedValue({
        terminology: {
          messageRetentionPolicy: {
            enabled: true,
            retentionMonths: 12,
            autoCleanupEnabled: true,
            slimPayloadOnly: false,
          },
        },
      });

      mockRepo.executeChunkedPurge.mockResolvedValue({
        deletedCount: 500,
        slimmedCount: 0,
        freedBytes: 5242880,
      });
      mockRepo.cleanEmptyConversations.mockResolvedValue(2);

      await schedulerService.handleDailyMessageRetention();

      // Should have processed both workspaces + 1 global pass
      expect(mockRepo.executeChunkedPurge).toHaveBeenCalled();
    });

    it('should support manual trigger of retention process', async () => {
      mockWorkspaceConfigService.getConfig.mockResolvedValue({
        terminology: {
          messageRetentionPolicy: {
            enabled: true,
            retentionMonths: 12,
            autoCleanupEnabled: true,
            slimPayloadOnly: false,
          },
        },
      });

      mockRepo.executeChunkedPurge.mockResolvedValue({
        deletedCount: 200,
        slimmedCount: 0,
        freedBytes: 2048000,
      });

      const res = await schedulerService.triggerRetentionNow('ws-1', 'admin-id');
      expect(res.deletedMessagesCount).toBe(200);
      expect(res.executionType).toBe('MANUAL');
    });
  });
});
