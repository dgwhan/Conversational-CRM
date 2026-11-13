import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    Query,
    Optional,
    ForbiddenException,
    Req,
} from '@nestjs/common';
import { CustomerService, UpdateCustomerDto } from '../application/customer.service.js';
import { RealtimeService } from '../../realtime/realtime.service.js';
import { ContactMergeService } from '../application/contact-merge.service.js';
import { ActivityService } from '../../activities/activity.service.js';
import { getRequestIdentity, requireWorkspaceId } from '../../../common/auth/request-identity.js';
import { WorkspaceRole } from '../../../contracts/roles.js';

/**
 * Controller managing workspace customers, recruitment leads, and pipeline stages.
 * Presentation layer delegating business workflows to CustomerService.
 */
@Controller('customers')
export class CustomerController {
    private readonly customerService: CustomerService;

    constructor(
        customerServiceOrPrisma: CustomerService,
        @Optional() realtime?: RealtimeService,
        @Optional() mergeService?: ContactMergeService,
        @Optional() activityService?: ActivityService,
    ) {
        if (customerServiceOrPrisma && typeof (customerServiceOrPrisma as any).getCustomers === 'function') {
            this.customerService = customerServiceOrPrisma;
        } else {
            this.customerService = new CustomerService(customerServiceOrPrisma as any, realtime, mergeService, undefined, activityService);
        }
    }

    /** Danh sách khách hàng (phân trang, tìm kiếm không dấu, lọc theo trạng thái / giai đoạn). STAFF chỉ thấy khách mình phụ trách. */
    @Get()
    async getCustomers(
        @Req() req: unknown,
        @Query('search') search?: string,
        @Query('page') pageStr?: string,
        @Query('limit') limitStr?: string,
        @Query('leadStatus') leadStatus?: string,
        @Query('leadStage') leadStage?: string,
    ) {
        const { role, userId: staffId } = getRequestIdentity(req);
        return this.customerService.getCustomers({
            rawWsId: requireWorkspaceId(req),
            search,
            pageStr,
            limitStr,
            leadStatus,
            leadStage,
            role,
            staffId,
        });
    }

    /** Tạo khách hàng nhập tay (VD: nút "Thêm" trên Kanban). */
    @Post()
    async createCustomer(@Req() req: unknown, @Body() body: UpdateCustomerDto) {
        const { role, userId: staffId } = getRequestIdentity(req);
        return this.customerService.createCustomer(body ?? {}, requireWorkspaceId(req), { role, staffId });
    }

    /** Chi tiết khách hàng. STAFF xem khách của người khác -> 403. */
    @Get(':id')
    async getCustomerById(@Req() req: unknown, @Param('id') id: string) {
        const { role, userId: staffId } = getRequestIdentity(req);
        return this.customerService.getCustomerById(id, { role, staffId, workspaceId: requireWorkspaceId(req) });
    }

    /** Phân công nhân sự cho hội thoại (chỉ OWNER). */
    @Patch('conversations/:conversationId/assign')
    async assignConversation(
        @Req() req: unknown,
        @Param('conversationId') conversationId: string,
        @Body() body: { staffId?: string | null; staffName?: string | null },
    ) {
        if (getRequestIdentity(req).role !== WorkspaceRole.OWNER) {
            throw new ForbiddenException('Nhân viên không có quyền phân công cuộc hội thoại cho người khác (403 Forbidden).');
        }
        return this.customerService.assignConversation(
            conversationId,
            body?.staffId,
            body?.staffName,
            requireWorkspaceId(req),
        );
    }

    /** Cập nhật hồ sơ / giai đoạn / trạng thái lead. STAFF chỉ sửa khách mình phụ trách. */
    @Patch(':id')
    async updateCustomer(@Req() req: unknown, @Param('id') id: string, @Body() body: UpdateCustomerDto) {
        const { role, userId: staffId } = getRequestIdentity(req);
        return this.customerService.updateCustomer(id, body ?? {}, requireWorkspaceId(req), { role, staffId });
    }

    /** Gỡ một tag khỏi khách hàng và các hội thoại liên quan. STAFF chỉ thao tác trên khách mình phụ trách. */
    @Delete(':id/tags/:tag')
    async removeCustomerTag(@Req() req: unknown, @Param('id') id: string, @Param('tag') tag: string) {
        const identity = getRequestIdentity(req);
        const workspaceId = requireWorkspaceId(req);
        await this.customerService.assertCanModifyCustomer(id, { ...identity, workspaceId });
        return this.customerService.removeCustomerTag(id, tag, workspaceId);
    }

    /** Ẩn danh hóa dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP. Không thể hoàn tác: chỉ OWNER. */
    @Post(':id/anonymize')
    async anonymizeCustomer(@Req() req: unknown, @Param('id') id: string, @Body() body?: { reason?: string }) {
        const identity = getRequestIdentity(req);
        if (identity.role !== WorkspaceRole.OWNER) {
            throw new ForbiddenException('Chỉ chủ workspace mới được ẩn danh hóa khách hàng (403 Forbidden).');
        }
        return this.customerService.anonymizeCustomer(id, identity.userId, body?.reason, requireWorkspaceId(req));
    }
}
