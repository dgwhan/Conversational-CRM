import { Injectable, Logger, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { RedisService } from './redis.service.js';

const RELEASE_SCRIPT = `
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('del', KEYS[1])
end
return 0`;

/**
 * Khóa phân tán cho cron job: khi chạy nhiều instance, chỉ instance giành được khóa mới chạy tác vụ.
 * Không có Redis thì lùi về khóa trong tiến trình (chỉ đúng khi chạy 1 instance).
 */
@Injectable()
export class DistributedLockService {
  private readonly logger = new Logger(DistributedLockService.name);
  private readonly localLocks = new Set<string>();

  constructor(@Optional() private readonly redis?: RedisService) {}

  /**
   * Chạy `task` nếu giành được khóa `name`. Trả về `undefined` (và không chạy) nếu instance khác đang giữ khóa.
   * `ttlMs` là thời gian giữ khóa tối đa, phải lớn hơn thời gian chạy dự kiến của tác vụ.
   */
  async runExclusive<T>(name: string, ttlMs: number, task: () => Promise<T>): Promise<T | undefined> {
    const client = this.redis?.client;
    if (!client) {
      if (this.localLocks.has(name)) return undefined;
      this.localLocks.add(name);
      try {
        return await task();
      } finally {
        this.localLocks.delete(name);
      }
    }

    const key = `lock:${name}`;
    const token = randomUUID();
    const acquired = await client.set(key, token, 'PX', ttlMs, 'NX');
    if (acquired !== 'OK') {
      this.logger.debug(`Lock "${name}" đang được instance khác giữ, bỏ qua lần chạy này.`);
      return undefined;
    }

    try {
      return await task();
    } finally {
      try {
        await client.eval(RELEASE_SCRIPT, 1, key, token);
      } catch (err) {
        this.logger.warn(`Không nhả được lock "${name}": ${(err as Error).message}`);
      }
    }
  }
}
