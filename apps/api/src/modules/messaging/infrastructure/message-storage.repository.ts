import { Injectable, Logger, Optional } from '@nestjs/common';
import { Channel, Prisma } from '@prisma/client';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import { MediaArchiveService } from '../application/media-archive.service.js';

export interface PhysicalTableSizes {
  totalBytes: number;
  tableBytes: number;
  indexBytes: number;
  toastBytes: number;
}

export interface LogicalMessageStats {
  totalMessages: number;
  textContentBytes: number;
  rawPayloadBytes: number;
  attachmentsBytes: number;
}

export interface ChannelStat {
  channel: Channel;
  messageCount: number;
  estimatedBytes: number;
}

export interface AgeGroupCount {
  lessThan30Days: { count: number; estimatedBytes: number };
  oneToSixMonths: { count: number; estimatedBytes: number };
  sixToTwelveMonths: { count: number; estimatedBytes: number };
  olderThan12Months: { count: number; estimatedBytes: number };
}

export interface PurgeOptions {
  workspaceId?: string;
  cutoffDate: Date;
  slimPayloadOnly?: boolean;
  channel?: Channel;
  onlyResolvedConversations?: boolean;
  batchSize?: number;
}

/**
 * Điều kiện lọc dùng chung cho các truy vấn dọn dẹp tin nhắn.
 * Mọi giá trị đều là THAM SỐ (Prisma.sql), không ghép chuỗi vào câu SQL.
 */
function purgeFilters(options: Pick<PurgeOptions, 'channel' | 'onlyResolvedConversations' | 'workspaceId'>): Prisma.Sql {
  const parts: Prisma.Sql[] = [];
  if (options.channel) parts.push(Prisma.sql`AND m.channel::text = ${options.channel}`);
  if (options.onlyResolvedConversations) parts.push(Prisma.sql`AND c.status = 'RESOLVED'`);
  if (options.workspaceId) parts.push(Prisma.sql`AND ca.workspace_id = ${options.workspaceId}::uuid`);
  return parts.length > 0 ? Prisma.join(parts, ' ') : Prisma.empty;
}

@Injectable()
export class MessageStorageRepository {
  private readonly logger = new Logger(MessageStorageRepository.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly media?: MediaArchiveService,
  ) {}

  /**
   * Lấy dung lượng vật lý thực tế từ PostgreSQL (table, index, TOAST)
   */
  async getPhysicalTableSizes(): Promise<PhysicalTableSizes> {
    try {
      const result = await this.prisma.$queryRaw<
        Array<{
          total_size: bigint | number;
          table_size: bigint | number;
          index_size: bigint | number;
        }>
      >`
        SELECT
          pg_total_relation_size('messages') AS total_size,
          pg_relation_size('messages') AS table_size,
          pg_indexes_size('messages') AS index_size
      `;

      if (result && result.length > 0) {
        const total = Number(result[0].total_size || 0);
        const table = Number(result[0].table_size || 0);
        const index = Number(result[0].index_size || 0);
        const toast = Math.max(0, total - table - index);
        return {
          totalBytes: total,
          tableBytes: table,
          indexBytes: index,
          toastBytes: toast,
        };
      }
    } catch (error) {
      this.logger.warn(`Could not query pg relation sizes (non-postgres or permission): ${(error as Error).message}`);
    }

    return {
      totalBytes: 0,
      tableBytes: 0,
      indexBytes: 0,
      toastBytes: 0,
    };
  }

