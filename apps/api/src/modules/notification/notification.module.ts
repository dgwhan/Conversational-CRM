import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service.js';
import {
  NotificationController,
  PersonalNotificationController,
} from './notification.controller.js';
import { PrismaModule } from '../../platform/database/prisma.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';

@Module({
  imports: [PrismaModule, RealtimeModule],
  controllers: [NotificationController, PersonalNotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
