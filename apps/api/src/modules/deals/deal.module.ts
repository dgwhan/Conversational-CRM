import { Module, forwardRef } from '@nestjs/common';
import { DealController } from './deal.controller.js';
import { DealService } from './deal.service.js';
import { PrismaModule } from '../../platform/database/prisma.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { ActivityModule } from '../activities/activity.module.js';

@Module({
    imports: [PrismaModule, RealtimeModule, forwardRef(() => ActivityModule)],
    controllers: [DealController],
    providers: [DealService],
    exports: [DealService],
})
export class DealModule { }
