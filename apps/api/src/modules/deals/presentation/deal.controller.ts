import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    Query,
    Headers,
    Req,
    UseGuards,
    ForbiddenException,
} from '@nestjs/common';
import { DealService } from '../application/deal.service.js';
import { CreateDealDto, UpdateDealDto } from '../application/dto/deal.dto.js';
import { SkipCsrf } from '../../../common/decorators/skip-csrf.decorator.js';
import { getRequestIdentity, requireWorkspaceId } from '../../../common/auth/request-identity.js';
import { WorkspaceRolesGuard } from '../../../common/guards/workspace-roles.guard.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { WorkspaceRole } from '../../../contracts/roles.js';
import { DEFAULT_DEAL_CONFIG, DEAL_SYSTEM_MESSAGES } from '../domain/constants/deal.constants.js';

@Controller('deals')
@UseGuards(WorkspaceRolesGuard)
export class DealController {
    constructor(private readonly dealService: DealService) { }

    /**
     * Lấy danh sách các cơ hội (Deals / Opportunities)
     * STAFF: Chỉ xem được Deal được phân công cho mình
     */
    @Get()
    @Roles(WorkspaceRole.OWNER, WorkspaceRole.MANAGER, WorkspaceRole.STAFF)
    async getDeals(
        @Headers('x-workspace-id') headerWsId?: string,
        @Query('workspaceId') queryWsId?: string,
        @Req() req?: any,
        @Query('customerId') customerId?: string,
        @Query('contactId') contactId?: string,
        @Query('stage') stage?: string,
        @Query('status') status?: string,
        @Query('intake') intake?: string,
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ): Promise<any> {
        const workspaceId = requireWorkspaceId(req);
        const { role, userId } = getRequestIdentity(req);
        return this.dealService.findAll({
            workspaceId,
            customerId,
            contactId,
            stage,
            status,
            intake,
            search,
            page,
            limit,
            callerRole: role,
            callerUserId: userId,
        });
    }

    /**
     * Lấy toàn bộ các cơ hội (Deals) của một khách hàng
     */
    @Get('customer/:customerId')
    @Roles(WorkspaceRole.OWNER, WorkspaceRole.MANAGER, WorkspaceRole.STAFF)
    async getDealsByCustomer(@Param('customerId') customerId: string, @Req() req?: any): Promise<any> {
        const workspaceId = requireWorkspaceId(req);
        const { role, userId } = getRequestIdentity(req);
        return this.dealService.findDealsByCustomer(customerId, workspaceId, { role, userId });
    }

    /**
     * Lấy chi tiết một cơ hội
     * STAFF: Nếu xem Deal của người khác sẽ bị chặn 403 Forbidden
     */
    @Get(':id')
    @Roles(WorkspaceRole.OWNER, WorkspaceRole.MANAGER, WorkspaceRole.STAFF)
    async getDealById(@Param('id') id: string, @Req() req?: any): Promise<any> {
        const workspaceId = requireWorkspaceId(req);
        const { role, userId } = getRequestIdentity(req);
        return this.dealService.findById(id, workspaceId, { role, userId });
    }

    /**
     * Tạo một cơ hội mới cho Khách hàng
     */
    @Post()
    @SkipCsrf()
    @Roles(WorkspaceRole.OWNER, WorkspaceRole.MANAGER, WorkspaceRole.STAFF)
    async createDeal(
        @Body() body: CreateDealDto,
        @Req() req?: any,
    ): Promise<any> {
        const workspaceId = requireWorkspaceId(req);
        return this.dealService.create({ ...body, workspaceId });
    }

    /**
     * Cập nhật thông tin cơ hội / chuyển giai đoạn phễu
     * STAFF: Chỉ được cập nhật Deal mình phụ trách, không được tự ý đổi người phụ trách
     */
    @Patch(':id')
    @SkipCsrf()
    @Roles(WorkspaceRole.OWNER, WorkspaceRole.MANAGER, WorkspaceRole.STAFF)
    async updateDeal(
        @Param('id') id: string,
        @Body() body: UpdateDealDto,
        @Req() req?: any,
    ): Promise<any> {
        const workspaceId = requireWorkspaceId(req);
        const { role, userId } = getRequestIdentity(req);
        const updatedBy =
            req?.user?.fullName ||
            body.updatedBy ||
            req?.user?.email ||
            DEFAULT_DEAL_CONFIG.DEFAULT_UPDATED_BY;
        return this.dealService.update(id, { ...body, updatedBy }, workspaceId, { role, userId });
    }

    /**
     * Xóa một cơ hội
     * Chỉ OWNER hoặc MANAGER mới có quyền xóa Deal, cấm STAFF xóa
     */
    @Delete(':id')
    @SkipCsrf()
    @Roles(WorkspaceRole.OWNER, WorkspaceRole.MANAGER)
    async deleteDeal(@Param('id') id: string, @Req() req?: any): Promise<any> {
        const workspaceId = requireWorkspaceId(req);
        const { role, userId } = getRequestIdentity(req);
        if (role !== WorkspaceRole.OWNER && role !== WorkspaceRole.MANAGER) {
            throw new ForbiddenException(DEAL_SYSTEM_MESSAGES.CANNOT_DELETE_DEAL);
        }
        return this.dealService.delete(id, workspaceId, { role, userId });
    }
}
