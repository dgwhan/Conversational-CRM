import { Controller, Get, Post, Param, Body, Query, BadRequestException, Req } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import { Channel } from '../domain/channel.js';
import { ContactMergeService } from '../application/contact-merge.service.js';
import { getRequestIdentity, requireWorkspaceId } from '../../../common/auth/request-identity.js';
import { standardizeVietnamesePhoneNumber } from '../../customers/domain/phone-standardizer.js';

/**
 * Contact, ChannelIdentity và gộp / tách hồ sơ (CUS-04).
 * Mọi truy vấn đều giới hạn trong workspace đã được WorkspaceContextGuard xác minh.
 */
@Controller('contacts')
export class ContactController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly mergeService: ContactMergeService,
    ) {}

    @Get()
    async getContacts(@Req() req: unknown) {
        const items = await this.prisma.contact.findMany({
            where: { workspaceId: requireWorkspaceId(req), isMerged: false },
            include: { channelIdentities: true },
            orderBy: { updatedAt: 'desc' },
        });
        return { items, total: items.length };
    }

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
        const { userId } = getRequestIdentity(req);
        return this.mergeService.mergeContacts({
            targetContactId: body.targetContactId,
            sourceContactId: body.sourceContactId,
            phoneNormalized: body.phoneNormalized,
            actorId: userId,
            mergeType: 'MANUAL_STAFF',
            reason: body.reason,
            workspaceId: requireWorkspaceId(req),
        });
    }

    @Post('unmerge/:mergeLogId')
    async unmergeContact(
        @Req() req: unknown,
        @Param('mergeLogId') mergeLogId: string,
        @Body() body?: { reason?: string },
    ) {
        return this.mergeService.unmergeContact({
            mergeLogId,
            actorId: getRequestIdentity(req).userId,
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
