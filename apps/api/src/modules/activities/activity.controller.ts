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
        @Query('customerId') customerId?: string,
        @Query('type') type?: string,
        @Query('status') status?: string,
        @Query('priority') priority?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const workspaceId = queryWsId || headerWsId || '';
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
    ) {
        const workspaceId = queryWsId || headerWsId || '';
        return this.activityService.getCalendarEvents(workspaceId, startDate, endDate);
    }

    /**
     * Lấy danh sách nhiệm vụ / cuộc gọi cần kích hoạt chuông nhắc nhở
     */
    @Get('due-reminders')
    async getDueReminders(
        @Headers('x-workspace-id') headerWsId?: string,
        @Query('workspaceId') queryWsId?: string,
    ) {
        const workspaceId = queryWsId || headerWsId || '';
        return this.activityService.getDueReminders(workspaceId);
    }

    /**
     * Lấy chi tiết một hoạt động
     */
    @Get(':id')
    async getActivityById(@Param('id') id: string) {
        return this.activityService.findById(id);
    }

    /**
     * Tạo mới nhật ký cuộc gọi / lịch hẹn / nhiệm vụ
     */
    @Post()
    @SkipCsrf()
    async createActivity(
        @Body() body: CreateActivityDto,
        @Headers('x-workspace-id') headerWsId?: string,
        @Req() req?: any,
    ) {
        const workspaceId = body.workspaceId || headerWsId || '';
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
    ) {
        return this.activityService.update(id, body);
    }

    /**
     * Xóa hoạt động
     */
    @Delete(':id')
    @SkipCsrf()
    async deleteActivity(@Param('id') id: string) {
        return this.activityService.delete(id);
    }

    /**
     * Endpoint tiện ích kích hoạt tự động tạo Task xếp phòng máy cho thí sinh
     */
    @Post('auto-test-task')
    @SkipCsrf()
    async triggerAutoTestTask(
        @Body() body: { workspaceId?: string; customerId: string; customerName: string; notes?: string },
        @Headers('x-workspace-id') headerWsId?: string,
    ) {
        const workspaceId = body.workspaceId || headerWsId || '';
        return this.activityService.autoCreateTestTask(
            workspaceId,
            body.customerId,
            body.customerName,
            body.notes,
        );
    }
}