  /**
   * Thống kê kích thước logic theo các cột (content, raw_payload, attachments)
   */
  async getLogicalStats(workspaceId?: string): Promise<LogicalMessageStats> {
    try {
      let result: Array<{
        total_count: bigint | number;
        content_bytes: bigint | number;
        raw_payload_bytes: bigint | number;
        attachments_bytes: bigint | number;
      }>;

      if (workspaceId) {
        result = await this.prisma.$queryRaw`
          SELECT
            COUNT(*)::bigint AS total_count,
            COALESCE(SUM(pg_column_size(m.content)), 0)::bigint AS content_bytes,
            COALESCE(SUM(pg_column_size(m.raw_payload)), 0)::bigint AS raw_payload_bytes,
            COALESCE(SUM(pg_column_size(m.attachments)), 0)::bigint AS attachments_bytes
          FROM messages m
          INNER JOIN channel_accounts ca ON m.channel_account_id = ca.id
          WHERE ca.workspace_id = ${workspaceId}::uuid
        `;
      } else {
        result = await this.prisma.$queryRaw`
          SELECT
            COUNT(*)::bigint AS total_count,
            COALESCE(SUM(pg_column_size(content)), 0)::bigint AS content_bytes,
            COALESCE(SUM(pg_column_size(raw_payload)), 0)::bigint AS raw_payload_bytes,
            COALESCE(SUM(pg_column_size(attachments)), 0)::bigint AS attachments_bytes
          FROM messages
        `;
      }

      if (result && result.length > 0) {
        return {
          totalMessages: Number(result[0].total_count || 0),
          textContentBytes: Number(result[0].content_bytes || 0),
          rawPayloadBytes: Number(result[0].raw_payload_bytes || 0),
          attachmentsBytes: Number(result[0].attachments_bytes || 0),
        };
      }
    } catch (error) {
      this.logger.warn(`Error querying column sizes: ${(error as Error).message}`);
      // Fallback with standard count
      const total = await this.prisma.message.count();
      return {
        totalMessages: total,
        textContentBytes: total * 150,
        rawPayloadBytes: total * 1200,
        attachmentsBytes: total * 50,
      };
    }

    return { totalMessages: 0, textContentBytes: 0, rawPayloadBytes: 0, attachmentsBytes: 0 };
  }

  /**
   * Thống kê theo kênh (Zalo, Facebook, TikTok, Manual)
   */
  async getChannelBreakdown(workspaceId?: string): Promise<ChannelStat[]> {
    const channels: Channel[] = [Channel.ZALO, Channel.FACEBOOK, Channel.TIKTOK, Channel.MANUAL_IMPORT];
    try {
      let rows: Array<{
        channel: Channel;
        msg_count: bigint | number;
        est_bytes: bigint | number;
      }>;

      if (workspaceId) {
        rows = await this.prisma.$queryRaw`
          SELECT
            m.channel,
            COUNT(*)::bigint AS msg_count,
            COALESCE(SUM(pg_column_size(m.content) + pg_column_size(m.raw_payload) + COALESCE(pg_column_size(m.attachments), 0)), 0)::bigint AS est_bytes
          FROM messages m
          INNER JOIN channel_accounts ca ON m.channel_account_id = ca.id
          WHERE ca.workspace_id = ${workspaceId}::uuid
          GROUP BY m.channel
        `;
      } else {
        rows = await this.prisma.$queryRaw`
          SELECT
            channel,
            COUNT(*)::bigint AS msg_count,
            COALESCE(SUM(pg_column_size(content) + pg_column_size(raw_payload) + COALESCE(pg_column_size(attachments), 0)), 0)::bigint AS est_bytes
          FROM messages
          GROUP BY channel
        `;
      }

      const map = new Map<Channel, ChannelStat>();
      for (const row of rows) {
        map.set(row.channel, {
          channel: row.channel,
          messageCount: Number(row.msg_count || 0),
          estimatedBytes: Number(row.est_bytes || 0),
        });
      }

      return channels.map((ch) => map.get(ch) || { channel: ch, messageCount: 0, estimatedBytes: 0 });
    } catch (error) {
      this.logger.warn(`Error getting channel breakdown: ${(error as Error).message}`);
      return channels.map((ch) => ({ channel: ch, messageCount: 0, estimatedBytes: 0 }));
    }
  }

