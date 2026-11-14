import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../../platform/database/prisma.service.js';
import { DealFilterDto } from '../dto/deal.dto.js';
import { WorkspaceRole } from '../../../../contracts/roles.js';
import { isValidUuid, sanitizeEntityId } from '../../domain/utils/deal-identifier.util.js';
import { DealAccessPolicy } from '../../domain/policies/deal-access.policy.js';
import { DEAL_SYSTEM_MESSAGES } from '../../domain/constants/deal.constants.js';

@Injectable()
export class FindDealsOperation {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Lấy danh sách Deal / Cơ hội có phân trang và bộ lọc
     */
    async findAll(filter: DealFilterDto): Promise<any> {
        const safeWsId = isValidUuid(filter.workspaceId) ? filter.workspaceId : undefined;
        if (!safeWsId) {
            return { items: [], total: 0, page: 1, limit: 50 };
        }

        const page = Math.max(1, Number(filter.page) || 1);
        const limit = Math.min(200, Math.max(1, Number(filter.limit) || 50));
        const skip = (page - 1) * limit;

        const where: any = { workspaceId: safeWsId };

        const sanitizedCustomerId = sanitizeEntityId(filter.customerId);
        if (sanitizedCustomerId) {
            where.customerId = sanitizedCustomerId;
        }

        if (filter.contactId && isValidUuid(filter.contactId)) {
            where.contactId = filter.contactId;
        }

        if (filter.stage && filter.stage !== 'ALL') {
            where.stage = filter.stage;
        }

        if (filter.status && filter.status !== 'ALL') {
            where.status = filter.status;
        }

        if (filter.intake && filter.intake !== 'ALL') {
            where.intake = filter.intake;
        }

        if (filter.search) {
            const term = filter.search.trim();
            where.OR = [
                { title: { contains: term, mode: 'insensitive' } },
                { intake: { contains: term, mode: 'insensitive' } },
                { assignedStaffName: { contains: term, mode: 'insensitive' } },
                { customer: { fullName: { contains: term, mode: 'insensitive' } } },
                { contact: { displayName: { contains: term, mode: 'insensitive' } } },
            ];
        }

        // Role STAFF: Chỉ xem Deal được phân công cho mình hoặc khách hàng mình phụ trách
        if (filter.callerRole === WorkspaceRole.STAFF && filter.callerUserId) {
            const memberIds: string[] = [];
            try {
                const members = await this.prisma.workspaceMember.findMany({
                    where: { userId: filter.callerUserId, workspaceId: safeWsId },
                    select: { id: true },
                });
                members.forEach((m) => memberIds.push(m.id));
            } catch { }

            where.AND = [
                ...(where.AND ? (Array.isArray(where.AND) ? where.AND : [where.AND]) : []),
                {
                    OR: [
                        { assignedMember: { userId: filter.callerUserId } },
                        ...(memberIds.length > 0 ? [{ assignedMemberId: { in: memberIds } }] : []),
                        { customer: { conversations: { some: { assignedMember: { userId: filter.callerUserId } } } } },
                        ...(memberIds.length > 0 ? [{ customer: { conversations: { some: { assignedMemberId: { in: memberIds } } } } }] : []),
                        { customer: { channelIdentities: { path: ['assignedStaffId'], equals: filter.callerUserId } } },
                    ],
                },
            ];
        }

        const [items, total] = await Promise.all([
            this.prisma.deal.findMany({
                where,
                include: {
                    customer: {
                        select: {
                            id: true,
                            fullName: true,
                            phone: true,
                            email: true,
                            avatarUrl: true,
                            leadStatus: true,
                        },
                    },
                    contact: {
                        select: {
                            id: true,
                            displayName: true,
                            phoneNormalized: true,
                            email: true,
                        },
                    },
                    activities: {
                        take: 5,
                        orderBy: { createdAt: 'desc' },
                    },
                },
                orderBy: { updatedAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.deal.count({ where }),
        ]);

        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Lấy lịch sử tất cả các Deals của một Khách hàng
     */
    async findDealsByCustomer(
        customerIdOrContactId: string,
        workspaceId?: string,
        caller?: { role?: string; userId?: string },
    ): Promise<any> {
        const stripped = sanitizeEntityId(customerIdOrContactId);
        if (!stripped) return [];

        const deals = await this.prisma.deal.findMany({
            where: {
                ...(workspaceId ? { workspaceId } : {}),
                OR: [
                    { customerId: stripped },
                    { contactId: stripped },
                ],
            },
            include: {
                customer: {
                    include: {
                        conversations: {
                            select: {
                                id: true,
                                assignedMemberId: true,
                                assignedMember: { select: { userId: true } },
                            },
                        },
                    },
                },
                contact: true,
                assignedMember: true,
                activities: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        if (caller?.role === WorkspaceRole.STAFF && caller?.userId) {
            return deals.filter((deal) => DealAccessPolicy.isDealAssignedToStaff(deal, caller.userId!));
        }

        return deals;
    }

    /**
     * Lấy chi tiết 1 Deal
     */
    async findById(
        id: string,
        workspaceId?: string,
        caller?: { role?: string; userId?: string },
    ): Promise<any> {
        if (!isValidUuid(id)) {
            throw new NotFoundException(DEAL_SYSTEM_MESSAGES.DEAL_NOT_FOUND(id));
        }
        const deal = await this.prisma.deal.findUnique({
            where: { id },
            include: {
                customer: {
                    include: {
                        conversations: {
                            select: {
                                id: true,
                                assignedMemberId: true,
                                assignedMember: { select: { userId: true } },
                            },
                        },
                    },
                },
                contact: true,
                assignedMember: true,
                activities: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        // Bản ghi thuộc workspace khác được coi như không tồn tại (không lộ sự tồn tại giữa các tenant)
        if (!deal || (workspaceId && deal.workspaceId !== workspaceId)) {
            throw new NotFoundException(DEAL_SYSTEM_MESSAGES.DEAL_NOT_FOUND(id));
        }

        // Role STAFF: Nếu vào Deal của người khác sẽ trả về lỗi 403 Forbidden
        if (caller?.role === WorkspaceRole.STAFF && caller?.userId) {
            const isAssigned = DealAccessPolicy.isDealAssignedToStaff(deal, caller.userId);
            if (!isAssigned) {
                throw new ForbiddenException(DEAL_SYSTEM_MESSAGES.DEAL_ACCESS_DENIED);
            }
        }

        return deal;
    }
}
