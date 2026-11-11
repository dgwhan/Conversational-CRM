import { Logger, OnModuleDestroy } from "@nestjs/common";
import { normalizeInboundJob } from "../domain/channel-adapter.port.js";
import type { InboundJobData, InboundMessageQueue } from "../domain/channel-adapter.port.js";
import type { InboundJobHandler } from "../application/inbound-job.handler.js";

/**
 * Hàng đợi trong tiến trình, CHỈ dùng khi không cấu hình REDIS_URL (development / test).
 * - enqueue() trả về ngay; job chạy nền (không chặn request webhook).
 * - Không bền vững: tiến trình chết thì job đang chờ mất, nhưng tin vẫn còn trong DB với processed_at = null
 *   nên UnprocessedMessageSweeper sẽ đưa lại vào hàng đợi.
 * Production bắt buộc REDIS_URL để dùng BullMqInboundQueue.
 */
export class InProcessInboundQueue implements InboundMessageQueue, OnModuleDestroy {
    private readonly logger = new Logger(InProcessInboundQueue.name);
    private readonly pending = new Set<Promise<void>>();
    private readonly queuedIds = new Set<string>();

    constructor(private readonly handler: InboundJobHandler) {}

    async enqueue(jobs: ReadonlyArray<string | InboundJobData>): Promise<void> {
        for (const job of jobs.map(normalizeInboundJob)) {
            // Giống jobId của BullMQ: không xếp trùng một tin đang chờ
            if (this.queuedIds.has(job.messageId)) continue;
            this.queuedIds.add(job.messageId);

            const task = new Promise<void>((resolve) => setImmediate(resolve))
                .then(() => this.handler.handle(job, { firstAttempt: true }))
                .catch((err) => {
                    this.logger.error(`Error processing message ${job.messageId}: ${(err as Error).message}`);
                })
                .finally(() => {
                    this.queuedIds.delete(job.messageId);
                    this.pending.delete(task);
                });
            this.pending.add(task);
        }
    }

    /** Chờ các job đang chạy xong (dùng khi tắt ứng dụng và trong test). */
    async drain(): Promise<void> {
        while (this.pending.size > 0) {
            await Promise.allSettled(Array.from(this.pending));
        }
    }

    async onModuleDestroy(): Promise<void> {
        await this.drain();
    }
}
