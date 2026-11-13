import { Injectable, Logger, OnModuleInit, Optional } from "@nestjs/common";
import { Message, Prisma } from "@prisma/client";
import { PrismaService } from "../../../platform/database/prisma.service.js";
import { DistributedLockService } from "../../../platform/redis/distributed-lock.service.js";
import { InboundEvent } from "../domain/inbound-event.js";
import { attachmentsFromRawPayload } from "../domain/media/attachment-normalizer.js";
import { Channel, MessageDirection } from "../domain/channel.js";
import {
    resolveTagMappings,
    CRM_SYSTEM_TAGS,
    META_SOURCE_TAGS,
} from "../domain/tag-mapping/index.js";

/** Tin vừa được chèn mới (đã bỏ qua tin trùng). channel + externalMessageId dùng để ghép lại đúng sự kiện gốc. */
export interface InsertedMessage {
    id: string;
    conversationId: string | null;
    channel: Channel;
    externalMessageId: string;
}

export const inboundEventKey = (e: { channel: string; externalMessageId: string }): string =>
    `${e.channel}:${e.externalMessageId}`;

/**
 * Ghép tin vừa chèn với sự kiện gốc theo khóa (channel, externalMessageId).
 * KHÔNG được ghép theo chỉ số mảng: insertManyIgnoreDuplicate bỏ qua tin trùng nên created[i] không ứng với events[i].
 */