  /**
   * Thống kê theo độ tuổi dữ liệu (<30d, 1-6m, 6-12m, >12m)
   */
  async getAgeBreakdown(workspaceId?: string): Promise<AgeGroupCount> {
    try {
      let rows: Array<{
        lt_30d_count: bigint | number;
        lt_30d_bytes: bigint | number;
        one_to_six_m_count: bigint | number;
        one_to_six_m_bytes: bigint | number;
        six_to_twelve_m_count: bigint | number;
        six_to_twelve_m_bytes: bigint | number;
        gt_12m_count: bigint | number;
        gt_12m_bytes: bigint | number;
      }>;

      if (workspaceId) {
        rows = await this.prisma.$queryRaw`
          SELECT
            COUNT(*) FILTER (WHERE m.sent_at >= NOW() - INTERVAL '30 days')::bigint AS lt_30d_count,
            COALESCE(SUM(pg_column_size(m.content) + pg_column_size(m.raw_payload)) FILTER (WHERE m.sent_at >= NOW() - INTERVAL '30 days'), 0)::bigint AS lt_30d_bytes,

            COUNT(*) FILTER (WHERE m.sent_at < NOW() - INTERVAL '30 days' AND m.sent_at >= NOW() - INTERVAL '6 months')::bigint AS one_to_six_m_count,
            COALESCE(SUM(pg_column_size(m.content) + pg_column_size(m.raw_payload)) FILTER (WHERE m.sent_at < NOW() - INTERVAL '30 days' AND m.sent_at >= NOW() - INTERVAL '6 months'), 0)::bigint AS one_to_six_m_bytes,

            COUNT(*) FILTER (WHERE m.sent_at < NOW() - INTERVAL '6 months' AND m.sent_at >= NOW() - INTERVAL '12 months')::bigint AS six_to_twelve_m_count,
            COALESCE(SUM(pg_column_size(m.content) + pg_column_size(m.raw_payload)) FILTER (WHERE m.sent_at < NOW() - INTERVAL '6 months' AND m.sent_at >= NOW() - INTERVAL '12 months'), 0)::bigint AS six_to_twelve_m_bytes,

            COUNT(*) FILTER (WHERE m.sent_at < NOW() - INTERVAL '12 months')::bigint AS gt_12m_count,
            COALESCE(SUM(pg_column_size(m.content) + pg_column_size(m.raw_payload)) FILTER (WHERE m.sent_at < NOW() - INTERVAL '12 months'), 0)::bigint AS gt_12m_bytes
          FROM messages m
          INNER JOIN channel_accounts ca ON m.channel_account_id = ca.id
          WHERE ca.workspace_id = ${workspaceId}::uuid
        `;
      } else {
        rows = await this.prisma.$queryRaw`
          SELECT
            COUNT(*) FILTER (WHERE sent_at >= NOW() - INTERVAL '30 days')::bigint AS lt_30d_count,
            COALESCE(SUM(pg_column_size(content) + pg_column_size(raw_payload)) FILTER (WHERE sent_at >= NOW() - INTERVAL '30 days'), 0)::bigint AS lt_30d_bytes,

            COUNT(*) FILTER (WHERE sent_at < NOW() - INTERVAL '30 days' AND sent_at >= NOW() - INTERVAL '6 months')::bigint AS one_to_six_m_count,
            COALESCE(SUM(pg_column_size(content) + pg_column_size(raw_payload)) FILTER (WHERE sent_at < NOW() - INTERVAL '30 days' AND sent_at >= NOW() - INTERVAL '6 months'), 0)::bigint AS one_to_six_m_bytes,

            COUNT(*) FILTER (WHERE sent_at < NOW() - INTERVAL '6 months' AND sent_at >= NOW() - INTERVAL '12 months')::bigint AS six_to_twelve_m_count,
            COALESCE(SUM(pg_column_size(content) + pg_column_size(raw_payload)) FILTER (WHERE sent_at < NOW() - INTERVAL '6 months' AND sent_at >= NOW() - INTERVAL '12 months'), 0)::bigint AS six_to_twelve_m_bytes,

            COUNT(*) FILTER (WHERE sent_at < NOW() - INTERVAL '12 months')::bigint AS gt_12m_count,
            COALESCE(SUM(pg_column_size(content) + pg_column_size(raw_payload)) FILTER (WHERE sent_at < NOW() - INTERVAL '12 months'), 0)::bigint AS gt_12m_bytes
          FROM messages
        `;
      }

      if (rows && rows.length > 0) {
        const r = rows[0];
        return {
          lessThan30Days: { count: Number(r.lt_30d_count || 0), estimatedBytes: Number(r.lt_30d_bytes || 0) },
          oneToSixMonths: { count: Number(r.one_to_six_m_count || 0), estimatedBytes: Number(r.one_to_six_m_bytes || 0) },
          sixToTwelveMonths: { count: Number(r.six_to_twelve_m_count || 0), estimatedBytes: Number(r.six_to_twelve_m_bytes || 0) },
          olderThan12Months: { count: Number(r.gt_12m_count || 0), estimatedBytes: Number(r.gt_12m_bytes || 0) },
        };
      }
    } catch (error) {
      this.logger.warn(`Error getting age breakdown: ${(error as Error).message}`);
    }

    return {
      lessThan30Days: { count: 0, estimatedBytes: 0 },
      oneToSixMonths: { count: 0, estimatedBytes: 0 },
      sixToTwelveMonths: { count: 0, estimatedBytes: 0 },
      olderThan12Months: { count: 0, estimatedBytes: 0 },
    };
  }

