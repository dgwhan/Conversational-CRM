import { Controller, Get, Headers, Logger, Query, Req } from '@nestjs/common';
import { MessageRepository } from '../infrastructure/message.repository.js';
import { getRequestIdentity } from '../../../common/auth/request-identity.js';

@Controller('messages')
export class MessageController {
    private readonly logger = new Logger(MessageController.name);

    constructor(private readonly messageRepo: MessageRepository) {}

    /**
     * Lấy danh sách tin nhắn đã được lưu vào cơ sở dữ liệu (Unified Inbox dùng để dựng hội thoại)
     */
    @Get()
    async getSavedMessages(
        @Query('page') pageStr?: string,
        @Query('limit') limitStr?: string,
        @Query('channel') channel?: string,
        @Query('search') search?: string,
        @Query('workspaceId') queryWorkspaceId?: string,
        @Headers('x-workspace-id') headerWorkspaceId?: string,
        @Req() req?: any,
    ) {
        const page = Math.max(1, parseInt(pageStr || '1', 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(limitStr || '20', 10) || 20));
        const offset = (page - 1) * limit;

        // Danh tính / vai trò lấy từ phiên đã xác thực (JwtAuthGuard + WorkspaceContextGuard), không tin header client
        const identity = getRequestIdentity(req);
        const effectiveWorkspaceId = identity.workspaceId ?? queryWorkspaceId ?? headerWorkspaceId;
        const effectiveRole = identity.role;
        const effectiveStaffId = identity.userId;

        try {
            const { items, total } = await this.messageRepo.findMany({
                workspaceId: effectiveWorkspaceId,
                limit,
                offset,
                channel,
                search,
                role: effectiveRole,
                staffId: effectiveStaffId,
            });

            return {
                items,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };
        } catch (err: any) {
            this.logger.error(`Error in getSavedMessages: ${err?.message || err}`, err?.stack);
            return {
                items: [],
                total: 0,
                page,
                limit,
                totalPages: 0,
            };
        }
    }
}
