import { Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Queue, Worker, type Job } from "bullmq";
import { normalizeInboundJob } from "../domain/channel-adapter.port.js";
import type { InboundJobData, InboundMessageQueue } from "../domain/channel-adapter.port.js";
import type { InboundJobHandler } from "../application/inbound-job.handler.js";
import type { RedisService } from "../../../platform/redis/redis.service.js";

export const INBOUND_MESSAGES_QUEUE = 'inbound-messages';
export const MESSAGE_RECEIVED_JOB = 'message.received';

export interface BullMqInboundQueueOptions {
    /** Instance này có chạy worker không (có thể tách instance chỉ nhận webhook và instance chỉ chạy worker). */
    workerEnabled: boolean;
    concurrency: number;
}

/**
 * Hàng đợi inbound bền vững trên Redis (BullMQ):
 * - Webhook chỉ ghi DB + addBulk rồi trả 200 ngay, không xử lý trong request.
 * - jobId = messageId: enqueue lặp lại (webhook gửi lại, sweeper) không tạo job trùng khi job còn tồn tại.
 * - Lỗi trong worker được BullMQ retry với backoff lũy thừa; job lỗi hẳn được giữ lại để điều tra.
 */
export class BullMqInboundQueue implements InboundMessageQueue, OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(BullMqInboundQueue.name);
    private readonly queue: Queue<InboundJobData>;
    private worker: Worker<InboundJobData> | null = null;

    constructor(
        private readonly redis: RedisService,
        private readonly handler: InboundJobHandler,
        private readonly options: BullMqInboundQueueOptions,
    ) {
        this.queue = new Queue<InboundJobData>(INBOUND_MESSAGES_QUEUE, {
            connection: this.redis.createConnection({ maxRetriesPerRequest: 3 }),
        });
    }

    onModuleInit(): void {
        if (!this.options.workerEnabled) {
            this.logger.log('Inbound worker disabled on this instance (INBOUND_WORKER_ENABLED=false)');
            return;
        }

        this.worker = new Worker<InboundJobData>(
            INBOUND_MESSAGES_QUEUE,
            async (job: Job<InboundJobData>) => {
                await this.handler.handle(job.data, { firstAttempt: job.attemptsMade === 0 });
            },
            {
                // Worker dùng lệnh blocking: bắt buộc maxRetriesPerRequest = null
                connection: this.redis.createConnection({ maxRetriesPerRequest: null }),
                concurrency: this.options.concurrency,
            },
        );
        this.worker.on('failed', (job, err) => {
            this.logger.error(
                `Inbound job #${job?.id} failed (attempt ${job?.attemptsMade ?? '?'}): ${err.message}`,
            );
        });
        this.worker.on('error', (err) => this.logger.error(`Inbound worker error: ${err.message}`));
        this.logger.log(`Inbound worker started (concurrency=${this.options.concurrency})`);
    }

    async enqueue(jobs: ReadonlyArray<string | InboundJobData>): Promise<void> {
        if (jobs.length === 0) return;
        await this.queue.addBulk(
            jobs.map(normalizeInboundJob).map((data) => ({
                name: MESSAGE_RECEIVED_JOB,
                data,
                opts: {
                    jobId: data.messageId,
                    attempts: 5,
                    backoff: { type: 'exponential', delay: 2000 },
                    removeOnComplete: true,
                    removeOnFail: { age: 7 * 24 * 3600 },
                },
            })),
        );
    }

    async onModuleDestroy(): Promise<void> {
        await this.worker?.close();
        await this.queue.close();
    }
}
