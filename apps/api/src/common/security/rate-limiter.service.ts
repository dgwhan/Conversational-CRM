import { Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { RedisService } from '../../platform/redis/redis.service.js';

/**
 * Sliding window log trên Redis (ZSET), nguyên tử bằng Lua để nhiều instance dùng chung một bộ đếm.
 * Trả về {allowed(0/1), count, oldestTimestampMs}.
 */
const SLIDING_WINDOW_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
redis.call('ZREMRANGEBYSCORE', key, '-inf', now - ttl)
local count = redis.call('ZCARD', key)
local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
local oldestTs = now
if oldest[2] then oldestTs = tonumber(oldest[2]) end
if count >= limit then
  return {0, count, oldestTs}
end
redis.call('ZADD', key, now, ARGV[4])
redis.call('PEXPIRE', key, ttl)
return {1, count + 1, oldestTs}
`;

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetInSeconds: number;
}

interface ClientRecord {
  timestamps: number[];
  lastSeen: number;
}

/**
 * Service quản lý Rate Limiting sử dụng thuật toán Sliding Window Log.
 * - Có Redis (REDIS_URL): bộ đếm dùng chung giữa các instance -> scale ngang được (consume()).
 * - Không có Redis hoặc Redis lỗi: lùi về bộ nhớ tiến trình (checkLimit()).
 * Tối ưu hiệu năng cao (O(1) amortized), tự động dọn dẹp các IP hết hạn định kỳ
 * để ngăn chặn rò rỉ bộ nhớ (Memory Leak) và chống tấn công DDoS/Brute-force.
 */
@Injectable()
export class RateLimiterService implements OnModuleDestroy {
  private readonly records = new Map<string, ClientRecord>();
  private readonly cleanupTimer: NodeJS.Timeout;
  private readonly logger = new Logger(RateLimiterService.name);

  constructor(@Optional() private readonly redis?: RedisService) {
    // Dọn dẹp các IP đã quá hạn sau mỗi 60 giây
    this.cleanupTimer = setInterval(() => this.cleanupExpiredRecords(), 60_000);
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Kiểm tra và ghi nhận lượt truy cập, dùng Redis nếu có (đúng khi chạy nhiều instance).
   */
  async consume(key: string, limit: number = 120, ttlMs: number = 60_000): Promise<RateLimitResult> {
    const client = this.redis?.client;
    if (!client) {
      return this.checkLimit(key, limit, ttlMs);
    }

    try {
      const now = Date.now();
      const [allowed, count, oldestTs] = (await client.eval(
        SLIDING_WINDOW_SCRIPT,
        1,
        `ratelimit:${key}`,
        String(now),
        String(ttlMs),
        String(limit),
        `${now}-${randomUUID()}`,
      )) as [number, number, number];

      return {
        allowed: allowed === 1,
        limit,
        remaining: allowed === 1 ? Math.max(0, limit - count) : 0,
        resetInSeconds: Math.max(1, Math.ceil((Number(oldestTs) + ttlMs - now) / 1000)),
      };
    } catch (err) {
      this.logger.warn(`Redis rate limiter unavailable, falling back to in-memory: ${(err as Error).message}`);
      return this.checkLimit(key, limit, ttlMs);
    }
  }

  /**
   * Kiểm tra và ghi nhận lượt truy cập của client (bộ nhớ tiến trình, chỉ đúng với 1 instance)
   * @param key Khóa định danh client (ví dụ: client IP + route identifier)
   * @param limit Số lượng request tối đa trong cửa sổ thời gian
   * @param ttlMs Độ dài cửa sổ thời gian (milliseconds), mặc định 60,000ms (1 phút)
   */
  checkLimit(key: string, limit: number = 120, ttlMs: number = 60_000): RateLimitResult {
    const now = Date.now();
    const windowStart = now - ttlMs;

    let record = this.records.get(key);
    if (!record) {
      record = { timestamps: [], lastSeen: now };
      this.records.set(key, record);
    }

    record.lastSeen = now;

    // Loại bỏ các request đã nằm ngoài cửa sổ sliding window
    const validTimestamps = record.timestamps.filter((ts) => ts > windowStart);
    record.timestamps = validTimestamps;

    const currentCount = validTimestamps.length;
    const oldestTimestamp = validTimestamps[0] ?? now;
    const resetInSeconds = Math.max(1, Math.ceil((oldestTimestamp + ttlMs - now) / 1000));

    if (currentCount >= limit) {
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetInSeconds,
      };
    }

    // Ghi nhận request hiện tại
    record.timestamps.push(now);

    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - record.timestamps.length),
      resetInSeconds,
    };
  }

  /**
   * Xóa sạch các bản ghi đã quá thời gian lưu vết để giải phóng RAM
   */
  cleanupExpiredRecords(maxAgeMs: number = 120_000): void {
    const now = Date.now();
    for (const [key, record] of this.records.entries()) {
      if (now - record.lastSeen > maxAgeMs) {
        this.records.delete(key);
      }
    }
  }

  /**
   * Reset thủ công (dùng cho unit test hoặc admin unblock)
   */
  reset(key?: string): void {
    if (key) {
      this.records.delete(key);
    } else {
      this.records.clear();
    }
  }

  onModuleDestroy(): void {
    clearInterval(this.cleanupTimer);
  }
}
