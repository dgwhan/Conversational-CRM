import { Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis, type RedisOptions } from 'ioredis';

/**
 * Kết nối Redis dùng chung cho: hàng đợi BullMQ, rate limiter, presence, pub/sub realtime và khóa phân tán.
 *
 * - Có REDIS_URL: mọi trạng thái dùng chung được lưu ở Redis nên chạy được nhiều instance.
 * - Không có REDIS_URL (chỉ cho phép ở development/test): các service tự lùi về bộ nhớ tiến trình,
 *   tức là CHỈ an toàn khi chạy đúng 1 instance. Production bắt buộc REDIS_URL (xem env.schema.ts).
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly url: string | undefined;
  private sharedClient: Redis | null = null;
  private readonly connections = new Set<Redis>();

  constructor(@Optional() configService?: ConfigService) {
    const configured = configService?.get<string>('REDIS_URL') ?? process.env.REDIS_URL;
    this.url = configured && configured.trim() ? configured.trim() : undefined;
  }

  get enabled(): boolean {
    return Boolean(this.url);
  }

  /** Client dùng chung cho lệnh thường (GET/SET/EVAL...). Trả null khi không cấu hình Redis. */
  get client(): Redis | null {
    if (!this.url) return null;
    if (!this.sharedClient) {
      this.sharedClient = this.createConnection({ maxRetriesPerRequest: 3 });
    }
    return this.sharedClient;
  }

  /**
   * Tạo một kết nối riêng (subscriber pub/sub, worker BullMQ cần kết nối blocking riêng).
   * Kết nối được đóng tự động khi ứng dụng tắt.
   */
  createConnection(options: RedisOptions = {}): Redis {
    if (!this.url) {
      throw new Error('REDIS_URL chưa được cấu hình');
    }
    const connection = new Redis(this.url, { lazyConnect: false, ...options });
    connection.on('error', (err) => {
      this.logger.warn(`Redis connection error: ${err.message}`);
    });
    this.connections.add(connection);
    return connection;
  }

  async onModuleDestroy(): Promise<void> {
    const closing = Array.from(this.connections).map(async (connection) => {
      try {
        await connection.quit();
      } catch {
        connection.disconnect();
      }
    });
    await Promise.allSettled(closing);
    this.connections.clear();
    this.sharedClient = null;
  }
}
