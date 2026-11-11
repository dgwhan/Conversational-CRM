import { Channel } from "./channel.js";
import { InboundEvent, NormalizedAttachment } from "./inbound-event.js";
import type { MessageDirection } from "./channel.js";

export interface RawWebhookRequest {
    // Key x-hub-signature-256
    readonly headers: Readonly<Record<string, string | string[] | undefined>>;
    // Root bytes, HMAC
    readonly rawBody: Buffer;

    readonly query?: Record<string, unknown>;
}

export class InvalidWebhookPayloadError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidWebhookPayloadError';
    }
}

export const INBOUND_QUEUE = Symbol('INBOUND_QUEUE');
/**
 * Ngữ cảnh của sự kiện gốc (không kèm rawPayload) để worker chạy các tác vụ phụ sau khi tin đã được lưu:
 * đồng bộ khách hàng, đẩy realtime, trả lời ngoài giờ. rawPayload được worker đọc lại từ DB.
 */
export interface InboundEventContext {
    readonly workspaceId?: string;
    readonly channel: Channel;
    readonly externalAccountId: string;
    readonly externalMessageId: string;
    readonly senderExternalId: string;
    readonly direction: MessageDirection;
    readonly content: string | null;
    /** ISO-8601 */
    readonly sentAt: string;
    readonly conversationId?: string | null;
    readonly attachments?: NormalizedAttachment[];
}

export interface InboundJobData {
    readonly messageId: string;
    /** Có mặt khi tin đến từ webhook: worker sẽ chạy thêm các tác vụ phụ (realtime, khách hàng, ngoài giờ). */
    readonly context?: InboundEventContext;
}

export interface InboundMessageQueue {
    /** Chỉ đưa job vào hàng đợi, không xử lý trong request. Chuỗi = messageId (không có tác vụ phụ). */
    enqueue(jobs: ReadonlyArray<string | InboundJobData>): Promise<void>;
}

export function toInboundEventContext(event: InboundEvent): InboundEventContext {
    return {
        workspaceId: event.workspaceId,
        channel: event.channel,
        externalAccountId: event.externalAccountId,
        externalMessageId: event.externalMessageId,
        senderExternalId: event.senderExternalId,
        direction: event.direction,
        content: event.content,
        sentAt: new Date(event.sentAt).toISOString(),
        conversationId: event.conversationId ?? null,
        attachments: event.attachments,
    };
}

export function normalizeInboundJob(job: string | InboundJobData): InboundJobData {
    return typeof job === 'string' ? { messageId: job } : job;
}
export interface ChannelAdapter {
    readonly channel: Channel;
    /** true nếu request thật sự đến từ nền tảng (kiểm tra chữ ký). Không ném lỗi. */
    verifyRequest(request: RawWebhookRequest): boolean;

    /**
   * Chuyển payload của nền tảng thành các InboundEvent chuẩn.
   * - Trả [] với sự kiện không phải tin nhắn (đã đọc, đã gửi...).
   * - Ném InvalidWebhookPayloadError nếu payload sai cấu trúc.
   */
    parseEvents(request: RawWebhookRequest): InboundEvent[];
}