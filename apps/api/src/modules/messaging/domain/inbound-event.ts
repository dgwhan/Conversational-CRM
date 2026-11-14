import type { Channel, MessageDirection } from "./channel.js";

export type InboundAttachmentType = 'STICKER' | 'IMAGE' | 'FILE' | 'AUDIO' | 'VIDEO';

export interface NormalizedAttachment {
    id: string;
    type: InboundAttachmentType;
    /** URL gốc trên CDN của kênh (có thể hết hạn) */
    url: string;
    name?: string;
    /** Dung lượng dạng hiển thị (VD: "1.2 MB") */
    size?: string;
    /** Thời lượng dạng hiển thị (VD: "0:15") */
    duration?: string;
    stickerId?: string | number;
    mimeType?: string;
    thumbnailUrl?: string;
    /** Khóa trong object storage khi đã lưu bản sao (không lưu nhị phân trong DB) */
    storageKey?: string;
    storedBytes?: number;
    /** Kiểu nội dung của bản sao (VD: image/webp sau khi nén) */
    storedMimeType?: string;
    /** Dung lượng tệp gốc trước khi nén */
    originalBytes?: number;
    archivedAt?: string;
    /** Bản sao đã bị xóa theo chính sách lưu trữ / URL gốc không còn tải được */
    expired?: boolean;
}

export interface InboundEvent {
    readonly workspaceId?: string;
    readonly channel: Channel;
    readonly externalAccountId: string;
    readonly externalMessageId: string;
    readonly senderExternalId: string;
    readonly direction: MessageDirection;
    readonly content: string | null;
    readonly sentAt: Date;
    readonly rawPayload: unknown;
    readonly conversationId?: string | null;
    readonly attachments?: NormalizedAttachment[];
    readonly processedAt?: Date | null;
}
