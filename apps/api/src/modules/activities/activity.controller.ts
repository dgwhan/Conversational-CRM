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
} from '@nestjs/common';
import { ActivityService } from './activity.service.js';
import {
    CreateActivityDto,
    UpdateActivityDto,
    ActivityFilterDto,
} from './dto/activity.dto.js';
import { SkipCsrf } from '../../common/decorators/skip-csrf.decorator.js';
import { requireWorkspaceId } from '../../common/auth/request-identity.js';

@Controller('activities')
export class ActivityController {
    constructor(private readonly activityService: ActivityService) { }

    /**
     * Lấy danh sách nhật ký tương tác và nhiệm vụ
     */
    @Get()
    async getActivities(
        @Headers('x-workspace-id') headerWsId?: string,
        @Query('workspaceId') queryWsId?: string,
        @Req() req?: any,
        @Query('customerId') customerId?: string,
        @Query('type') type?: string,
        @Query('status') status?: string,
        @Query('priority') priority?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ): Promise<any> {
        // Workspace đã được WorkspaceContextGuard xác minh tư cách thành viên
        const workspaceId = requireWorkspaceId(req);
        return this.activityService.findAll({
            workspaceId,
            customerId,
            type,
            status,
            priority,
            startDate,
            endDate,
            search,
            page,
            limit,
        });
    }

    /**
     * Lấy dữ liệu sự kiện phục vụ hiển thị trên Calendar
     */
    @Get('calendar')
    async getCalendarEvents(
        @Headers('x-workspace-id') headerWsId?: string,
        @Query('workspaceId') queryWsId?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Req() req?: any,
    ): Promise<any> {
        const workspaceId = requireWorkspaceId(req);
        return this.activityService.getCalendarEvents(workspaceId, startDate, endDate);
    }

    /**
     * Lấy danh sách nhiệm vụ / cuộc gọi cần kích hoạt chuông nhắc nhở
     */
    @Get('due-reminders')
    async getDueReminders(
        @Headers('x-workspace-id') headerWsId?: string,
        @Query('workspaceId') queryWsId?: string,
        @Req() req?: any,
    ): Promise<any> {
        const workspaceId = requireWorkspaceId(req);
        return this.activityService.getDueReminders(workspaceId);
    }

    /**
     * Lấy chi tiết một hoạt động
     */
    @Get(':id')
    async getActivityById(@Param('id') id: string, @Req() req?: any): Promise<any> {
        return this.activityService.findById(id, requireWorkspaceId(req));
    }

    /**
     * Tạo mới nhật ký cuộc gọi / lịch hẹn / nhiệm vụ
     */
    @Post()
    @SkipCsrf()
    async createActivity(
        @Body() body: CreateActivityDto,
        @Req() req?: any,
    ): Promise<any> {
        const workspaceId = requireWorkspaceId(req);
        const creatorId = req?.user?.id;
        return this.activityService.create({ ...body, workspaceId }, creatorId);
    }

    /**
     * Cập nhật thông tin hoạt động / đánh dấu hoàn thành
     */
    @Patch(':id')
    @SkipCsrf()
    async updateActivity(
        @Param('id') id: string,
        @Body() body: UpdateActivityDto,
        @Req() req?: any,
    ): Promise<any> {
        return this.activityService.update(id, body, requireWorkspaceId(req));
    }

    /**
     * Xóa hoạt động
     */
    @Delete(':id')
    @SkipCsrf()
    async deleteActivity(@Param('id') id: string, @Req() req?: any): Promise<any> {
        return this.activityService.delete(id, requireWorkspaceId(req));
    }

    /**
     * Endpoint tiện ích kích hoạt tự động tạo Task xếp phòng máy cho thí sinh
     */
    @Post('auto-test-task')
    @SkipCsrf()
    async triggerAutoTestTask(
        @Body() body: { workspaceId?: string; customerId: string; customerName: string; notes?: string },
        @Req() req?: any,
    ): Promise<any> {
        const workspaceId = requireWorkspaceId(req);
        return this.activityService.autoCreateTestTask(
            workspaceId,
            body.customerId,
            body.customerName,
            body.notes,
        );
    }
}
