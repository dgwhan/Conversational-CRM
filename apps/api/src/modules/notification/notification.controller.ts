import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Query,
  Req,
  Headers,
} from '@nestjs/common';
import { NotificationService } from './notification.service.js';
import { NotificationType, NotificationSeverity } from '@prisma/client';

@Controller('v1/workspaces/:wsId/notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getNotifications(
    @Param('wsId') workspaceId: string,
    @Req() req: any,
    @Headers('x-owner-id') ownerId?: string,
    @Headers('x-staff-id') staffId?: string,
    @Query('userId') queryUserId?: string,
    @Query('isRead') isRead?: string,
    @Query('type') type?: NotificationType,
    @Query('severity') severity?: NotificationSeverity,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // Chỉ dùng người dùng đã xác thực: không cho phép xem thông báo riêng của người khác qua ?userId / header
    const callerId = req?.user?.id;
    const isReadBool =
      isRead === 'true' ? true : isRead === 'false' ? false : undefined;

    return this.notificationService.findAll(workspaceId, {
      userId: callerId,
      isRead: isReadBool,
      type,
      severity,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Patch(':id/read')
  async markAsRead(
    @Param('wsId') workspaceId: string,
    @Param('id') id: string,
  ): Promise<any> {
    return this.notificationService.markAsRead(workspaceId, id);
  }

  @Post('read-all')
  async markAllAsRead(@Param('wsId') workspaceId: string) {
    return this.notificationService.markAllAsRead(workspaceId);
  }

  @Delete(':id')
  async deleteNotification(
    @Param('wsId') workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.notificationService.delete(workspaceId, id);
  }
}

@Controller('v1/notifications')
export class PersonalNotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Patch(':id/read')
  async markPersonalAsRead(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.notificationService.markPersonalNotificationAsRead(
      req?.user?.id,
      id,
    );
  }
}
