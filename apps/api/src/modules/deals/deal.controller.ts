import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req } from '@nestjs/common';
import { DealService } from './deal.service.js';
import { createDealSchema, updateDealSchema, type CreateDealDto, type UpdateDealDto } from './dto/deal.dto.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { getRequestIdentity, requireWorkspaceId } from '../../common/auth/request-identity.js';

/**
 * Cơ hội tuyển sinh (Deals). Workspace và vai trò lấy từ request đã được WorkspaceContextGuard xác minh;
 * STAFF chỉ thấy / sửa deal được giao cho mình hoặc chưa giao cho ai.
 */
@Controller('deals')
export class DealController {
    constructor(private readonly dealService: DealService) {}

    @Get()
    getDeals(
        @Req() req: unknown,
        @Query('customerId') customerId?: string,
        @Query('contactId') contactId?: string,
        @Query('stage') stage?: string,
        @Query('status') status?: string,
        @Query('intake') intake?: string,
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const workspaceId = requireWorkspaceId(req);
        return this.dealService.findAll(
            { workspaceId, customerId, contactId, stage, status, intake, search, page, limit },
            { ...getRequestIdentity(req), workspaceId },
        );
    }

    @Get('customer/:customerId')
    getDealsByCustomer(@Req() req: unknown, @Param('customerId') customerId: string) {
        const workspaceId = requireWorkspaceId(req);
        return this.dealService.findDealsByCustomer(customerId, workspaceId, { ...getRequestIdentity(req), workspaceId });
    }

    @Get(':id')
    getDealById(@Req() req: unknown, @Param('id') id: string) {
        return this.dealService.findById(id, requireWorkspaceId(req));
    }

    @Post()
    createDeal(@Req() req: unknown, @Body(new ZodValidationPipe(createDealSchema)) body: Omit<CreateDealDto, 'workspaceId'>) {
        return this.dealService.create({ ...body, workspaceId: requireWorkspaceId(req) });
    }

    @Patch(':id')
    async updateDeal(
        @Req() req: unknown,
        @Param('id') id: string,
        @Body(new ZodValidationPipe(updateDealSchema)) body: UpdateDealDto,
    ) {
        const identity = getRequestIdentity(req);
        const workspaceId = requireWorkspaceId(req);
        const updatedBy = await this.dealService.resolveActorName(identity.userId);
        return this.dealService.update(id, { ...body, updatedBy }, workspaceId, { ...identity, workspaceId });
    }

    @Delete(':id')
    deleteDeal(@Req() req: unknown, @Param('id') id: string) {
        const workspaceId = requireWorkspaceId(req);
        return this.dealService.delete(id, workspaceId, { ...getRequestIdentity(req), workspaceId });
    }
}
