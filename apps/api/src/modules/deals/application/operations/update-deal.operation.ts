import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../../../../platform/database/prisma.service.js';
import { RealtimeService } from '../../../realtime/realtime.service.js';
import { ActivityService } from '../../../activities/activity.service.js';
import { isTestAppointmentStage } from '../../../messaging/application/customer.service.js';
import { UpdateDealDto } from '../dto/deal.dto.js';
import { isValidUuid, sanitizeEntityId } from '../../domain/utils/deal-identifier.util.js';
import { DealAccessPolicy } from '../../domain/policies/deal-access.policy.js';
import { DEFAULT_DEAL_CONFIG } from '../../domain/constants/deal.constants.js';
import { FindDealsOperation } from './find-deals.operation.js';

@Injectable()
export class UpdateDealOperation {
    private readonly logger = new Logger(UpdateDealOperation.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly findDealsOp: FindDealsOperation,
        @Optional() private readonly realtime?: RealtimeService,
        @Optional() private readonly activityService?: ActivityService,
    ) { }

    /**
     * Cập nhật thông tin Deal / chuyển đổi giai đoạn phễu
     */
    async execute(
        id: string,
        dto: UpdateDealDto,
        workspaceId?: string,
        caller?: { role?: string; userId?: string },
    ): Promise<any> {
        // Role STAFF: Không được tự ý phân công cơ hội cho người khác
        DealAccessPolicy.validateStaffUpdatePermissions(caller?.role, dto);

        const existing = await this.findDealsOp.findById(id, workspaceId, caller);

        const updateData: any = {};
        if (dto.title !== undefined) updateData.title = dto.title.slice(0, 250);
        if (dto.pipelineId !== undefined) updateData.pipelineId = dto.pipelineId;
        if (dto.intake !== undefined) updateData.intake = dto.intake ? dto.intake.slice(0, 100) : null;
        if (dto.courses !== undefined) updateData.courses = Array.isArray(dto.courses) ? dto.courses : [];
        if (dto.expectedRevenue !== undefined) updateData.expectedRevenue = Number(dto.expectedRevenue);
        if (dto.actualRevenue !== undefined) updateData.actualRevenue = Number(dto.actualRevenue);
        if (dto.priority !== undefined) updateData.priority = dto.priority.slice(0, 50);
        if (dto.status !== undefined) updateData.status = dto.status.slice(0, 50);
        if (dto.lostReason !== undefined) updateData.lostReason = dto.lostReason ? dto.lostReason.slice(0, 250) : null;
        if (dto.assignedStaffName !== undefined) updateData.assignedStaffName = dto.assignedStaffName ? dto.assignedStaffName.slice(0, 200) : null;
        if (dto.notes !== undefined) updateData.notes = dto.notes;

        if (dto.assignedMemberId !== undefined) {
            updateData.assignedMemberId = isValidUuid(dto.assignedMemberId) ? dto.assignedMemberId : null;
        }
        if (dto.customerId !== undefined) {
            const stripped = sanitizeEntityId(dto.customerId);
            updateData.customerId = stripped || null;
        }
        if (existing.customerId && (dto.customerName || dto.customerPhone || dto.customerEmail)) {
            await this.prisma.customer.update({
                where: { id: existing.customerId },
                data: {
                    fullName: dto.customerName?.trim() || undefined,
                    phone: dto.customerPhone?.trim() || undefined,
                    phoneNormalized: dto.customerPhone?.trim() || undefined,
                    email: dto.customerEmail?.trim() || undefined,
                },
            }).catch(() => { });
        }
        if (dto.expectedCloseDate !== undefined) {
            updateData.expectedCloseDate = dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : null;
        }
        if (dto.actualCloseDate !== undefined) {
            updateData.actualCloseDate = dto.actualCloseDate ? new Date(dto.actualCloseDate) : null;
        }
        if (dto.metadata) {
            updateData.metadata = { ...(existing.metadata as any || {}), ...dto.metadata };
        }

        const isStageChanged = dto.stage !== undefined && dto.stage !== existing.stage;
        if (isStageChanged) {
            updateData.stage = dto.stage!.slice(0, 50);
            if (dto.stage === 'STAGE_ENROLLED' || dto.stage === 'ENROLLED') {
                updateData.status = 'WON';
                updateData.actualCloseDate = new Date();
            } else if (dto.stage === 'STAGE_LOST' || dto.stage === 'LOST') {
                updateData.status = 'LOST';
            }
        }

        const updated = await this.prisma.deal.update({
            where: { id },
            data: updateData,
            include: {
                customer: true,
                contact: true,
                assignedMember: true,
            },
        });

        // Tự động tạo Task liên quan nếu Deal chuyển sang giai đoạn hẹn kiểm tra
        if (isStageChanged && isTestAppointmentStage(dto.stage)) {
            const custName =
                updated.customer?.fullName ||
                updated.contact?.displayName ||
                DEFAULT_DEAL_CONFIG.DEFAULT_CUSTOMER_NAME;

            if (this.activityService && updated.customerId) {
                const taskTitle = `Cơ hội: ${updated.title}${updated.intake ? ` (${updated.intake})` : ''}`;
                this.activityService.autoCreateTestTask(
                    updated.workspaceId,
                    updated.customerId,
                    custName,
                    taskTitle,
                ).catch((err) => {
                    this.logger.warn(`Lỗi tự động tạo task test từ Deal: ${err.message}`);
                });
            }
        }

        // Phát realtime event
        try {
            this.realtime?.emit('deal:updated', {
                workspaceId: updated.workspaceId,
                deal: updated,
            });

            // Đồng bộ sang kanban
            if (isStageChanged) {
                this.realtime?.broadcastPipelineChange({
                    customerId: updated.customerId || updated.id,
                    customerName:
                        updated.customer?.fullName ||
                        updated.contact?.displayName ||
                        updated.title ||
                        DEFAULT_DEAL_CONFIG.DEFAULT_CUSTOMER_NAME,
                    newStage: updated.stage,
                    previousStage: existing.stage,
                    updatedBy: dto.updatedBy || caller?.userId || DEFAULT_DEAL_CONFIG.DEFAULT_UPDATED_BY,
                    channel: 'MANUAL',
                    channelAccountName: updated.title,
                    estimatedValue: updated.expectedRevenue,
                    interestCourses: updated.courses,
                    workspaceId: updated.workspaceId,
                });
            }
        } catch { }

        return updated;
    }
}
