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
} from '@nestjs/common';
import { DealService } from './deal.service.js';
import { CreateDealDto, UpdateDealDto } from './dto/deal.dto.js';
import { SkipCsrf } from '../../common/decorators/skip-csrf.decorator.js';
import { requireWorkspaceId } from '../../common/auth/request-identity.js';

@Controller('deals')
export class DealController {
    constructor(private readonly dealService: DealService) { }

    /**
     * Lấy danh sách các cơ hội tuyển sinh (Deals / Opportunities)
     */
    @Get()
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
        // Workspace đã được WorkspaceContextGuard xác minh tư cách thành viên
        const workspaceId = requireWorkspaceId(req);
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
        });
    }

    /**
     * Lấy toàn bộ các đợt đăng ký / cơ hội tuyển sinh của một khách hàng
     */
    @Get('customer/:customerId')
    async getDealsByCustomer(@Param('customerId') customerId: string, @Req() req?: any): Promise<any> {
        return this.dealService.findDealsByCustomer(customerId, requireWorkspaceId(req));
    }

    /**
     * Lấy chi tiết một cơ hội tuyển sinh
     */
    @Get(':id')
    async getDealById(@Param('id') id: string, @Req() req?: any): Promise<any> {
        return this.dealService.findById(id, requireWorkspaceId(req));
    }

    /**
     * Tạo một cơ hội tuyển sinh mới (Khóa học mới, Niên khóa mới...) cho Học viên
     */
    @Post()
    @SkipCsrf()
    async createDeal(
        @Body() body: CreateDealDto,
        @Req() req?: any,
    ): Promise<any> {
        const workspaceId = requireWorkspaceId(req);
        return this.dealService.create({ ...body, workspaceId });
    }

    /**
     * Cập nhật thông tin cơ hội / chuyển giai đoạn phễu
     */
    @Patch(':id')
    @SkipCsrf()
    async updateDeal(
        @Param('id') id: string,
        @Body() body: UpdateDealDto,
        @Req() req?: any,
    ): Promise<any> {
        const updatedBy = req?.user?.fullName || body.updatedBy || 'Tư vấn viên';
        return this.dealService.update(id, { ...body, updatedBy }, requireWorkspaceId(req));
    }

    /**
     * Xóa một cơ hội tuyển sinh
     */
    @Delete(':id')
    @SkipCsrf()
    async deleteDeal(@Param('id') id: string, @Req() req?: any): Promise<any> {
        return this.dealService.delete(id, requireWorkspaceId(req));
    }
}
