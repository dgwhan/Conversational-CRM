import { Injectable, Logger, Optional } from "@nestjs/common";
import type { InboundJobData } from "../domain/channel-adapter.port.js";
import { MessageRepository } from "../infrastructure/message.repository.js";
import { InboundMessageSideEffects } from "./inbound-message-side-effects.service.js";
import { ProcessMessageReceived } from "./process-message-received.usecase.js";
import { LeadRoutingService } from '../../lead-routing/index.js';

/**
 * Xử lý một job inbound (chạy trong worker, ngoài request webhook):
 *   1. Lần thử đầu tiên và có ngữ cảnh webhook: chạy tác vụ phụ (khách hàng, realtime, ngoài giờ).
 *      Không chạy lại ở các lần retry để tránh gửi trùng lời nhắn ngoài giờ / sự kiện realtime.
 *   2. ProcessMessageReceived (idempotent theo processed_at). Lỗi ở bước này được ném ra để hàng đợi retry.
 */
@Injectable()
export class InboundJobHandler {
    private readonly logger = new Logger(InboundJobHandler.name);

    constructor(
        private readonly processUseCase: ProcessMessageReceived,
        @Optional() private readonly messages?: MessageRepository,
        @Optional() private readonly sideEffects?: InboundMessageSideEffects,
        @Optional() private readonly leadRouting?: LeadRoutingService,
    ) {}

    async handle(job: InboundJobData, options: { firstAttempt: boolean }): Promise<void> {
        if (job.context && options.firstAttempt && this.sideEffects && this.messages) {
            const message = await this.messages.findById(job.messageId);
            if (message) {
                await this.sideEffects.run(
                    {
                        ...job.context,
                        sentAt: new Date(job.context.sentAt),
                        rawPayload: message.rawPayload,
                    },
                    { id: message.id, conversationId: message.conversationId ?? job.context.conversationId ?? null },
                );
            } else {
                this.logger.warn(`Message ${job.messageId} not found, skipping side effects`);
            }
        }

        await this.processUseCase.execute(job.messageId);
        if (this.messages && this.leadRouting) {
            const routeContext = await this.messages.findConversationRouteContext(job.messageId);
            if (routeContext) await this.leadRouting.routeNewConversation(routeContext.conversationId, routeContext.workspaceId);
        }
    }
}