  /**
   * Ước tính trước số lượng và dung lượng tin nhắn sẽ bị xóa (Dry Run)
   */
  async estimatePurge(options: PurgeOptions): Promise<{
    matchedCount: number;
    estimatedFreedBytes: number;
    earliestDate: Date | null;
    latestDate: Date | null;
  }> {
    const { cutoffDate, slimPayloadOnly } = options;

    try {
      const freedBytesSql = slimPayloadOnly
        ? Prisma.sql`COALESCE(SUM(pg_column_size(m.raw_payload)), 0)::bigint AS freed_bytes,`
        : Prisma.sql`COALESCE(SUM(pg_column_size(m.content) + pg_column_size(m.raw_payload) + COALESCE(pg_column_size(m.attachments), 0) + 64), 0)::bigint AS freed_bytes,`;

      const result = await this.prisma.$queryRaw<
        Array<{
          matched_count: bigint | number;
          freed_bytes: bigint | number;
          earliest_date: Date | string | null;
          latest_date: Date | string | null;
        }>
      >(Prisma.sql`
        SELECT
          COUNT(m.id)::bigint AS matched_count,
          ${freedBytesSql}
          MIN(m.sent_at) AS earliest_date,
          MAX(m.sent_at) AS latest_date
        FROM messages m
        INNER JOIN channel_accounts ca ON m.channel_account_id = ca.id
        LEFT JOIN conversations c ON m.conversation_id = c.id
        WHERE m.sent_at < ${cutoffDate}
        ${purgeFilters(options)}
      `);

      if (result && result.length > 0) {
        return {
          matchedCount: Number(result[0].matched_count || 0),
          estimatedFreedBytes: Number(result[0].freed_bytes || 0),
          earliestDate: result[0].earliest_date ? new Date(result[0].earliest_date) : null,
          latestDate: result[0].latest_date ? new Date(result[0].latest_date) : null,
        };
      }
    } catch (error) {
      this.logger.error(`Error estimating purge: ${(error as Error).message}`);
    }

    return { matchedCount: 0, estimatedFreedBytes: 0, earliestDate: null, latestDate: null };
  }

