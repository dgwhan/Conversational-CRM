import { Module } from '@nestjs/common';
import { PrismaModule } from '../../platform/database/prisma.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { NotificationModule } from '../notification/notification.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { LeadRoutingController } from './lead-routing.controller.js';
import { LeadRoutingService } from './lead-routing.service.js';

@Module({
  imports: [PrismaModule, AuditModule, NotificationModule, RealtimeModule],
  controllers: [LeadRoutingController],
  providers: [LeadRoutingService],
  exports: [LeadRoutingService],
})
export class LeadRoutingModule {}
