import { Injectable, NotFoundException, ForbiddenException, Optional, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import { RealtimeService } from '../../realtime/realtime.service.js';
import { ContactMergeService } from './contact-merge.service.js';
import { CustomerTagService } from './customer-tag.service.js';
import { standardizeVietnamesePhoneNumber } from '../../customers/domain/phone-standardizer.js';
import { matchesUnaccent } from '../../customers/domain/unaccent.js';
import { deduplicateTags } from '../domain/tag-mapping/index.js';
import { ActivityService } from '../../activities/activity.service.js';

export function isTestAppointmentStage(stage?: string | null): boolean {
    if (!stage) return false;
    const lower = stage.toLowerCase();
    return (
        lower.includes('test') ||
        lower.includes('hß║╣n') ||
        lower.includes('trial') ||
        lower === 'stage_trial_appointment' ||
        lower === 'trial_appointment'
    );
}

export interface GetCustomersParams {
    rawWsId?: string;
    search?: string;
    pageStr?: string;
    limitStr?: string;
    leadStatus?: string;
    leadStage?: string;
    role?: string;
    staffId?: string;
}

export class UpdateCustomerDto {
    fullName?: string;
    notes?: string;
    phone?: string;
    email?: string;
    idCard?: string;
    school?: string;
    address?: string;
    dateOfBirth?: string;
    interestCourses?: string[];
    estimatedValue?: number;
    leadStage?: string;
    leadStatus?: string;
    updatedBy?: string;
    tags?: string[];
    conversationId?: string;
    assignedStaffId?: string | null;
    assignedStaffName?: string | null;
    assignedMemberId?: string | null;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class CustomerService {
    private readonly logger = new Logger(CustomerService.name);
    private readonly tagService: CustomerTagService;

    constructor(
        private readonly prisma: PrismaService,
        @Optional() private readonly realtime?: RealtimeService,
        @Optional() private readonly mergeService?: ContactMergeService,
        @Optional() tagService?: CustomerTagService,
        @Optional() private readonly activityService?: ActivityService,
    ) {
        this.tagService = tagService || new CustomerTagService(prisma);
    }

    /**
     * Retrieve list of customers within a workspace, supporting pagination, unaccent search, and phone lookup
     */
    async getCustomers(params: GetCustomersParams) {
        const { rawWsId, search, pageStr, limitStr, leadStatus, leadStage } = params;
        const page = Math.max(1, parseInt(pageStr || '1', 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(limitStr || '20', 10) || 20));
        const skip = (page - 1) * limit;

        const where: any = {};

        // Only pass workspaceId to Prisma if it's a valid UUID ΓÇö reject fallback slugs like "ws-default-001"
        if (rawWsId && UUID_REGEX.test(rawWsId)) {
            where.workspaceId = rawWsId;
        }

        if (leadStatus && leadStatus.trim()) {
            where.leadStatus = leadStatus.trim();
        }

        if (leadStage && leadStage.trim()) {
            where.leadStage = leadStage.trim();
        }

        // Role STAFF: Chß╗ë xem kh├ích h├áng ─æ╞░ß╗úc ph├ón c├┤ng cho m├¼nh (OWNER xem to├án bß╗Ö)
        if (params.role === 'STAFF' && params.staffId) {
            const memberIds: string[] = [];
            try {
                const members = await this.prisma.workspaceMember.findMany({
                    where: { userId: params.staffId },
                    select: { id: true },
                });
                members.forEach((m) => memberIds.push(m.id));
            } catch { }

            where.AND = [
                ...(where.AND ? (Array.isArray(where.AND) ? where.AND : [where.AND]) : []),
                {
                    OR: [
                        { conversations: { some: { assignedMember: { userId: params.staffId } } } },
                        ...(memberIds.length > 0 ? [{ conversations: { some: { assignedMemberId: { in: memberIds } } } }] : []),
                        { channelIdentities: { path: ['assignedStaffId'], equals: params.staffId } },
                    ],
                },
            ];
        }

        let fallbackFilterNeeded = false;
        let cleanSearchTerm = '';

        if (search && search.trim()) {
            cleanSearchTerm = search.trim();
            const rawDigits = cleanSearchTerm.replace(/\D/g, '');
            const stdPhone = rawDigits.length >= 7 ? standardizeVietnamesePhoneNumber(rawDigits) : null;
            const searchPattern = `%${cleanSearchTerm}%`;
            const phonePattern = rawDigits.length >= 4 ? `%${rawDigits}%` : null;

            let matchedIds: string[] | null = null;

            try {
                if (typeof this.prisma.$queryRaw === 'function') {
                    const wsClause = rawWsId && UUID_REGEX.test(rawWsId) ? Prisma.sql`AND c.workspace_id = ${rawWsId}::uuid` : Prisma.empty;
                    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
                        SELECT c.id FROM customers c
                        WHERE (
                            lower(unaccent(c.full_name)) LIKE lower(unaccent(${searchPattern}))
                            OR lower(COALESCE(c.email, '')) LIKE lower(${searchPattern})
                            OR (c.notes IS NOT NULL AND lower(unaccent(c.notes)) LIKE lower(unaccent(${searchPattern})))
                            ${phonePattern ? Prisma.sql`OR c.phone LIKE ${phonePattern} OR replace(replace(replace(COALESCE(c.phone, ''), ' ', ''), '.', ''), '-', '') LIKE ${phonePattern}` : Prisma.empty}
                            ${stdPhone ? Prisma.sql`OR c.phone = ${stdPhone}` : Prisma.empty}
                        )
                        ${wsClause}
                    `;
                    matchedIds = rows.map((r) => r.id);
                }
            } catch {
                matchedIds = null;
                fallbackFilterNeeded = true;
            }

            if (matchedIds !== null) {
                if (matchedIds.length === 0) {
                    return { items: [], total: 0, page, limit, totalPages: 0 };
                }
                where.id = { in: matchedIds };
            } else {
                where.OR = [
                    { fullName: { contains: cleanSearchTerm, mode: 'insensitive' } },
                    { phone: { contains: cleanSearchTerm, mode: 'insensitive' } },
                    { email: { contains: cleanSearchTerm, mode: 'insensitive' } },
                    ...(stdPhone ? [{ phone: stdPhone }] : []),
                    ...(phonePattern ? [{ phone: { contains: rawDigits } }] : []),
                ];
            }
        }

        try {
            const items = await (this.prisma.customer as any).findMany({
                where,
                include: {
                    conversations: {
                        include: {
                            channelAccount: {
                                select: {
                                    displayName: true,
                                    channel: true,
                                    avatarUrl: true,
                                },
                            },
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
                        orderBy: { lastMessageAt: 'desc' },
                        take: 20,
                    },
                },
                orderBy: { updatedAt: 'desc' },
                skip,
                take: limit,
            });

            const total = typeof this.prisma.customer.count === 'function'
                ? await this.prisma.customer.count({ where })
                : items.length;

            let mappedItems = items.map((c: any) => this.mapCustomerDto(c));

            // Fallback in-memory unaccent filter nß║┐u Prisma mock hoß║╖c DB kh├┤ng hß╗ù trß╗ú queryRaw
            if (fallbackFilterNeeded && cleanSearchTerm) {
                mappedItems = mappedItems.filter((item: any) => {
                    if (matchesUnaccent(item.fullName, cleanSearchTerm)) return true;
                    if (matchesUnaccent(item.notes, cleanSearchTerm)) return true;
                    if (item.phone && item.phone.includes(cleanSearchTerm.replace(/\D/g, ''))) return true;
                    if (item.email && item.email.toLowerCase().includes(cleanSearchTerm.toLowerCase())) return true;
                    return false;
                });
            }

            return {
                items: mappedItems,
                total: fallbackFilterNeeded ? mappedItems.length : total,
                page,
                limit,
                totalPages: Math.ceil((fallbackFilterNeeded ? mappedItems.length : total) / limit) || 1,
            };
        } catch (error) {
            this.logger.error(`Error in getCustomers: ${(error as Error).message}`, (error as Error).stack);
            return { items: [], total: 0, page, limit, totalPages: 0 };
        }
    }

    /**
     * Retrieve single customer details by ID (including conversations, notes, identities)
     */
    async getCustomerById(
        id: string,
        caller?: { role?: string; staffId?: string; workspaceId?: string },
    ) {
        let customer: any = null;

        if (UUID_REGEX.test(id)) {
            customer = await this.prisma.customer.findUnique({
                where: { id },
                include: {
                    conversations: {
                        include: {
                            channelAccount: {
                                select: {
                                    displayName: true,
                                    channel: true,
                                    avatarUrl: true,
                                },
                            },
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
                        orderBy: { lastMessageAt: 'desc' },
                        take: 20,
                    },
                },
            });
        } else {
            const stripped = id.replace(/^(cust|cand)-/, '');
            if (UUID_REGEX.test(stripped)) {
                customer = await this.prisma.customer.findUnique({
                    where: { id: stripped },
                    include: {
                        conversations: {
                            include: {
                                channelAccount: {
                                    select: {
                                        displayName: true,
                                        channel: true,
                                        avatarUrl: true,
                                    },
                                },
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
                            orderBy: { lastMessageAt: 'desc' },
                            take: 20,
                        },
                    },
                });
            }
        }

        if (!customer) {
            throw new NotFoundException('Kh├ích h├áng kh├┤ng tß╗ôn tß║íi hoß║╖c ─æ├ú bß╗ï x├│a');
        }

        // Role STAFF: nß║┐u v├áo kh├ích h├áng cß╗ºa ng╞░ß╗¥i kh├íc sß║╜ trß║ú vß╗ü lß╗ùi 403 Forbidden
        if (caller?.role === 'STAFF' && caller?.staffId) {
            const isAssigned = this.isCustomerAssignedToStaff(customer, caller.staffId);
            if (!isAssigned) {
                throw new ForbiddenException(
                    'Bß║ín kh├┤ng c├│ quyß╗ün xem th├┤ng tin kh├ích h├áng cß╗ºa ng╞░ß╗¥i kh├íc (403 Forbidden).',
                );
            }
        }

        return this.mapCustomerDto(customer);
    }

    /**
     * Kiß╗âm tra xem kh├ích h├áng c├│ thuß╗Öc quyß╗ün phß╗Ñ tr├ích cß╗ºa nh├ón sß╗▒ hay kh├┤ng
     */
    isCustomerAssignedToStaff(customer: any, staffId: string): boolean {
        if (!customer || !staffId) return false;
        const identities = (customer.channelIdentities as any) || {};
        if (
            identities.assignedStaffId === staffId ||
            identities.assignedMemberId === staffId
        ) {
            return true;
        }
        if (Array.isArray(customer.conversations)) {
            for (const conv of customer.conversations) {
                if (
                    conv.assignedMember?.userId === staffId ||
                    conv.assignedMemberId === staffId ||
                    conv.assignedMember?.id === staffId
                ) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Update customer profile, recruitment pipeline stage, and lead qualification status.
     * Automatically broadcasts real-time pipeline changes to connected staff.
     */
    async updateCustomer(
        id: string,
        body: UpdateCustomerDto,
        headerWsId?: string,
        caller?: { role?: string; staffId?: string },
    ) {
        // Role STAFF: kh├┤ng tß╗▒ ph├ón c├┤ng cho ng╞░ß╗¥i kh├íc
        if (caller?.role === 'STAFF') {
            if (body.assignedStaffId !== undefined || body.assignedMemberId !== undefined) {
                throw new ForbiddenException(
                    'Nh├ón vi├¬n kh├┤ng c├│ quyß╗ün tß╗▒ ph├ón c├┤ng kh├ích h├áng cho ng╞░ß╗¥i kh├íc (403 Forbidden).',
                );
            }
        }

        let existing = await this.findExistingCustomer(id, body.conversationId, body);

        // Upsert fallback: Provision new Customer if not found in database
        if (!existing) {
            return this.provisionNewCustomer(id, body, headerWsId);
        }

        // Role STAFF: chß╗ë ─æ╞░ß╗úc chß╗ënh sß╗¡a c├íc trß║íng th├íi lead thuß╗Öc kh├ích h├áng m├¼nh phß╗Ñ tr├ích, nß║┐u v├áo cß╗ºa ng╞░ß╗¥i kh├íc sß║╜ trß║ú vß╗ü lß╗ùi 403
        if (caller?.role === 'STAFF' && caller?.staffId) {
            const isAssigned = this.isCustomerAssignedToStaff(existing, caller.staffId);
            if (!isAssigned) {
                throw new ForbiddenException(
                    'Bß║ín chß╗ë ─æ╞░ß╗úc chß╗ënh sß╗¡a c├íc trß║íng th├íi lead thuß╗Öc kh├ích h├áng m├¼nh phß╗Ñ tr├ích (403 Forbidden).',
                );
            }
        }

        const currentIdentities = (existing.channelIdentities as any) || {};

        // Xß╗¡ l├╜ danh s├ích tags v├á ph├ít hiß╗çn c├íc tag bß╗ï gß╗í thß╗º c├┤ng qua CRM
        let cleanTags: string[] | undefined;
        let manuallyRemovedTags: string[] | undefined;
        if (body.tags !== undefined) {
            cleanTags = deduplicateTags(body.tags);
            const prevTags: string[] = Array.isArray(currentIdentities.tags) ? currentIdentities.tags : [];
            const removed = prevTags.filter(
                (pt: string) => !cleanTags!.some((ct: string) => ct.trim().toLowerCase() === pt.trim().toLowerCase())
            );
            const additionalRemoved: string[] = [];
            for (const r of removed) {
                const lower = r.trim().toLowerCase();
                if (lower === 'lead') {
                    additionalRemoved.push('Facebook Lead');
                } else if (lower === 'facebook lead') {
                    additionalRemoved.push('Lead');
                }
            }
            const prevManuallyRemoved: string[] = Array.isArray(currentIdentities.manuallyRemovedTags)
                ? currentIdentities.manuallyRemovedTags
                : [];
            manuallyRemovedTags = deduplicateTags([...prevManuallyRemoved, ...removed, ...additionalRemoved]);
        }

        let resolvedMemberId: string | null | undefined = undefined;
        if (body.assignedStaffId !== undefined || body.assignedMemberId !== undefined) {
            const rawStaffId = body.assignedMemberId !== undefined ? body.assignedMemberId : body.assignedStaffId;
            resolvedMemberId = await this.resolveWorkspaceMemberId(rawStaffId, headerWsId || existing.workspaceId);
        }

        const updatedIdentities = {
            ...currentIdentities,
            ...(body.interestCourses !== undefined ? { interestCourses: body.interestCourses } : {}),
            ...(body.estimatedValue !== undefined ? { estimatedValue: body.estimatedValue } : {}),
            ...(body.leadStage !== undefined ? { leadStage: body.leadStage } : {}),
            ...(body.leadStatus !== undefined ? { leadStatus: body.leadStatus } : {}),
            ...(cleanTags !== undefined ? { tags: cleanTags, manuallyRemovedTags } : {}),
            ...(body.assignedStaffId !== undefined ? { assignedStaffId: body.assignedStaffId } : {}),
            ...(body.assignedStaffName !== undefined ? { assignedStaffName: body.assignedStaffName } : {}),
            ...(resolvedMemberId !== undefined ? { assignedMemberId: resolvedMemberId } : {}),
        };

        let updated: any;
        try {
            updated = await this.prisma.customer.update({
                where: { id: existing.id },
                data: {
                    ...(headerWsId && UUID_REGEX.test(headerWsId) && !existing.workspaceId ? { workspaceId: headerWsId } : {}),
                    ...(body.fullName ? { fullName: body.fullName } : {}),
                    ...(body.notes !== undefined ? { notes: body.notes } : {}),
                    ...(body.phone !== undefined ? { phone: body.phone } : {}),
                    ...(body.email !== undefined ? { email: body.email } : {}),
                    ...(body.idCard !== undefined ? { idCard: body.idCard } : {}),
                    ...(body.school !== undefined ? { school: body.school } : {}),
                    ...(body.address !== undefined ? { address: body.address } : {}),
                    ...(body.dateOfBirth !== undefined ? { dateOfBirth: body.dateOfBirth } : {}),
                    ...(body.leadStatus !== undefined ? { leadStatus: body.leadStatus } : {}),
                    ...(body.leadStage !== undefined ? { leadStage: body.leadStage } : {}),
                    channelIdentities: updatedIdentities,
                },
            });
        } catch {
            updated = await this.prisma.customer.update({
                where: { id: existing.id },
                data: {
                    ...(headerWsId && UUID_REGEX.test(headerWsId) && !existing.workspaceId ? { workspaceId: headerWsId } : {}),
                    ...(body.fullName ? { fullName: body.fullName } : {}),
                    ...(body.notes !== undefined ? { notes: body.notes } : {}),
                    ...(body.phone !== undefined ? { phone: body.phone } : {}),
                    ...(body.email !== undefined ? { email: body.email } : {}),
                    ...(body.idCard !== undefined ? { idCard: body.idCard } : {}),
                    ...(body.school !== undefined ? { school: body.school } : {}),
                    ...(body.address !== undefined ? { address: body.address } : {}),
                    ...(body.dateOfBirth !== undefined ? { dateOfBirth: body.dateOfBirth } : {}),
                    channelIdentities: updatedIdentities,
                },
            });
        }

        // Xß╗¡ l├╜ chuß║⌐n h├│a S─ÉT v├á tß╗▒ ─æß╗Öng gß╗Öp Contact theo S─ÉT (CUS-04)
        if (existing.contactId && this.prisma.contact) {
            await this.prisma.contact.update({
                where: { id: existing.contactId },
                data: {
                    ...(body.fullName ? { displayName: body.fullName } : {}),
                    ...(body.phone !== undefined ? { phoneNormalized: body.phone } : {}),
                    ...(body.email !== undefined ? { email: body.email } : {}),
                    ...(body.idCard !== undefined ? { idCard: body.idCard } : {}),
                    ...(body.school !== undefined ? { school: body.school } : {}),
                    ...(body.address !== undefined ? { address: body.address } : {}),
                    ...(body.dateOfBirth !== undefined ? { dateOfBirth: body.dateOfBirth } : {}),
                },
            }).catch(() => {});
        }

        let mergedResult: any = null;
        if (body.phone && body.phone !== 'Ch╞░a c├│ S─ÉT' && this.mergeService) {
            mergedResult = await this.handlePhoneMerge(existing, body.phone, headerWsId, body.updatedBy);
        }

        // ─Éß╗ông bß╗Ö cß║¡p nhß║¡t tag v├áo cuß╗Öc hß╗Öi thoß║íi
        if (cleanTags !== undefined && this.prisma.conversation) {
            await this.syncConversationTags(existing.id, body.conversationId, cleanTags);
        }

        // ─Éß╗ông bß╗Ö ph├ón c├┤ng nh├ón sß╗▒ (assigned_member_id) v├áo bß║úng Conversation ─æß║úm bß║úo to├án vß║╣n tham chiß║┐u
        if (resolvedMemberId !== undefined && this.prisma.conversation) {
            await this.syncConversationAssignedMember(
                existing.id,
                body.conversationId,
                resolvedMemberId,
                headerWsId || existing.workspaceId,
            );
        }

        if (body.leadStage !== undefined || body.leadStatus !== undefined) {
            try {
                const firstConv = existing.conversations?.[0];
                const payload: any = {
                    customerId: existing.id,
                    customerName: updated.fullName,
                    newStage: (body.leadStage || existing.leadStage || 'STAGE_NEW') as string,
                    previousStage: (existing.leadStage || 'STAGE_NEW') as string,
                    updatedBy: body.updatedBy || 'Hß╗ç thß╗æng CRM',
                };
                if (updated.phone) payload.phone = updated.phone;
                if (updated.email) payload.email = updated.email;
                if (updated.avatarUrl) payload.avatarUrl = updated.avatarUrl;
                if (firstConv?.channelAccount?.channel) payload.channel = firstConv.channelAccount.channel;
                if (firstConv?.channelAccount?.displayName) payload.channelAccountName = firstConv.channelAccount.displayName;
                if (updatedIdentities.estimatedValue) payload.estimatedValue = updatedIdentities.estimatedValue;
                if (updatedIdentities.interestCourses?.length) payload.interestCourses = updatedIdentities.interestCourses;
                if (cleanTags || updatedIdentities.tags) payload.tags = cleanTags || updatedIdentities.tags;
                if (body.conversationId || firstConv?.id) payload.conversationId = body.conversationId || firstConv?.id;

                this.realtime?.broadcastPipelineChange(payload);

                // Tß╗▒ ─æß╗Öng k├¡ch hoß║ít tß║ío Task cho ph├▓ng ─É├áo tß║ío xß║┐p ph├▓ng m├íy khi Lead r╞íi v├áo trß║íng th├íi "Hß║╣n Test ─æß║ºu v├áo"
                if (body.leadStage && isTestAppointmentStage(body.leadStage) && !isTestAppointmentStage(existing.leadStage)) {
                    if (this.activityService) {
                        this.activityService.autoCreateTestTask(
                            headerWsId || existing.workspaceId,
                            existing.id,
                            updated.fullName,
                            body.notes,
                        ).catch((taskErr) => {
                            this.logger.warn(`Kh├┤ng thß╗â tß╗▒ ─æß╗Öng tß║ío Task ph├▓ng m├íy: ${taskErr.message}`);
                        });
                    }
                }
            } catch { }
        }

        return {
            ...updated,
            leadStatus: updated.leadStatus || updatedIdentities.leadStatus || 'NEW',
            leadStage: updated.leadStage || updatedIdentities.leadStage || null,
            interestCourses: updatedIdentities.interestCourses || [],
            estimatedValue: updatedIdentities.estimatedValue || 0,
            tags: cleanTags || updatedIdentities.tags || [],
            assignedStaffId: updatedIdentities.assignedStaffId || null,
            assignedStaffName: updatedIdentities.assignedStaffName || null,
            assignedMemberId: resolvedMemberId !== undefined ? resolvedMemberId : (updatedIdentities.assignedMemberId || null),
            ...(mergedResult ? { isMerged: true, mergeResult: mergedResult } : {}),
        };
    }

    /**
     * Gß╗í trß╗▒c tiß║┐p mß╗Öt tag khß╗Åi kh├ích h├áng v├á hß╗Öi thoß║íi th├┤ng qua CRM
     */
    async removeCustomerTag(id: string, tagToRemove: string) {
        return this.tagService.removeCustomerTag(id, tagToRemove);
    }

    // ==========================================
    // Internal Domain Helpers
    // ==========================================

    private mapCustomerDto(customer: any) {
        const identities = (customer.channelIdentities as any) || {};
        const convTags = Array.isArray(customer.conversations?.[0]?.tags) ? customer.conversations[0].tags : [];
        const identityTags = Array.isArray(identities.tags) ? identities.tags : [];
        const tags = Array.from(new Set([...convTags, ...identityTags]));
        const hasExplicitTags = Array.isArray(identities.tags) || (customer.conversations?.[0] && Array.isArray(customer.conversations[0].tags));

        const firstConv = customer.conversations?.[0];
        const assignedMember = firstConv?.assignedMember;
        const assignedStaff = assignedMember
            ? {
                id: assignedMember.user?.id || assignedMember.userId || assignedMember.id,
                memberId: assignedMember.id,
                name: assignedMember.user?.fullName || 'T╞░ vß║Ñn vi├¬n',
                email: assignedMember.user?.email || null,
                avatar: (assignedMember.user as any)?.avatarUrl || '',
                role: assignedMember.role || 'STAFF',
            }
            : (identities.assignedStaffId
                ? {
                    id: identities.assignedStaffId,
                    name: identities.assignedStaffName || 'T╞░ vß║Ñn vi├¬n',
                    role: 'STAFF',
                }
                : undefined);

        return {
            ...customer,
            leadStatus: customer.leadStatus || identities.leadStatus || 'NEW',
            leadStage: customer.leadStage || identities.leadStage || null,
            notes: customer.notes || identities.notes || null,
            interestCourses: identities.interestCourses || [],
            estimatedValue: identities.estimatedValue || 0,
            tags: hasExplicitTags ? tags : (customer.leadStatus === 'POTENTIAL' ? ['Lead'] : ['Kh├ích h├áng mß╗¢i']),
            assignedStaffId: identities.assignedStaffId || assignedMember?.user?.id || assignedMember?.userId || null,
            assignedStaffName: identities.assignedStaffName || assignedMember?.user?.fullName || null,
            assignedMemberId: firstConv?.assignedMemberId || identities.assignedMemberId || null,
            assignedStaff,
        };
    }

    /**
     * Ph├ón c├┤ng nh├ón sß╗▒ (staff) cho cuß╗Öc hß╗Öi thoß║íi v├á ─æß╗ông bß╗Ö kh├ích h├áng.
     * ─Éß║úm bß║úo t├¡nh to├án vß║╣n tham chiß║┐u (Foreign Key tß╗¢i workspace_members).
     */
    async assignConversation(
        conversationId: string,
        staffId?: string | null,
        staffName?: string | null,
        workspaceId?: string,
    ) {
        let resolvedMemberId: string | null = null;
        let targetWsId = workspaceId && UUID_REGEX.test(workspaceId) ? workspaceId : undefined;

        let conv: any = null;
        if (UUID_REGEX.test(conversationId)) {
            try {
                conv = await this.prisma.conversation.findUnique({
                    where: { id: conversationId },
                    include: { customer: true },
                });
                if (conv?.workspaceId && !targetWsId) {
                    targetWsId = conv.workspaceId;
                }
            } catch {
                conv = null;
            }
        }

        resolvedMemberId = await this.resolveWorkspaceMemberId(staffId, targetWsId);

        if (conv) {
            await this.prisma.conversation.update({
                where: { id: conv.id },
                data: { assignedMemberId: resolvedMemberId },
            });

            if (conv.customer) {
                const currentIdentities = (conv.customer.channelIdentities as any) || {};
                await this.prisma.customer.update({
                    where: { id: conv.customer.id },
                    data: {
                        channelIdentities: {
                            ...currentIdentities,
                            assignedStaffId: staffId || null,
                            assignedStaffName: staffName || null,
                            assignedMemberId: resolvedMemberId,
                        },
                    },
                });
            }
        } else {
            // Synthetic conversationId or lookup by channel identities
            const parts = conversationId.split('_');
            const channel = parts[0]?.toUpperCase();
            const senderExternalId = parts.length >= 3 ? parts.slice(2).join('_') : (parts.length === 2 ? parts[1] : null);

            let customer: any = null;
            if (senderExternalId) {
                customer = await this.prisma.customer.findFirst({
                    where: {
                        OR: [
                            ...(channel ? [{ channelIdentities: { path: [channel.toLowerCase()], equals: senderExternalId } }] : []),
                            { channelIdentities: { path: ['socialId'], equals: senderExternalId } },
                            { channelIdentities: { path: ['facebook'], equals: senderExternalId } },
                            { channelIdentities: { path: ['zalo', 'id'], equals: senderExternalId } },
                            { channelIdentities: { path: ['zalo'], equals: senderExternalId } },
                        ],
                    },
                });
            }

            if (customer) {
                const currentIdentities = (customer.channelIdentities as any) || {};
                await this.prisma.customer.update({
                    where: { id: customer.id },
                    data: {
                        channelIdentities: {
                            ...currentIdentities,
                            assignedStaffId: staffId || null,
                            assignedStaffName: staffName || null,
                            assignedMemberId: resolvedMemberId,
                        },
                    },
                });
                await this.prisma.conversation.updateMany({
                    where: {
                        customerId: customer.id,
                        ...(targetWsId ? { workspaceId: targetWsId } : {}),
                    },
                    data: { assignedMemberId: resolvedMemberId },
                });
            }
        }

        return {
            success: true,
            conversationId,
            assignedMemberId: resolvedMemberId,
            assignedStaffId: staffId || null,
            assignedStaffName: staffName || null,
        };
    }

    /**
     * Ph├ón giß║úi staffId (WorkspaceMember.id hoß║╖c User.id) th├ánh WorkspaceMember.id hß╗úp lß╗ç
     * ─Éß║úm bß║úo kh├┤ng bß╗ï vi phß║ím foreign key constraint cß╗ºa bß║úng workspace_members trong PostgreSQL.
     */
    async resolveWorkspaceMemberId(
        staffId?: string | null,
        workspaceId?: string | null,
    ): Promise<string | null> {
        if (!staffId || staffId === 'unassigned' || staffId === 'none' || staffId === 'all') {
            return null;
        }

        const cleanId = staffId.replace(/^(user|member|staff)-/, '');
        if (!UUID_REGEX.test(cleanId)) {
            return null;
        }

        const validWsId = workspaceId && UUID_REGEX.test(workspaceId) ? workspaceId : null;

        try {
            // 1. Kiß╗âm tra trß╗▒c tiß║┐p WorkspaceMember theo ID
            const memberById = await this.prisma.workspaceMember.findUnique({
                where: { id: cleanId },
                select: { id: true, workspaceId: true, isActive: true },
            });
            if (memberById) {
                return memberById.id;
            }

            // 2. Kiß╗âm tra nß║┐u staffId l├á User.id thuß╗Öc vß╗ü Workspace
            if (validWsId) {
                const memberByUserId = await this.prisma.workspaceMember.findUnique({
                    where: {
                        workspaceId_userId: {
                            workspaceId: validWsId,
                            userId: cleanId,
                        },
                    },
                    select: { id: true },
                });
                if (memberByUserId) {
                    return memberByUserId.id;
                }
            } else {
                const anyMember = await this.prisma.workspaceMember.findFirst({
                    where: { userId: cleanId },
                    select: { id: true },
                });
                if (anyMember) {
                    return anyMember.id;
                }
            }

            // 3. Nß║┐u User c├│ thß║¡t trong bß║úng User v├á ─æ├ú c├│ Workspace, tß╗▒ ─æß╗Öng tß║ío th├ánh vi├¬n Workspace
            if (validWsId) {
                const user = await this.prisma.user.findUnique({
                    where: { id: cleanId },
                    select: { id: true },
                });
                if (user) {
                    try {
                        const newMember = await this.prisma.workspaceMember.create({
                            data: {
                                workspaceId: validWsId,
                                userId: user.id,
                                role: 'STAFF',
                                isActive: true,
                            },
                            select: { id: true },
                        });
                        return newMember.id;
                    } catch {
                        const existing = await this.prisma.workspaceMember.findUnique({
                            where: {
                                workspaceId_userId: {
                                    workspaceId: validWsId,
                                    userId: user.id,
                                },
                            },
                            select: { id: true },
                        });
                        if (existing) return existing.id;
                    }
                }
            }
        } catch (err: any) {
            this.logger.warn(`Could not resolve workspace member for staffId ${staffId}: ${err?.message || err}`);
        }

        return null;
    }

    /**
     * ─Éß╗ông bß╗Ö assigned_member_id v├áo bß║úng Conversation trong DB.
     */
    async syncConversationAssignedMember(
        customerId: string,
        conversationId?: string,
        resolvedMemberId?: string | null,
        workspaceId?: string,
    ): Promise<void> {
        try {
            if (conversationId && UUID_REGEX.test(conversationId)) {
                await this.prisma.conversation.update({
                    where: { id: conversationId },
                    data: { assignedMemberId: resolvedMemberId || null },
                });
                return;
            }

            if (conversationId && conversationId.includes('_')) {
                const parts = conversationId.split('_');
                const senderExternalId = parts.length >= 3 ? parts.slice(2).join('_') : (parts.length === 2 ? parts[1] : null);

                if (senderExternalId && UUID_REGEX.test(customerId)) {
                    await this.prisma.conversation.updateMany({
                        where: {
                            customerId,
                            ...(workspaceId && UUID_REGEX.test(workspaceId) ? { workspaceId } : {}),
                        },
                        data: { assignedMemberId: resolvedMemberId || null },
                    });
                    return;
                }
            }

            if (customerId && UUID_REGEX.test(customerId)) {
                await this.prisma.conversation.updateMany({
                    where: {
                        customerId,
                        ...(workspaceId && UUID_REGEX.test(workspaceId) ? { workspaceId } : {}),
                    },
                    data: { assignedMemberId: resolvedMemberId || null },
                });
            }
        } catch (err: any) {
            this.logger.warn(`Could not sync conversation assignedMemberId: ${err?.message || err}`);
        }
    }

    private async findExistingCustomer(id: string, conversationId?: string, body?: UpdateCustomerDto): Promise<any> {
        let existing: any = null;

        // 1. Match exact standard UUID
        if (UUID_REGEX.test(id)) {
            try {
                existing = await this.prisma.customer.findUnique({
                    where: { id },
                    include: { conversations: { include: { channelAccount: true, assignedMember: true }, take: 3, orderBy: { lastMessageAt: 'desc' } } },
                });
            } catch {
                existing = null;
            }
        }

        // 2. Match prefixed UUIDs (e.g., cust-<uuid> or cand-<uuid>)
        if (!existing) {
            const strippedUuid = id.replace(/^(cust|cand)-/, '');
            if (UUID_REGEX.test(strippedUuid)) {
                try {
                    existing = await this.prisma.customer.findUnique({
                        where: { id: strippedUuid },
                        include: { conversations: { include: { channelAccount: true, assignedMember: true }, take: 3, orderBy: { lastMessageAt: 'desc' } } },
                    });
                } catch {
                    existing = null;
                }
            }
        }

        // 3. Match via conversationId if provided
        if (!existing && conversationId) {
            if (UUID_REGEX.test(conversationId)) {
                try {
                    const conv = await this.prisma.conversation.findUnique({
                        where: { id: conversationId },
                        include: { customer: true },
                    });
                    if (conv?.customer) {
                        existing = conv.customer;
                    }
                } catch {
                    existing = null;
                }
            } else {
                const parts = conversationId.split('_');
                const channel = parts[0]?.toLowerCase();
                const senderExternalId = parts.length >= 3 ? parts.slice(2).join('_') : (parts.length === 2 ? parts[1] : null);
                if (senderExternalId) {
                    try {
                        existing = await this.prisma.customer.findFirst({
                            where: {
                                OR: [
                                    ...(channel ? [{ channelIdentities: { path: [channel], equals: senderExternalId } }] : []),
                                    { channelIdentities: { path: ['facebook'], equals: senderExternalId } },
                                    { channelIdentities: { path: ['zalo', 'id'], equals: senderExternalId } },
                                    { channelIdentities: { path: ['zalo'], equals: senderExternalId } },
                                    { channelIdentities: { path: ['socialId'], equals: senderExternalId } },
                                ],
                            },
                            orderBy: { updatedAt: 'desc' },
                            include: { conversations: { include: { channelAccount: true, assignedMember: true }, take: 3, orderBy: { lastMessageAt: 'desc' } } },
                        });
                    } catch {
                        existing = null;
                    }
                }
            }
        }

        // 4. Fallback to socialId or personal identifier lookups
        if (!existing) {
            const cleanSocialId = id.replace(/^(cust|cand)-(facebook-|zalo-)?/, '').replace(/^(facebook|zalo)-/, '');
            const validPhone = body?.phone && body.phone !== 'Ch╞░a c├│ S─ÉT' ? body.phone : null;
            const validEmail = body?.email && body.email !== 'Ch╞░a c├│ Email' ? body.email : null;
            const validName = body?.fullName && !body.fullName.startsWith('Kh├ích h├áng') && !body.fullName.startsWith('Lead') ? body.fullName : null;

            try {
                existing = await this.prisma.customer.findFirst({
                    where: {
                        OR: [
                            { channelIdentities: { path: ['facebook'], equals: cleanSocialId } },
                            { channelIdentities: { path: ['zalo', 'id'], equals: cleanSocialId } },
                            { channelIdentities: { path: ['zalo'], equals: cleanSocialId } },
                            { channelIdentities: { path: ['socialId'], equals: cleanSocialId } },
                            { channelIdentities: { path: ['facebook'], equals: id } },
                            ...(validPhone ? [{ phone: validPhone }] : []),
                            ...(validEmail ? [{ email: validEmail }] : []),
                            ...(validName ? [{ fullName: validName }] : []),
                        ],
                    },
                    orderBy: { updatedAt: 'desc' },
                    include: { conversations: { include: { channelAccount: true, assignedMember: true }, take: 3, orderBy: { lastMessageAt: 'desc' } } },
                });
            } catch {
                existing = null;
            }
        }

        return existing;
    }

    private async provisionNewCustomer(id: string, body: UpdateCustomerDto, headerWsId?: string) {
        const cleanSocialId = id.replace(/^(cust|cand)-(facebook-|zalo-)?/, '').replace(/^(facebook|zalo)-/, '');
        const validPhone = body.phone && body.phone !== 'Ch╞░a c├│ S─ÉT' ? body.phone : null;
        const validEmail = body.email && body.email !== 'Ch╞░a c├│ Email' ? body.email : null;
        let newCust: any;

        let resolvedMemberId: string | null = null;
        if (body.assignedStaffId !== undefined || body.assignedMemberId !== undefined) {
            resolvedMemberId = await this.resolveWorkspaceMemberId(
                body.assignedMemberId !== undefined ? body.assignedMemberId : body.assignedStaffId,
                headerWsId,
            );
        }

        const customerPayload = {
            fullName: body.fullName || (id.startsWith('cand-') ? 'ß╗¿ng vi├¬n mß╗¢i' : 'Kh├ích h├áng'),
            phone: validPhone,
            email: validEmail,
            leadStatus: body.leadStatus || 'NEW',
            leadStage: body.leadStage || 'STAGE_NEW',
            channelIdentities: {
                socialId: cleanSocialId,
                facebook: cleanSocialId,
                leadStatus: body.leadStatus || 'NEW',
                leadStage: body.leadStage || 'STAGE_NEW',
                ...(body.interestCourses !== undefined ? { interestCourses: body.interestCourses } : {}),
                ...(body.estimatedValue !== undefined ? { estimatedValue: body.estimatedValue } : {}),
                ...(body.tags !== undefined ? { tags: body.tags } : {}),
                ...(body.assignedStaffId !== undefined ? { assignedStaffId: body.assignedStaffId } : {}),
                ...(body.assignedStaffName !== undefined ? { assignedStaffName: body.assignedStaffName } : {}),
                ...(resolvedMemberId !== null ? { assignedMemberId: resolvedMemberId } : {}),
            },
        };

        try {
            newCust = await this.prisma.customer.create({
                data: {
                    ...(headerWsId && UUID_REGEX.test(headerWsId) ? { workspaceId: headerWsId } : {}),
                    ...customerPayload,
                },
            });
        } catch {
            newCust = await this.prisma.customer.create({
                data: {
                    ...(headerWsId && UUID_REGEX.test(headerWsId) ? { workspaceId: headerWsId } : {}),
                    fullName: customerPayload.fullName,
                    phone: customerPayload.phone,
                    email: customerPayload.email,
                    channelIdentities: customerPayload.channelIdentities,
                },
            });
        }

        if (body.conversationId && UUID_REGEX.test(body.conversationId)) {
            try {
                await this.prisma.conversation.update({
                    where: { id: body.conversationId },
                    data: {
                        customerId: newCust.id,
                        ...(resolvedMemberId !== null ? { assignedMemberId: resolvedMemberId } : {}),
                    },
                });
            } catch { }
        }

        if (body.leadStage !== undefined || body.leadStatus !== undefined) {
            try {
                this.realtime?.broadcastPipelineChange({
                    customerId: newCust.id,
                    customerName: newCust.fullName,
                    newStage: (body.leadStage || 'STAGE_NEW') as string,
                    previousStage: 'STAGE_NEW',
                    updatedBy: body.updatedBy || 'Hß╗ç thß╗æng CRM',
                });
            } catch { }
        }

        return {
            ...newCust,
            leadStatus: newCust.leadStatus || body.leadStatus || 'NEW',
            leadStage: newCust.leadStage || body.leadStage || 'STAGE_NEW',
            interestCourses: body.interestCourses || [],
            estimatedValue: body.estimatedValue || 0,
        };
    }

    private async handlePhoneMerge(existing: any, phone: string, headerWsId?: string, updatedBy?: string) {
        const normalizedPhone = standardizeVietnamesePhoneNumber(phone);
        if (!normalizedPhone || !this.mergeService) return null;

        try {
            const currentIdentities = (existing.channelIdentities as any) || {};
            const fbId = currentIdentities.facebook || (existing.id.startsWith('facebook-') ? existing.id.replace('facebook-', '') : null);
            const zaloId = currentIdentities.zalo?.id || (typeof currentIdentities.zalo === 'string' ? currentIdentities.zalo : null) || currentIdentities.zaloId || currentIdentities.socialId;

            let currentContact = null;
            if (fbId || zaloId) {
                const idnt = await this.prisma.channelIdentity.findFirst({
                    where: {
                        OR: [
                            fbId ? { channel: 'FACEBOOK', externalUserId: String(fbId) } : undefined,
                            zaloId ? { channel: 'ZALO', externalUserId: String(zaloId) } : undefined,
                        ].filter(Boolean) as any,
                    },
                    include: { contact: true },
                });
                currentContact = idnt?.contact || null;
            }

            const collisionCheck = await this.mergeService.checkDuplicatePhone(normalizedPhone, currentContact?.id);
            if (collisionCheck.hasCollision && collisionCheck.existingContact) {
                if (currentContact && currentContact.id !== collisionCheck.existingContact.id) {
                    const mergedResult = await this.mergeService.mergeContacts({
                        targetContactId: collisionCheck.existingContact.id,
                        sourceContactId: currentContact.id,
                        phoneNormalized: normalizedPhone,
                        actorId: updatedBy,
                        mergeType: 'AUTO_PHONE_MATCH',
                        reason: 'Tß╗▒ ─æß╗Öng gß╗Öp kh├ích h├áng theo S─ÉT',
                        workspaceId: headerWsId,
                    });
                    this.logger.log(`[CUS-04] Auto-merged contact ${currentContact.id} into ${collisionCheck.existingContact.id} via phone ${normalizedPhone}`);
                    return mergedResult;
                }
            } else if (currentContact && !currentContact.phoneNormalized) {
                await this.prisma.contact.update({
                    where: { id: currentContact.id },
                    data: { phoneNormalized: normalizedPhone },
                }).catch(() => { });
            }
        } catch (mergeErr) {
            this.logger.warn(`L╞░u ├╜ khi xß╗¡ l├╜ gß╗Öp S─ÉT: ${(mergeErr as Error).message}`);
        }
        return null;
    }

    private async syncConversationTags(customerId: string, conversationId?: string, cleanTags?: string[]) {
        return this.tagService.syncConversationTags(customerId, conversationId, cleanTags);
    }

    /**
     * ß║¿n danh h├│a th├┤ng tin c├í nh├ón kh├ích h├áng, tin nhß║»n v├á lead theo Nghß╗ï ─æß╗ïnh 13/2023/N─É-CP.
     * Bß║úo to├án 100% sß╗æ liß╗çu tß╗òng hß╗úp (KPI, phß╗àu tuyß╗ân sinh, doanh thu).
     * Sau khi ß║⌐n danh: kh├┤ng c├▓n t├¬n hay S─ÉT n├áo c├│ thß╗â truy vß║┐t ra ng╞░ß╗¥i ─æ├│.
     */
    async anonymizeCustomer(customerId: string, actorId?: string, reason?: string) {
        const customer = await this.prisma.customer.findUnique({
            where: { id: customerId },
            include: {
                conversations: {
                    include: {
                        messages: true,
                    },
                },
            },
        });

        if (!customer) {
            throw new NotFoundException(`Kh├┤ng t├¼m thß║Ñy kh├ích h├áng vß╗¢i ID ${customerId}`);
        }

        const originalName = customer.fullName;
        const originalPhone = customer.phone;
        const anonToken = customer.id.replace(/-/g, '').slice(0, 6).toUpperCase();
        const anonName = `Kh├ích h├áng ß║⌐n danh #${anonToken}`;
        const anonPhone = '09********';

        // 1. Cß║¡p nhß║¡t ß║⌐n danh Customer
        const updatedCustomer = await this.prisma.customer.update({
            where: { id: customerId },
            data: {
                fullName: anonName,
                phone: anonPhone,
                phoneNormalized: null,
                email: null,
                avatarUrl: null,
                channelIdentities: Prisma.JsonNull,
                notes: `Dß╗» liß╗çu c├í nh├ón ─æ├ú ─æ╞░ß╗úc ß║⌐n danh theo Nghß╗ï ─æß╗ïnh 13/2023/N─É-CP (L├╜ do: ${reason || 'Y├¬u cß║ºu tß╗½ chß╗º thß╗â dß╗» liß╗çu'}).`,
            },
        });

        // 2. ß║¿n danh Contact li├¬n kß║┐t nß║┐u c├│
        try {
            if (customer.phoneNormalized) {
                await this.prisma.contact.updateMany({
                    where: { phoneNormalized: customer.phoneNormalized },
                    data: {
                        displayName: `Li├¬n hß╗ç ß║⌐n danh #${anonToken}`,
                        phoneNormalized: null,
                        email: null,
                        notes: 'Th├┤ng tin c├í nh├ón ─æ├ú ─æ╞░ß╗úc ß║⌐n danh theo Nghß╗ï ─æß╗ïnh 13/2023/N─É-CP.',
                    },
                });
            }
        } catch { }

        // 3. X├│a hoß║╖c ß║⌐n danh c├íc ChannelIdentity li├¬n kß║┐t
        try {
            await this.prisma.channelIdentity.deleteMany({
                where: { customerId: customer.id },
            });
        } catch { }

        // 4. L├ám sß║ích nß╗Öi dung tin nhß║»n v├á ─æoß║ín tr├¡ch hß╗Öi thoß║íi
        try {
            const convIds = customer.conversations.map((c) => c.id);
            if (convIds.length > 0) {
                // Cß║¡p nhß║¡t snippet cß╗ºa hß╗Öi thoß║íi
                await this.prisma.conversation.updateMany({
                    where: { id: { in: convIds } },
                    data: {
                        snippet: '[Hß╗Öi thoß║íi ─æ├ú ─æ╞░ß╗úc ß║⌐n danh theo Nghß╗ï ─æß╗ïnh 13/2023/N─É-CP]',
                    },
                });

                // L├ám sß║ích nß╗Öi dung tin nhß║»n
                for (const conv of customer.conversations) {
                    for (const msg of conv.messages) {
                        let cleanContent = msg.content || '';
                        if (originalPhone && cleanContent) {
                            cleanContent = cleanContent.replace(new RegExp(originalPhone, 'gi'), '[S─ÉT ─É├â ß║¿N DANH]');
                        }
                        if (originalName && cleanContent) {
                            cleanContent = cleanContent.replace(new RegExp(originalName, 'gi'), '[T├èN ─É├â ß║¿N DANH]');
                        }
                        // Qu├⌐t mß╗ìi chuß╗ùi giß╗æng sß╗æ ─æiß╗çn thoß║íi
                        cleanContent = cleanContent.replace(/(?:\+84|0)[235789][0-9]{8}\b/g, '[S─ÉT ─É├â ß║¿N DANH]');

                        await this.prisma.message.update({
                            where: { id: msg.id },
                            data: {
                                content: cleanContent,
                                attachments: [],
                            },
                        }).catch(() => { });
                    }
                }
            }
        } catch (msgErr) {
            this.logger.warn(`Lß╗ùi khi l├ám sß║ích tin nhß║»n ß║⌐n danh: ${(msgErr as Error).message}`);
        }

        // 5. Ghi log kiß╗âm to├ín
        this.logger.log(`[PDPD-ANONYMIZE] Customer ${customerId} anonymized successfully by actor ${actorId || 'system'}. Original PII removed.`);

        // 6. Ph├ít s├│ng Realtime ─æß╗â cß║¡p nhß║¡t giao diß╗çn
        if (this.realtime) {
            try {
                this.realtime.broadcastPipelineChange({
                    customerId: customer.id,
                    customerName: anonName,
                    newStage: (customer.leadStage || 'STAGE_NEW') as string,
                    previousStage: (customer.leadStage || 'STAGE_NEW') as string,
                    updatedBy: 'Hß╗ç thß╗æng PDPD (Nghß╗ï ─æß╗ïnh 13)',
                });
            } catch { }
        }

        return {
            success: true,
            anonymizedCustomerId: customer.id,
            anonymizedName: anonName,
            message: '─É├ú ß║⌐n danh h├│a th├ánh c├┤ng th├┤ng tin c├í nh├ón theo Nghß╗ï ─æß╗ïnh 13/2023/N─É-CP.',
            retainedMetrics: {
                leadStatus: customer.leadStatus,
                leadStage: customer.leadStage,
                workspaceId: customer.workspaceId,
            },
        };
    }
}