  /**
   * Xóa hoặc tinh gọn tin nhắn theo từng mẻ nhỏ (Batch Deletion) để chống lock bảng và tràn WAL
   */
  async executeChunkedPurge(options: PurgeOptions): Promise<{
    deletedCount: number;
    slimmedCount: number;
    freedBytes: number;
  }> {
    const { cutoffDate, slimPayloadOnly, batchSize: requestedBatchSize = 1000 } = options;
    const batchSize = Math.min(Math.max(1, Math.trunc(Number(requestedBatchSize) || 1000)), 10_000);
    const filters = purgeFilters(options);

    let totalDeleted = 0;
    let totalSlimmed = 0;
    let totalFreedBytes = 0;

    while (true) {
      if (slimPayloadOnly) {
        // Chỉ dọn dẹp raw_payload nếu chưa rỗng
        const batch = await this.prisma.$queryRaw<Array<{ id: string; payload_bytes: number }>>(Prisma.sql`
          SELECT m.id, pg_column_size(m.raw_payload) as payload_bytes
          FROM messages m
          INNER JOIN channel_accounts ca ON m.channel_account_id = ca.id
          LEFT JOIN conversations c ON m.conversation_id = c.id
          WHERE m.sent_at < ${cutoffDate}
            AND m.raw_payload::text != '{}'
            ${filters}
          LIMIT ${batchSize}
        `);

        if (!batch || batch.length === 0) {
          break;
        }

        const ids = batch.map((b) => b.id);
        const batchFreed = batch.reduce((acc, curr) => acc + (Number(curr.payload_bytes) || 0), 0);

        await this.prisma.$executeRaw`
          UPDATE messages
          SET raw_payload = '{}'::jsonb
          WHERE id = ANY(${ids}::uuid[])
        `;

        totalSlimmed += ids.length;
        totalFreedBytes += batchFreed;
      } else {
        // Xóa hoàn toàn bản ghi
        const batch = await this.prisma.$queryRaw<Array<{ id: string; total_bytes: number }>>(Prisma.sql`
          SELECT m.id, (pg_column_size(m.content) + pg_column_size(m.raw_payload) + COALESCE(pg_column_size(m.attachments), 0) + 64) as total_bytes
          FROM messages m
          INNER JOIN channel_accounts ca ON m.channel_account_id = ca.id
          LEFT JOIN conversations c ON m.conversation_id = c.id
          WHERE m.sent_at < ${cutoffDate}
            ${filters}
          LIMIT ${batchSize}
        `);

        if (!batch || batch.length === 0) {
          break;
        }

        const ids = batch.map((b) => b.id);
        const batchFreed = batch.reduce((acc, curr) => acc + (Number(curr.total_bytes) || 0), 0);

        // Xóa bản sao media trong object storage trước, tránh để lại tệp mồ côi
        await this.media?.deleteMediaForMessages({ id: { in: ids } }).catch((err: Error) =>
          this.logger.warn(`Không xóa được media của lô tin bị purge: ${err.message}`),
        );

        await this.prisma.$executeRaw`
          DELETE FROM messages
          WHERE id = ANY(${ids}::uuid[])
        `;

        totalDeleted += ids.length;
        totalFreedBytes += batchFreed;
      }

      this.logger.debug(
        `Purged batch of ${batchSize} records: deleted=${totalDeleted}, slimmed=${totalSlimmed}`,
      );

      // Nghỉ ngắn để nhường I/O và lock cho các giao dịch khác
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    return {
      deletedCount: totalDeleted,
      slimmedCount: totalSlimmed,
      freedBytes: totalFreedBytes,
    };
  }

  /**
   * Dọn dẹp các hội thoại mồ côi (không còn tin nhắn và đã được đánh dấu RESOLVED)
   */
  async cleanEmptyConversations(workspaceId?: string): Promise<number> {
    try {
      const wsFilter = workspaceId ? Prisma.sql`AND c.workspace_id = ${workspaceId}::uuid` : Prisma.empty;
      const deleted = await this.prisma.$executeRaw(Prisma.sql`
        DELETE FROM conversations c
        WHERE c.status = 'RESOLVED'
          AND NOT EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id)
          ${wsFilter}
      `);
      return Number(deleted || 0);
    } catch (error) {
      this.logger.warn(`Error cleaning empty conversations: ${(error as Error).message}`);
      return 0;
    }
  }
}
