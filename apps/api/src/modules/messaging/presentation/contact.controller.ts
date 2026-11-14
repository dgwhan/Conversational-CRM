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
import { standardizeVietnamesePhoneNumber } from '../../customers/domain/phone-standardizer.js';

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
        @Req() req: unknown,
        @Query('phone') phone?: string,
        @Query('excludeContactId') excludeContactId?: string,
    ) {
        if (!phone) {
            return { isValid: false, normalizedPhone: null, existingContact: null, hasCollision: false };
        }
        return this.mergeService.checkDuplicatePhone(requireWorkspaceId(req), phone, excludeContactId);
    }

    @Post('merge')
    async mergeContacts(
        @Req() req: unknown,
        @Body() body: { targetContactId?: string; sourceContactId?: string; phoneNormalized?: string; reason?: string },
    ) {
        if (!body?.targetContactId || !body?.sourceContactId) {
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

    @Post('unmerge/:mergeLogId')
    async unmergeContact(
        @Req() req: unknown,
        @Param('mergeLogId') mergeLogId: string,
        @Body() body?: { reason?: string },
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
            workspaceId: requireWorkspaceId(req),
        });
    }

    @Get('merge-history')
    async getMergeHistoryByQuery(
        @Req() req: unknown,
        @Query('identifier') identifier?: string,
        @Query('phone') phone?: string,
        @Query('contactId') contactId?: string,
        @Query('customerId') customerId?: string,
    ) {
        const id = contactId || customerId || phone || identifier || '';
        return this.mergeService.getMergeHistory(requireWorkspaceId(req), id);
    }

    @Get(':id/merge-history')
    async getMergeHistory(@Req() req: unknown, @Param('id') contactId: string, @Query('phone') phone?: string) {
        return this.mergeService.getMergeHistory(requireWorkspaceId(req), phone || contactId);
    }

    /** Tra cứu contact theo (kênh, external user ID), số điện thoại hoặc email. */
    @Get('lookup')
    async lookupContact(
        @Req() req: unknown,
        @Query('channel') channel?: string,
        @Query('externalUserId') externalUserId?: string,
        @Query('phone') phone?: string,
        @Query('email') email?: string,
    ) {
        const workspaceId = requireWorkspaceId(req);
        const base = { workspaceId, isMerged: false };

        const conditions = [
            channel && externalUserId
                ? { channelIdentities: { some: { channel: channel.toUpperCase() as Channel, externalUserId } } }
                : null,
            phone ? { phoneNormalized: standardizeVietnamesePhoneNumber(phone) || phone } : null,
            email ? { email } : null,
        ].filter((c): c is NonNullable<typeof c> => c !== null);

        for (const condition of conditions) {
            const contact = await this.prisma.contact.findFirst({
                where: { ...base, ...condition },
                include: { channelIdentities: true },
            });
            if (contact) return { contact, channelIdentities: contact.channelIdentities };
        }
        return { contact: null, channelIdentities: [] };
    }
}
