import { Module, forwardRef } from '@nestjs/common';
import { DealController } from './presentation/deal.controller.js';
import { DealService } from './application/deal.service.js';
import { CreateDealOperation } from './application/operations/create-deal.operation.js';
import { FindDealsOperation } from './application/operations/find-deals.operation.js';
import { UpdateDealOperation } from './application/operations/update-deal.operation.js';
import { DeleteDealOperation } from './application/operations/delete-deal.operation.js';
import { PrismaModule } from '../../platform/database/prisma.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { ActivityModule } from '../activities/activity.module.js';

@Module({
    imports: [PrismaModule, RealtimeModule, forwardRef(() => ActivityModule)],
    controllers: [DealController],
    providers: [
        DealService,
        CreateDealOperation,
        FindDealsOperation,
        UpdateDealOperation,
        DeleteDealOperation,
    ],
    exports: [
        DealService,
        CreateDealOperation,
        FindDealsOperation,
        UpdateDealOperation,
        DeleteDealOperation,
    ],
})
export class DealModule { }
