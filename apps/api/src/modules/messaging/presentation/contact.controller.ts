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
    Req,
} from '@nestjs/common';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import { Channel } from '../domain/channel.js';
import { ContactMergeService } from '../application/contact-merge.service.js';
import { getRequestIdentity } from '../../../common/auth/request-identity.js';

/*
 * LƯU Ý BẢO MẬT (giới hạn của mô hình dữ liệu): bảng contacts / channel_identities / contact_merge_logs
 * hiện KHÔNG có cột workspace_id (số điện thoại chuẩn hóa là unique toàn hệ thống), nên các endpoint ở
 * đây mới chỉ được bảo vệ bằng xác thực toàn cục (JwtAuthGuard) chứ chưa cô lập theo workspace.
 * Muốn cô lập thật sự cần migration thêm workspace_id cho các bảng này. Danh tính người thực hiện
 * (actorId) luôn lấy từ token, không lấy từ header do client gửi.
 */

/**
 * Controller managing Contact, ChannelIdentity, and Contact Merge/Unmerge operations (CUS-04).
 */
@Controller('contacts')
export class ContactController {
    private readonly logger = new Logger(ContactController.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly mergeService: ContactMergeService,
    ) {}

    /**
     * Retrieve all contacts along with their linked channel identities.
     */
    @Get()
    async getContacts() {
        const items = await this.prisma.contact.findMany({
            where: { isMerged: false },
            include: { channelIdentities: true },
            orderBy: { updatedAt: 'desc' },
        });
        return { items, total: items.length };
    }

    /**
     * Kiểm tra số điện thoại có bị trùng với contact khác không
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

        return this.mergeService.mergeContacts({
            targetContactId: body.targetContactId,
            sourceContactId: body.sourceContactId,
            phoneNormalized: body.phoneNormalized,
            actorId: getRequestIdentity(req).userId,
            mergeType: 'MANUAL_STAFF',
            reason: body.reason,
            workspaceId: getRequestIdentity(req).workspaceId,
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

        return this.mergeService.unmergeContact({
            mergeLogId,
            actorId: getRequestIdentity(req).userId,
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
     * Look up a contact and its channel identities by channel & external user ID, phone, or email.
     */
    @Get('lookup')
    async lookupContact(
        @Query('channel') channel?: string,
        @Query('externalUserId') externalUserId?: string,
        @Query('phone') phone?: string,
        @Query('email') email?: string,
    ) {
        if (channel && externalUserId) {
            const identity = await this.prisma.channelIdentity.findUnique({
                where: {
                    channel_externalUserId: {
                        channel: channel.toUpperCase() as Channel,
                        externalUserId,
                    },
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
                where: { phoneNormalized: phone, isMerged: false },
                include: { channelIdentities: true },
            });
            if (contact) return { contact, channelIdentities: contact.channelIdentities };
        }

        if (email) {
            const contact = await this.prisma.contact.findFirst({
                where: { email, isMerged: false },
                include: { channelIdentities: true },
            });
            if (contact) return { contact, channelIdentities: contact.channelIdentities };
        }

        return { contact: null, channelIdentities: [] };
    }
}
