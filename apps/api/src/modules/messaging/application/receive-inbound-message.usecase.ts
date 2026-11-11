import { Inject, Injectable, Logger, Optional, UnauthorizedException } from "@nestjs/common";
import { INBOUND_QUEUE, toInboundEventContext } from "../domain/channel-adapter.port.js";
import type { InboundMessageQueue, RawWebhookRequest } from "../domain/channel-adapter.port.js";
import { Channel } from "../domain/channel.js";
import type { InboundEvent } from "../domain/inbound-event.js";
import { ChannelAdapterRegistry } from "./channel-adapter.registry.js";
import { MessageRepository, pairInsertedWithEvents } from "../infrastructure/message.repository.js";
import { PrismaService } from "../../../platform/database/prisma.service.js";

@Injectable()
export class ReceiveInboundMessage {
    private readonly logger = new Logger(ReceiveInboundMessage.name);

    constructor(
        private readonly adapters: ChannelAdapterRegistry,
        private readonly messages: MessageRepository,
        @Inject(INBOUND_QUEUE) private readonly queue: InboundMessageQueue,
        @Optional() private readonly prisma?: PrismaService,
    ) { }

    /**
     * Xác định workspace của từng sự kiện dựa trên ChannelAccount (channel + externalAccountId)
     * đã được một workspace kết nối. Giá trị này luôn ưu tiên hơn workspaceId trong payload.
     */
    private async attachWorkspaceFromChannelAccounts(events: InboundEvent[]): Promise<InboundEvent[]> {
        const channelAccount = this.prisma?.channelAccount;
        if (!channelAccount || typeof channelAccount.findUnique !== 'function') return events;

        const cache = new Map<string, string | null>();
        const resolved: InboundEvent[] = [];
        for (const event of events) {
            const key = `${event.channel}:${event.externalAccountId}`;
            if (!cache.has(key)) {
                try {
                    const account = await channelAccount.findUnique({
                        where: {
                            channel_externalAccountId: {
                                channel: event.channel as any,
                                externalAccountId: event.externalAccountId,
                            },
                        },
                        select: { workspaceId: true },
                    });
                    cache.set(key, account?.workspaceId ?? null);
                } catch (err) {
                    this.logger.warn(`Could not resolve workspace for channel account ${key}: ${(err as Error).message}`);
                    cache.set(key, null);
                }
            }
            const workspaceId = cache.get(key);
            resolved.push(workspaceId ? { ...event, workspaceId } : event);
        }
        return resolved;
    }

    async execute(req: RawWebhookRequest & { channel: Channel }): Promise<void> {
        const adapter = this.adapters.get(req.channel);

        if (!adapter.verifyRequest(req)) {
            throw new UnauthorizedException('Invalid webhook signature');
        }

        let events: InboundEvent[];
        try {
            events = adapter.parseEvents(req);
        } catch (err) {
            this.logger.error(`parseEvents failed on ${req.channel}`, err as Error);
            return;
        }

        if (events.length === 0) return;

        // Gắn workspace theo ChannelAccount đã được workspace kết nối (nguồn tin cậy), không lấy từ payload
        events = await this.attachWorkspaceFromChannelAccounts(events);

        const created = await this.messages.insertManyIgnoreDuplicate(events);
        if (created.length === 0) return;

        // Ghép theo (channel, externalMessageId), KHÔNG theo chỉ số: tin trùng đã bị bỏ qua nên created[i] != events[i].
        // Toàn bộ việc nặng (đồng bộ khách hàng, realtime, ngoài giờ, phân loại) do worker của hàng đợi xử lý.
        const jobs = pairInsertedWithEvents(events, created).map(({ event, item }) => ({
            messageId: item.id,
            context: { ...toInboundEventContext(event), conversationId: item.conversationId ?? event.conversationId ?? null },
        }));

        try {
            await this.queue.enqueue(jobs);
        } catch (err) {
            // Tin đã được lưu (processed_at = null): sweeper sẽ đưa lại vào hàng đợi
            this.logger.error('enqueue failed, sweeper will retry', err as Error);
        }
    }
}
