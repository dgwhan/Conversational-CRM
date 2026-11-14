import {
    Controller,
    Get,
    Post,
    Param,
    Body,
    Query,
    Headers,
    Logger,
    BadRequestException,
    ForbiddenException,
    Req,
    UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import { Channel } from '../domain/channel.js';
import { ContactMergeService } from '../application/contact-merge.service.js';
import { getRequestIdentity, requireWorkspaceId } from '../../../common/auth/request-identity.js';
import { WorkspaceRolesGuard } from '../../../common/guards/workspace-roles.guard.js';
import { WorkspaceRole } from '../../../contracts/roles.js';

/**
 * Controller quản lý Contact, ChannelIdentity, và Hợp nhất Contact (CUS-04).
 * Đã được bảo vệ phân quyền theo từng Không gian làm việc (WorkspaceRolesGuard) chống IDOR và rò rỉ dữ liệu.
 */
@Controller('contacts')
@UseGuards(WorkspaceRolesGuard)
export class ContactController {
    private readonly logger = new Logger(ContactController.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly mergeService: ContactMergeService,
    ) {}

    /**
     * Lấy danh sách liên hệ thuộc Workspace hiện tại kèm định danh kênh.
     */
    @Get()
    async getContacts(@Req() req: any) {
        const workspaceId = requireWorkspaceId(req);
        const { role, userId } = getRequestIdentity(req);

        let where: any = { workspaceId, isMerged: false };

        // STAFF: Chỉ xem danh bạ thuộc các hội thoại, deal hoặc khách hàng được phân công cho mình
        if (role === WorkspaceRole.STAFF && userId) {
            const memberIds: string[] = [];
            try {
                const members = await this.prisma.workspaceMember.findMany({
                    where: { userId, workspaceId },
                    select: { id: true },
                });
                members.forEach((m) => memberIds.push(m.id));
            } catch { }

            where = {
                workspaceId,
                isMerged: false,
                OR: [
                    {
                        deals: {
                            some: {
                                OR: [
                                    { assignedMember: { userId } },
                                    ...(memberIds.length > 0 ? [{ assignedMemberId: { in: memberIds } }] : []),
                                ],
                            },
                        },
                    },
                    {
                        channelIdentities: {
                            some: {
                                customer: {
                                    OR: [
                                        { conversations: { some: { assignedMember: { userId } } } },
                                        ...(memberIds.length > 0 ? [{ conversations: { some: { assignedMemberId: { in: memberIds } } } }] : []),
                                        { channelIdentities: { path: ['assignedStaffId'], equals: userId } },
                                    ],
                                },
                            },
                        },
                    },
                ],
            };
        }

        const items = await this.prisma.contact.findMany({
            where,
            include: { channelIdentities: true },
            orderBy: { updatedAt: 'desc' },
        });
        return { items, total: items.length };
    }

    /**
     * Kiểm tra số điện thoại có bị trùng với contact khác không trong workspace
     */
    @Get('check-duplicate-phone')
    async checkDuplicatePhone(
        @Query('phone') phone: string,
        @Query('excludeContactId') excludeContactId?: string,
    ) {
        if (!phone) {
            return { isValid: false, normalizedPhone: null, existingContact: null, hasCollision: false };
        }
        return this.mergeService.checkDuplicatePhone(phone, excludeContactId);
    }

    /**
     * Thực hiện gộp 2 Contacts về 1 Contact duy nhất (CUS-04)
     */
    @Post('merge')
    async mergeContacts(
        @Body()
        body: {
            targetContactId: string;
            sourceContactId: string;
            phoneNormalized?: string;
            reason?: string;
            workspaceId?: string;
        },
        @Headers('x-actor-id') headerActorId?: string,
        @Req() req?: any,
    ) {
        if (!body.targetContactId || !body.sourceContactId) {
            throw new BadRequestException('targetContactId và sourceContactId là bắt buộc');
        }

        const workspaceId = requireWorkspaceId(req);
        const { role, userId } = getRequestIdentity(req);

        // STAFF: Chỉ được gộp các contact thuộc phạm vi phân công của mình
        if (role === WorkspaceRole.STAFF && userId) {
            const allowedCount = await this.prisma.contact.count({
                where: {
                    id: { in: [body.targetContactId, body.sourceContactId] },
                    workspaceId,
                    OR: [
                        {
                            deals: {
                                some: {
                                    assignedMember: { userId },
                                },
                            },
                        },
                        {
                            channelIdentities: {
                                some: {
                                    customer: {
                                        OR: [
                                            { conversations: { some: { assignedMember: { userId } } } },
                                            { channelIdentities: { path: ['assignedStaffId'], equals: userId } },
                                        ],
                                    },
                                },
                            },
                        },
                    ],
                },
            });
            if (allowedCount < 2) {
                throw new ForbiddenException(
                    'Bạn chỉ được gộp các liên hệ thuộc phạm vi phân công của mình (403 Forbidden).',
                );
            }
        }

        return this.mergeService.mergeContacts({
            targetContactId: body.targetContactId,
            sourceContactId: body.sourceContactId,
            phoneNormalized: body.phoneNormalized,
            actorId: userId,
            mergeType: 'MANUAL_STAFF',
            reason: body.reason,
            workspaceId,
        });
    }

    /**
     * Tách lại / Hoàn tác gộp nếu gộp nhầm (CUS-04)
     */
    @Post('unmerge/:mergeLogId')
    async unmergeContact(
        @Param('mergeLogId') mergeLogId: string,
        @Body() body?: { reason?: string },
        @Headers('x-actor-id') headerActorId?: string,
        @Req() req?: any,
    ) {
        if (!mergeLogId) {
            throw new BadRequestException('mergeLogId là bắt buộc');
        }

        const { role, userId } = getRequestIdentity(req);
        if (role === WorkspaceRole.STAFF) {
            throw new ForbiddenException(
                'Nhân viên không có quyền hoàn tác gộp liên hệ (403 Forbidden).',
            );
        }

        return this.mergeService.unmergeContact({
            mergeLogId,
            actorId: userId,
            reason: body?.reason,
        });
    }

    /**
     * Lấy lịch sử các lần gộp qua Query Param (phone, customerId, contactId)
     */
    @Get('merge-history')
    async getMergeHistoryByQuery(
        @Query('identifier') identifier?: string,
        @Query('phone') phone?: string,
        @Query('contactId') contactId?: string,
        @Query('customerId') customerId?: string,
    ): Promise<any> {
        const id = contactId || customerId || phone || identifier || '';
        return this.mergeService.getMergeHistory(id);
    }

    /**
     * Lấy lịch sử các lần gộp của một Contact / Customer / SĐT
     */
    @Get(':id/merge-history')
    async getMergeHistory(@Param('id') contactId: string, @Query('phone') phone?: string): Promise<any> {
        return this.mergeService.getMergeHistory(phone || contactId);
    }

    /**
     * Tra cứu contact và danh tính kênh theo định danh, chỉ trong workspace hiện tại.
     */
    @Get('lookup')
    async lookupContact(
        @Req() req: any,
        @Query('channel') channel?: string,
        @Query('externalUserId') externalUserId?: string,
        @Query('phone') phone?: string,
        @Query('email') email?: string,
    ) {
        const workspaceId = requireWorkspaceId(req);

        if (channel && externalUserId) {
            const identity = await this.prisma.channelIdentity.findFirst({
                where: {
                    channel: channel.toUpperCase() as Channel,
                    externalUserId,
                    workspaceId,
                },
                include: {
                    contact: {
                        include: { channelIdentities: true },
                    },
                },
            });
            if (identity && identity.contact) {
                return { contact: identity.contact, channelIdentities: identity.contact.channelIdentities };
            }
        }

        if (phone) {
            const contact = await this.prisma.contact.findFirst({
                where: { workspaceId, phoneNormalized: phone, isMerged: false },
                include: { channelIdentities: true },
            });
            if (contact) return { contact, channelIdentities: contact.channelIdentities };
        }

        if (email) {
            const contact = await this.prisma.contact.findFirst({
                where: { workspaceId, email, isMerged: false },
                include: { channelIdentities: true },
            });
            if (contact) return { contact, channelIdentities: contact.channelIdentities };
        }

        return { contact: null, channelIdentities: [] };
    }
}
