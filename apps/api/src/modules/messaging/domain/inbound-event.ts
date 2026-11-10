import type { Channel, MessageDirection } from "./channel.js";

export type InboundAttachmentType = 'STICKER' | 'IMAGE' | 'FILE' | 'AUDIO' | 'VIDEO';

export interface NormalizedAttachment {
    id: string;
    type: InboundAttachmentType;
    url: string;
    name?: string;
    size?: string;
    duration?: string;
    stickerId?: string | number;
    mimeType?: string;
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
