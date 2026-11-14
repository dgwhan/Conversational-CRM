import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../../../platform/database/prisma.service.js';
import { RealtimeService } from '../../../realtime/realtime.service.js';
import { DealAccessPolicy } from '../../domain/policies/deal-access.policy.js';
import { DEAL_SYSTEM_MESSAGES } from '../../domain/constants/deal.constants.js';
import { FindDealsOperation } from './find-deals.operation.js';

@Injectable()
export class DeleteDealOperation {
    constructor(
        private readonly prisma: PrismaService,
        private readonly findDealsOp: FindDealsOperation,
        @Optional() private readonly realtime?: RealtimeService,
    ) { }

    /**
     * Xóa một Deal
     */
    async execute(
        id: string,
        workspaceId?: string,
        caller?: { role?: string; userId?: string },
    ): Promise<{ success: boolean; message: string }> {
        DealAccessPolicy.validateStaffDeletePermissions(caller?.role);

        const existing = await this.findDealsOp.findById(id, workspaceId, caller);
        await this.prisma.deal.delete({ where: { id: existing.id } });

        try {
            this.realtime?.emit('deal:deleted', {
                workspaceId: existing.workspaceId,
                dealId: id,
            });
        } catch { }

        return { success: true, message: DEAL_SYSTEM_MESSAGES.DEAL_DELETED_SUCCESS };
    }
}
