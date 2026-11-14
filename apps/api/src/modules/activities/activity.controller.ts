import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req } from '@nestjs/common';
import { z } from 'zod';
import { ActivityService } from './activity.service.js';
import {
    createActivitySchema,
    updateActivitySchema,
    type CreateActivityDto,
    type UpdateActivityDto,
} from './dto/activity.dto.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { getRequestIdentity, requireWorkspaceId, type RequestIdentity } from '../../common/auth/request-identity.js';

const autoTestTaskSchema = z.object({
    customerId: z.string().trim().min(1).max(128),
    customerName: z.string().trim().min(1).max(255),
    notes: z.string().max(5_000).optional(),
});

/** Danh tính đã xác minh, kèm workspaceId bắt buộc. */
function scopedIdentity(req: unknown): RequestIdentity & { workspaceId: string } {
    return { ...getRequestIdentity(req), workspaceId: requireWorkspaceId(req) };
}

/**
 * Nhật ký tương tác & nhiệm vụ (cuộc gọi, lịch hẹn, công việc).
 * STAFF chỉ thấy / sửa hoạt động được giao cho mình hoặc chưa giao cho ai.
 */
@Controller('activities')
export class ActivityController {
    constructor(private readonly activityService: ActivityService) {}

    @Get()
    getActivities(
        @Req() req: unknown,
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
        const identity = scopedIdentity(req);
        return this.activityService.findAll(
            { workspaceId: identity.workspaceId, customerId, type, status, priority, startDate, endDate, search, page, limit },
            identity,
        );
    }

    @Get('calendar')
    getCalendarEvents(@Req() req: unknown, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
        const identity = scopedIdentity(req);
        return this.activityService.getCalendarEvents(identity.workspaceId, startDate, endDate, identity);
    }

    @Get('due-reminders')
    getDueReminders(@Req() req: unknown) {
        const identity = scopedIdentity(req);
        return this.activityService.getDueReminders(identity.workspaceId, identity);
    }

    @Get(':id')
    getActivityById(@Req() req: unknown, @Param('id') id: string) {
        return this.activityService.findById(id, requireWorkspaceId(req));
    }

    @Post()
    createActivity(
        @Req() req: unknown,
        @Body(new ZodValidationPipe(createActivitySchema)) body: Omit<CreateActivityDto, 'workspaceId'>,
    ) {
        const identity = scopedIdentity(req);
        return this.activityService.create({ ...body, workspaceId: identity.workspaceId }, identity.userId);
    }

    @Patch(':id')
    updateActivity(
        @Req() req: unknown,
        @Param('id') id: string,
        @Body(new ZodValidationPipe(updateActivitySchema)) body: UpdateActivityDto,
    ) {
        const identity = scopedIdentity(req);
        return this.activityService.update(id, body, identity.workspaceId, identity);
    }

    @Delete(':id')
    deleteActivity(@Req() req: unknown, @Param('id') id: string) {
        const identity = scopedIdentity(req);
        return this.activityService.delete(id, identity.workspaceId, identity);
    }

    /** Tạo task chuẩn bị phòng máy khi thí sinh hẹn test đầu vào. */
    @Post('auto-test-task')
    triggerAutoTestTask(
        @Req() req: unknown,
        @Body(new ZodValidationPipe(autoTestTaskSchema)) body: z.infer<typeof autoTestTaskSchema>,
    ) {
        return this.activityService.autoCreateTestTask(
            requireWorkspaceId(req),
            body.customerId,
            body.customerName,
            body.notes,
        );
    }
}
