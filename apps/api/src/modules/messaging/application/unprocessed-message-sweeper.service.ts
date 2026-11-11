import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { INBOUND_QUEUE, type InboundMessageQueue } from '../domain/channel-adapter.port.js';
import { MessageRepository } from '../infrastructure/message.repository.js';
import { DistributedLockService } from '../../../platform/redis/distributed-lock.service.js';

/** Tin chưa xử lý quá lâu hơn ngưỡng này mới được coi là "bị rơi" (enqueue lỗi, tiến trình chết...). */
const STALE_AFTER_MS = 2 * 60_000;

/**
 * Lưới an toàn cho hàng đợi inbound: mỗi phút tìm các tin INBOUND còn processed_at = null quá 2 phút
 * và đưa lại vào hàng đợi. Có khóa phân tán nên khi chạy nhiều instance chỉ một instance quét.
 */
@Injectable()
export class UnprocessedMessageSweeper {
  private readonly logger = new Logger(UnprocessedMessageSweeper.name);

  constructor(
    private readonly messages: MessageRepository,
    @Inject(INBOUND_QUEUE) private readonly queue: InboundMessageQueue,
    @Optional() private readonly locks?: DistributedLockService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: 'sweep-unprocessed-inbound-messages' })
  async sweep(): Promise<number> {
    const run = async (): Promise<number> => {
      const ids = await this.messages.findStaleUnprocessedIds(STALE_AFTER_MS);
      if (ids.length === 0) return 0;
      await this.queue.enqueue(ids);
      this.logger.warn(`Re-enqueued ${ids.length} unprocessed inbound message(s)`);
      return ids.length;
    };

    try {
      const result = this.locks
        ? await this.locks.runExclusive('cron:sweep-unprocessed-inbound', 55_000, run)
        : await run();
      return result ?? 0;
    } catch (err) {
      this.logger.error(`Sweep of unprocessed messages failed: ${(err as Error).message}`);
      return 0;
    }
  }
}