export function pairInsertedWithEvents<E extends { channel: string; externalMessageId: string }>(
    events: readonly E[],
    created: readonly InsertedMessage[],
): Array<{ event: E; item: InsertedMessage }> {
    const byKey = new Map<string, E>();
    for (const event of events) {
        const key = inboundEventKey(event);
        if (!byKey.has(key)) byKey.set(key, event);
    }
    const pairs: Array<{ event: E; item: InsertedMessage }> = [];
    for (const item of created) {
        const event = byKey.get(inboundEventKey(item));
        if (event) pairs.push({ event, item });
    }
    return pairs;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (val?: string | null): val is string => Boolean(val && UUID_REGEX.test(val));
const INVALID_EXTERNAL_IDS = new Set(['', 'unknown', 'unknown-sender', 'page-admin', 'anonymous', 'undefined', 'null']);
/** Trả về ID người dùng ngoài (PSID/Zalo user id) hợp lệ, hoặc null nếu là giá trị placeholder. */
const normalizeExternalUserId = (val: unknown): string | null => {
    if (val === null || val === undefined) return null;
    const str = String(val).trim();
    return INVALID_EXTERNAL_IDS.has(str.toLowerCase()) ? null : str;
};
const CONVERSATION_LOOKUP_SELECT = {
    id: true,
    customerId: true,
    tags: true,
    lastMessageAt: true,
    lastCustomerMessageAt: true,
} satisfies Prisma.ConversationSelect;
type ConversationLookup = Prisma.ConversationGetPayload<{ select: typeof CONVERSATION_LOOKUP_SELECT }>;
const normalizeWorkspaceId = (workspaceId?: string): string | undefined =>
    workspaceId && UUID_REGEX.test(workspaceId) ? workspaceId : undefined;

function normalizeChannel(rawChannel?: unknown): Channel | undefined {
    if (!rawChannel || typeof rawChannel !== 'string') return undefined;
    const upper = rawChannel.trim().toUpperCase();
    if (!upper || upper === 'ALL' || upper === 'UNDEFINED' || upper === 'NULL') {
        return undefined;
    }
    if (upper === 'ZALO' || upper === 'ZALO_PERSONAL' || upper.includes('ZALO')) {
        return Channel.ZALO;
    }
    if (upper === 'FACEBOOK' || upper === 'FB' || upper.includes('FACEBOOK')) {
        return Channel.FACEBOOK;
    }
    if (upper === 'TIKTOK' || upper.includes('TIKTOK')) {
        return Channel.TIKTOK;
    }
    if (upper === 'MANUAL_IMPORT' || upper.includes('MANUAL') || upper.includes('CSV')) {
        return Channel.MANUAL_IMPORT;
    }
    if (Object.values(Channel).includes(upper as Channel)) {
        return upper as Channel;
    }
    return undefined;
}

@Injectable()
export class MessageRepository implements OnModuleInit {
    private readonly logger = new Logger(MessageRepository.name);

    constructor(
        private readonly prisma: PrismaService,
        @Optional() private readonly locks?: DistributedLockService,
    ) {}

    async onModuleInit(): Promise<void> {
        // Tự động quét và chuẩn hóa các cột conversation_id, attachments bị null trong DB.
        // Chạy nền và có khóa phân tán: không chặn khởi động, và chỉ 1 instance chạy khi scale ngang.
        const run = () => this.backfillNullFields();
        const task = this.locks ? this.locks.runExclusive('messages:backfill', 10 * 60_000, run) : run();
        void Promise.resolve(task).catch((err) =>
            this.logger.warn(`Backfill messages failed: ${(err as Error).message}`),
        );
    }

    /** Tin INBOUND chưa xử lý quá `olderThanMs` (job bị mất / enqueue lỗi) để sweeper đưa lại vào hàng đợi. */
    async findStaleUnprocessedIds(olderThanMs: number, limit = 200): Promise<string[]> {
        const rows = await this.prisma.message.findMany({
            where: {
                processedAt: null,
                direction: MessageDirection.INBOUND,
                sentAt: { lt: new Date(Date.now() - olderThanMs) },
            },
            orderBy: { sentAt: 'asc' },
            take: limit,
            select: { id: true },
        });
        return rows.map((r) => r.id);
    }

    async findById(id: string): Promise<Message | null> {
        return this.prisma.message.findUnique({
            where: { id },
        });
    }

    /** Workspace sở hữu tin nhắn (qua tài khoản kênh nhận tin) */
    async findWorkspaceId(channelAccountId: string): Promise<string | null> {
        const account = await this.prisma.channelAccount.findUnique({
            where: { id: channelAccountId },
            select: { workspaceId: true },
        });
        return account?.workspaceId ?? null;
    }

    async markProcessed(id: string, processedAt: Date = new Date()): Promise<void> {
        await this.prisma.message.update({
            where: { id },
            data: { processedAt },
        });
    }

    async findMany(options?: {
        workspaceId?: string;
        limit?: number;
        offset?: number;
        channel?: Channel | string;
        search?: string;
        staffId?: string;
        role?: 'OWNER' | 'STAFF';
    }): Promise<{ items: any[]; total: number }> {
        const safeWorkspaceId = normalizeWorkspaceId(options?.workspaceId);
        const normalizedChannel = normalizeChannel(options?.channel);

        const andConditions: Prisma.MessageWhereInput[] = [];

        if (safeWorkspaceId) {
            andConditions.push({
                OR: [
                    { channelAccount: { workspaceId: safeWorkspaceId } },
                    { conversation: { workspaceId: safeWorkspaceId } },
                ],
            });
        }

        // Nếu là role STAFF, chỉ xem hội thoại được phân công cho mình (OWNER xem được tất cả)
        if (options?.role === 'STAFF' && options?.staffId) {
            const memberIds: string[] = [];
            try {
                const members = await this.prisma.workspaceMember.findMany({
                    where: { userId: options.staffId },
                    select: { id: true },
                });
                members.forEach((m) => memberIds.push(m.id));
            } catch { }

            andConditions.push({
                conversation: {
                    OR: [
                        { assignedMember: { userId: options.staffId } },
                        ...(memberIds.length > 0 ? [{ assignedMemberId: { in: memberIds } }] : []),
                        { customer: { channelIdentities: { path: ['assignedStaffId'], equals: options.staffId } } },
                    ],
                },
            });
        }

        if (normalizedChannel) {
            andConditions.push({
                channel: normalizedChannel,
            });
        }

        if (options?.search && typeof options.search === 'string' && options.search.trim()) {
            const searchTerm = options.search.trim();
            andConditions.push({
                OR: [
                    { content: { contains: searchTerm, mode: 'insensitive' } },
                    { externalMessageId: { contains: searchTerm, mode: 'insensitive' } },
                ],
            });
        }

        const where: Prisma.MessageWhereInput = andConditions.length > 0
            ? { AND: andConditions }
            : {};

        let items: any[] = [];
        let total = 0;

        try {
            [items, total] = await Promise.all([
                this.prisma.message.findMany({
                    where,
                    include: {
                        channelAccount: {
                            select: {
                                displayName: true,
                                externalAccountId: true,
                                avatarUrl: true,
                                metadata: true,
                            },
                        },
                        conversation: {
                            include: {
                                customer: true,
                                assignedMember: {
                                    include: {
                                        user: {
                                            select: {
                                                id: true,
                                                fullName: true,
                                                email: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    orderBy: { sentAt: 'desc' },
                    take: options?.limit ?? 50,
                    skip: options?.offset ?? 0,
                }),
                this.prisma.message.count({ where }),
            ]);
        } catch (dbErr: any) {
            this.logger.error(`Database error in MessageRepository.findMany: ${dbErr?.message || dbErr}`, dbErr?.stack);
            return { items: [], total: 0 };
        }

        const mappedItems = (items || []).map((m: any) => {
            try {
                let raw = m.rawPayload;
                if (typeof raw === 'string') {
                    try {
                        raw = JSON.parse(raw);
                    } catch {
                        raw = {};
                    }
                }
                if (!raw || typeof raw !== 'object') {
                    raw = {};
                }

                const customer = m.conversation?.customer;
                const isOutbound = m.direction === 'OUTBOUND' || m.direction === MessageDirection.OUTBOUND;

                let customerFbId: string | null = null;
                let customerZaloId: string | null = null;
                if (customer?.channelIdentities) {
                    if (Array.isArray(customer.channelIdentities)) {
                        const fb = customer.channelIdentities.find((i: any) => i?.channel === 'FACEBOOK' || i?.channel === Channel.FACEBOOK);
                        if (fb?.externalUserId) customerFbId = String(fb.externalUserId);
                        const za = customer.channelIdentities.find((i: any) => i?.channel === 'ZALO' || i?.channel === Channel.ZALO);
                        if (za?.externalUserId) customerZaloId = String(za.externalUserId);
                    } else if (typeof customer.channelIdentities === 'object') {
                        const idents = customer.channelIdentities as any;
                        if (idents.facebook) customerFbId = String(idents.facebook);
                        if (idents.zalo?.id) customerZaloId = String(idents.zalo.id);
                        else if (idents.zalo) customerZaloId = String(idents.zalo);
                    }
                }

                const recipientExternalId =
                    raw.recipient?.id ||
                    raw.to?.data?.[0]?.id ||
                    raw.to?.id ||
                    customerFbId ||
                    customerZaloId ||
                    customer?.id ||
                    null;

                const senderExternalId =
                    isOutbound && recipientExternalId
                        ? recipientExternalId
                        : (raw.senderExternalId ||
                           raw.sender?.id ||
                           raw.from?.id ||
                           customerFbId ||
                           customerZaloId ||
                           customer?.id ||
                           'unknown');

                const customerName =
                    customer?.fullName ||
                    raw.customerName ||
                    raw.from?.name ||
                    raw.sender?.name ||
                    null;

                const customerAvatar =
                    customer?.avatarUrl ||
                    raw.customerAvatar ||
                    null;

                const tags =
                    (Array.isArray(m.conversation?.tags) && m.conversation.tags.length > 0)
                        ? m.conversation.tags
                        : (Array.isArray(raw.tags) && raw.tags.length > 0 ? raw.tags : []);

                const assignedMember = m.conversation?.assignedMember;
                const customerIdentities = (customer?.channelIdentities as any) || {};
                const assignedStaff = assignedMember
                    ? {
                        id: assignedMember.user?.id || assignedMember.userId || assignedMember.id,
                        memberId: assignedMember.id,
                        name: assignedMember.user?.fullName || 'Tư vấn viên',
                        email: assignedMember.user?.email || null,
                        avatar: (assignedMember.user as any)?.avatarUrl || '',
                        role: assignedMember.role || 'STAFF',
                    }
                    : (customerIdentities?.assignedStaffId
                        ? {
                            id: customerIdentities.assignedStaffId,
                            name: customerIdentities.assignedStaffName || 'Tư vấn viên',
                            role: 'STAFF',
                        }
                        : undefined);

                return {
                    ...m,
                    senderExternalId,
                    customerName,
                    customerAvatar,
                    customerPhone: customer?.phone || null,
                    customerEmail: customer?.email || null,
                    tags,
                    assignedStaff,
                };
            } catch {
                return m;
            }
        });

        return { items: mappedItems, total };
    }

    async insertManyIgnoreDuplicate(
        events: InboundEvent[],
    ): Promise<InsertedMessage[]> {
        if (events.length === 0) {
            return [];
        }

        // 1. Khử trùng lặp ngay trong cùng một batch (tránh lỗi PostgreSQL không thể affect cùng 1 hàng 2 lần trong 1 lệnh)
        const seenKeys = new Set<string>();
        const uniqueEvents: InboundEvent[] = [];
        for (const event of events) {
            const key = `${event.channel}:${event.externalMessageId}`;
            if (!seenKeys.has(key)) {
                seenKeys.add(key);
                uniqueEvents.push(event);
            }
        }

        // 2. Đảm bảo tồn tại ChannelAccount cho từng cặp (channel, externalAccountId)
        const uniqueAccounts = new Map<string, { channel: InboundEvent['channel']; externalAccountId: string; workspaceId?: string }>();
        for (const event of uniqueEvents) {
            const key = `${event.channel}:${event.externalAccountId}`;
            if (!uniqueAccounts.has(key)) {
                uniqueAccounts.set(key, {
                    channel: event.channel,
                    externalAccountId: event.externalAccountId,
                    workspaceId: event.workspaceId,
                });
            }
        }

        const accountMap = new Map<string, string>();
        for (const [key, { channel, externalAccountId, workspaceId }] of uniqueAccounts.entries()) {
            const account = await this.prisma.channelAccount.upsert({
                where: {
                    channel_externalAccountId: {
                        channel,
                        externalAccountId,
                    },
                },
                update: workspaceId ? { workspaceId } : {},
                create: {
                    channel,
                    externalAccountId,
                    displayName: externalAccountId,
                    workspaceId,
                },
                select: { id: true },
            });
            accountMap.set(key, account.id);
        }

        // 3. Chuẩn bị dữ liệu messages và tự động liên kết conversation_id, attachments, processed_at
        const messagesData: Prisma.MessageCreateManyInput[] = [];

        for (const e of uniqueEvents) {
            const accountId = accountMap.get(`${e.channel}:${e.externalAccountId}`)!;
            const messageSentAt = e.sentAt ? new Date(e.sentAt) : new Date();
            const raw = (e.rawPayload as any) || {};

            // A. Xác định hoặc tìm/tạo conversationId (chỉ chấp nhận UUID hợp lệ)
            let conversationId: string | null = isUuid(e.conversationId)
                ? e.conversationId
                : isUuid(raw.conversationId)
                ? raw.conversationId
                : null;

            if (!conversationId) {
                try {
                    const isOutbound = e.direction === MessageDirection.OUTBOUND;
                    let customerExternalId = isOutbound
                        ? (raw.recipient?.id || raw.to?.data?.[0]?.id || raw.to?.id || e.senderExternalId)
                        : e.senderExternalId;

                    // Nếu customerExternalId chưa có hoặc là unknown, thử trích xuất từ conversationId dạng FACEBOOK_pageId_psid hoặc ZALO_psid
                    if ((!customerExternalId || customerExternalId === 'unknown') && typeof e.conversationId === 'string' && e.conversationId.includes('_')) {
                        const parts = e.conversationId.split('_');
                        const candidate = parts[parts.length - 1];
                        if (/^\d+$/.test(candidate)) {
                            customerExternalId = candidate;
                        }
                    }

                    const externalUserId = normalizeExternalUserId(customerExternalId);
                    const customerId: string | null = isUuid(raw.customerId)
                        ? raw.customerId
                        : await this.findCustomerIdByExternalUser(e.channel, externalUserId);

                    // Không xác định được người gửi lẫn customer → không gắn tin vào hội thoại nào,
                    // tránh trộn tin của người khác vào hội thoại đầu tiên của Page.
                    if (!customerId && !externalUserId) {
                        throw new Error('Cannot resolve conversation owner');
                    }

                    // Tìm cuộc hội thoại đã có (luôn lọc theo Page + người gửi)
                    let conv = await this.findConversationForSender(accountId, customerId, externalUserId);

                    const isOutOfOrder = Boolean(
                        conv?.lastMessageAt && messageSentAt.getTime() < new Date(conv.lastMessageAt).getTime()
                    );
                    const isLatestCustomerMessage = Boolean(
                        !isOutbound &&
                        (!conv?.lastCustomerMessageAt ||
                            messageSentAt.getTime() > new Date(conv.lastCustomerMessageAt).getTime())
                    );

                    // Phân giải tag ánh xạ (Facebook Lead -> Lead, idempotent & out-of-order safe)
                    const rawTags: string[] = Array.isArray(raw.tags) && raw.tags.length > 0
                        ? raw.tags
                        : (e.channel === Channel.FACEBOOK ? [META_SOURCE_TAGS.FACEBOOK_LEAD] : [CRM_SYSTEM_TAGS.NEW_CUSTOMER]);

                    const tagResult = resolveTagMappings({
                        channel: e.channel,
                        currentTags: conv?.tags || [],
                        sourceTags: rawTags,
                        eventTimestamp: messageSentAt,
                        lastSyncTimestamp: conv?.lastMessageAt,
                    });
                    const finalTags = tagResult.finalTags;

                    // Nếu chưa có thì tự động tạo mới cuộc hội thoại
                    if (!conv) {
                        let initialAssignedMemberId: string | null = null;
                        if (customerId) {
                            try {
                                const prevConv = await this.prisma.conversation.findFirst({
                                    where: { customerId, assignedMemberId: { not: null } },
                                    select: { assignedMemberId: true },
                                });
                                if (prevConv?.assignedMemberId) {
                                    initialAssignedMemberId = prevConv.assignedMemberId;
                                }
                            } catch {}
                        }

                        conv = await this.prisma.conversation.create({
                            data: {
                                workspaceId: e.workspaceId || uniqueAccounts.get(`${e.channel}:${e.externalAccountId}`)?.workspaceId || null,
                                channelAccountId: accountId,
                                customerId: customerId || null,
                                assignedMemberId: initialAssignedMemberId,
                                status: 'OPEN',
                                snippet: e.content || 'Tin nhắn mới',
                                lastMessageAt: messageSentAt,
                                lastCustomerMessageAt: !isOutbound ? messageSentAt : undefined,
                                tags: finalTags,
                            },
                            select: CONVERSATION_LOOKUP_SELECT,
                        });
                    } else {
                        // Cập nhật lại snippet, lastMessageAt và tags của Conversation (bảo vệ chống ghi đè lùi nếu tin nhắn out-of-order)
                        await this.prisma.conversation.update({
                            where: { id: conv.id },
                            data: {
                                // Hội thoại tạo trước khi có Customer → gắn Customer khi đã xác định được
                                ...(customerId && !conv.customerId ? { customerId } : {}),
                                ...(isLatestCustomerMessage ? { lastCustomerMessageAt: messageSentAt } : {}),
                                ...(isOutOfOrder ? {} : {
                                    snippet: e.content || undefined,
                                    lastMessageAt: messageSentAt,
                                }),
                                tags: finalTags,
                            },
                        });
                    }

                    conversationId = conv.id;
                } catch {
                    // Tiếp tục lưu tin nhắn ngay cả khi tạo Conversation gặp lỗi non-fatal
                }
            }

            // B. Tệp đính kèm: ưu tiên danh sách adapter đã chuẩn hóa, không có thì suy ra từ payload gốc
            const normalizedAttachments =
                e.attachments && e.attachments.length > 0
                    ? e.attachments
                    : attachmentsFromRawPayload(e.externalMessageId, e.rawPayload);
            const attachments = normalizedAttachments.length > 0 ? normalizedAttachments : null;

            // C. Trích xuất processedAt (Outbound và Sync đã hoàn thành xử lý)
            let processedAt: Date | null = e.processedAt || null;
            if (!processedAt) {
                if (e.direction === MessageDirection.OUTBOUND || raw.isSync) {
                    processedAt = messageSentAt;
                }
            }

            messagesData.push({
                channelAccountId: accountId,
                conversationId: isUuid(conversationId) ? conversationId : null,
                channel: e.channel,
                direction: e.direction ?? MessageDirection.INBOUND,
                content: e.content,
                attachments: attachments ? (attachments as unknown as Prisma.InputJsonValue) : undefined,
                sentAt: messageSentAt,
                createdAt: messageSentAt,
                processedAt,
                externalMessageId: e.externalMessageId,
                rawPayload: (e.rawPayload ?? {}) as Prisma.InputJsonValue,
            });
        }

        // 4. Chỉ các dòng mới được chèn thực sự mới được trả về cho worker.
        return this.prisma.message.createManyAndReturn({
            data: messagesData,
            skipDuplicates: true,
            select: { id: true, conversationId: true, channel: true, externalMessageId: true },
        }) as Promise<InsertedMessage[]>;
    }

    /** Tìm Customer theo ID người dùng ngoài của kênh (bảng channel_identities hoặc JSON channelIdentities). */
    private async findCustomerIdByExternalUser(channel: Channel, externalUserId: string | null): Promise<string | null> {
        if (!externalUserId) return null;
        const channelKey = String(channel).toLowerCase();
        const cust = await this.prisma.customer.findFirst({
            where: {
                OR: [
                    { identities: { some: { channel: channel as any, externalUserId } } },
                    { channelIdentities: { path: [channelKey], equals: externalUserId } },
                    { channelIdentities: { path: [channelKey, 'id'], equals: externalUserId } },
                    { channelIdentities: { path: ['socialId'], equals: externalUserId } },
                ],
            },
            select: { id: true },
        });
        return cust?.id ?? null;
    }

    /**
     * Tìm hội thoại của đúng người gửi trên một Page/OA.
     * - Có customerId: tìm theo (channelAccountId, customerId).
     * - Chưa có hoặc chưa thấy: tìm hội thoại chưa gắn Customer mà tin nhắn bên trong thuộc cùng externalUserId
     *   (sender của tin đến, recipient của tin đi).
     * Tuyệt đối không fallback về hội thoại bất kỳ của Page.
     */
    private async findConversationForSender(
        channelAccountId: string,
        customerId: string | null,
        externalUserId: string | null,
    ): Promise<ConversationLookup | null> {
        if (customerId) {
            const byCustomer = await this.prisma.conversation.findFirst({
                where: { channelAccountId, customerId },
                orderBy: { lastMessageAt: 'desc' },
                select: CONVERSATION_LOOKUP_SELECT,
            });
            if (byCustomer) return byCustomer;
        }

        if (!externalUserId) return null;

        const payloadMatches: Prisma.MessageWhereInput[] = [
            { rawPayload: { path: ['senderExternalId'], equals: externalUserId } },
            { rawPayload: { path: ['sender', 'id'], equals: externalUserId } },
            { rawPayload: { path: ['sender'], equals: externalUserId } },
            { rawPayload: { path: ['from', 'id'], equals: externalUserId } },
            { direction: MessageDirection.OUTBOUND, rawPayload: { path: ['recipient', 'id'], equals: externalUserId } },
            { direction: MessageDirection.OUTBOUND, rawPayload: { path: ['to', 'data', '0', 'id'], equals: externalUserId } },
        ];

        return this.prisma.conversation.findFirst({
            where: {
                channelAccountId,
                customerId: null,
                messages: { some: { OR: payloadMatches } },
            },
            orderBy: { lastMessageAt: 'desc' },
            select: CONVERSATION_LOOKUP_SELECT,
        });
    }

    /**
     * Tự động quét và cập nhật các cột conversation_id, processed_at, attachments
     * bị null cho các tin nhắn đã tồn tại trong CSDL
     */
    async backfillNullFields(): Promise<{ updatedConversations: number; updatedProcessedAt: number; updatedAttachments: number }> {
        let updatedConversations = 0;
        let updatedProcessedAt = 0;
        let updatedAttachments = 0;

        try {
            // 1. Tìm các message có conversationId null
            const nullConvMessages = await this.prisma.message.findMany({
                where: { conversationId: null },
                take: 200,
            });

            for (const msg of nullConvMessages) {
                const raw = (msg.rawPayload as any) || {};
                const isOutbound = msg.direction === MessageDirection.OUTBOUND;
                const customerExternalId = isOutbound
                    ? (raw.recipient?.id || raw.to?.data?.[0]?.id || raw.to?.id)
                    : (raw.senderExternalId || raw.sender?.id || raw.from?.id);

                const externalUserId = normalizeExternalUserId(customerExternalId);
                const customerId: string | null = isUuid(raw.customerId)
                    ? raw.customerId
                    : await this.findCustomerIdByExternalUser(msg.channel as Channel, externalUserId);

                // Không xác định được người gửi → bỏ qua, không gắn bừa vào hội thoại của Page
                if (!customerId && !externalUserId) continue;

                // Tìm hoặc tạo conversation (lọc theo Page + người gửi)
                let conv = await this.findConversationForSender(
                    msg.channelAccountId,
                    customerId,
                    externalUserId,
                );

                if (conv && customerId && !conv.customerId) {
                    await this.prisma.conversation.update({ where: { id: conv.id }, data: { customerId } });
                }

                if (!conv) {
                    const tagResult = resolveTagMappings({
                        channel: msg.channel,
                        currentTags: [],
                        sourceTags: msg.channel === Channel.FACEBOOK ? [META_SOURCE_TAGS.FACEBOOK_LEAD] : [CRM_SYSTEM_TAGS.NEW_CUSTOMER],
                    });
                    conv = await this.prisma.conversation.create({
                        data: {
                            channelAccountId: msg.channelAccountId,
                            customerId: customerId || null,
                            status: 'OPEN',
                            snippet: msg.content || 'Tin nhắn',
                            lastMessageAt: msg.sentAt,
                            tags: tagResult.finalTags,
                        },
                        select: CONVERSATION_LOOKUP_SELECT,
                    });
                }

                await this.prisma.message.update({
                    where: { id: msg.id },
                    data: { conversationId: conv.id },
                });
                updatedConversations++;
            }

            // 2. KHÔNG tự đặt processed_at cho tin chưa xử lý: đó là tin còn chờ worker (hoặc sweeper đưa lại vào hàng đợi).
            //    Đánh dấu hàng loạt ở đây sẽ khiến worker bỏ qua và làm mất tin.

            // 3. Cập nhật attachments từ rawPayload cho các tin nhắn bị null
            const nullAttMessages = await this.prisma.message.findMany({
                where: { attachments: { equals: Prisma.DbNull } },
                take: 200,
            });

            for (const msg of nullAttMessages) {
                const parsed = attachmentsFromRawPayload(msg.externalMessageId, msg.rawPayload);
                // Tin không có đính kèm cũng ghi [] để lần quét sau không lặp lại chính các dòng này
                await this.prisma.message.update({
                    where: { id: msg.id },
                    data: { attachments: parsed as unknown as Prisma.InputJsonValue },
                });
                if (parsed.length > 0) updatedAttachments++;
            }
        } catch {
            // Không ngắt app nếu backfill gặp lỗi
        }

        return { updatedConversations, updatedProcessedAt, updatedAttachments };
    }
}
