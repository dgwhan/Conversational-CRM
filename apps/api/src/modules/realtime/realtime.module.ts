import { Module } from '@nestjs/common';
import { RealtimeService } from './realtime.service.js';
import { RealtimeController } from './realtime.controller.js';
import { RealtimeTicketGuard } from './realtime-ticket.guard.js';

@Module({
  controllers: [RealtimeController],
  providers: [RealtimeService, RealtimeTicketGuard],
  exports: [RealtimeService],
})
export class RealtimeModule {}
