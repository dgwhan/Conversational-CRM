import { Module } from '@nestjs/common';
import { PrismaModule } from '../../platform/database/prisma.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { NotificationModule } from '../notification/notification.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { LeadRoutingController } from './lead-routing.controller.js';
import { LeadAssignmentService } from './application/assignment/lead-assignment.service.js';
import { StaffAvailabilityService } from './application/availability/staff-availability.service.js';
import { LeadRoutingService } from './application/coordinator/lead-routing.service.js';
import { LeadHandoverService } from './application/handover/lead-handover.service.js';
import { LeadQueueService } from './application/queue/lead-queue.service.js';
import { ShiftManagementService } from './application/shifts/shift-management.service.js';
import { LeadRoutingSupportService } from './application/support/lead-routing-support.service.js';

@Module({
  imports: [PrismaModule, AuditModule, NotificationModule, RealtimeModule],
  controllers: [LeadRoutingController],
  providers: [
    LeadRoutingSupportService,
    ShiftManagementService,
    StaffAvailabilityService,
    LeadAssignmentService,
    LeadQueueService,
    LeadHandoverService,
    LeadRoutingService,
  ],
  exports: [
    LeadRoutingService,
    ShiftManagementService,
    StaffAvailabilityService,
    LeadAssignmentService,
    LeadQueueService,
    LeadHandoverService,
    LeadRoutingSupportService,
  ],
})
export class LeadRoutingModule {}
