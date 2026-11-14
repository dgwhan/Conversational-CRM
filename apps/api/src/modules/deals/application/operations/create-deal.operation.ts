import { Injectable, Logger, BadRequestException, Optional } from '@nestjs/common';
import { PrismaService } from '../../../../platform/database/prisma.service.js';
import { RealtimeService } from '../../../realtime/realtime.service.js';
import { CreateDealDto } from '../dto/deal.dto.js';
import { isValidUuid, sanitizeEntityId } from '../../domain/utils/deal-identifier.util.js';
import { DEFAULT_DEAL_CONFIG } from '../../domain/constants/deal.constants.js';

@Injectable()
export class CreateDealOperation {
    private readonly logger = new Logger(CreateDealOperation.name);

    constructor(
        private readonly prisma: PrismaService,
        @Optional() private readonly realtime?: RealtimeService,
    ) { }

    /**
     * Tạo một cơ hội mới cho Khách hàng (Deal)
     * Cho phép 1 Contact / Customer có nhiều Deals mà không bị ghi đè dữ liệu lịch sử
     */
    async execute(dto: CreateDealDto): Promise<any> {
        if (!dto.workspaceId) {
            throw new BadRequestException('workspaceId is required');
        }

        const safeWsId = isValidUuid(dto.workspaceId) ? dto.workspaceId : undefined;
        if (!safeWsId) {
            throw new BadRequestException('workspaceId must be a valid UUID');
        }

        let safeCustomerId = sanitizeEntityId(dto.customerId);

        // Tự động tìm hoặc tạo Customer khi tạo deal từ thông tin khách hàng nhập tay
        if (!safeCustomerId && (dto.customerName || dto.customerPhone || dto.customerEmail)) {
            const trimmedPhone = dto.customerPhone?.trim() || null;
            let existingCust = trimmedPhone
                ? await this.prisma.customer.findFirst({
                    where: {
                        workspaceId: safeWsId,
                        OR: [
                            { phone: trimmedPhone },
                            { phoneNormalized: trimmedPhone },
                        ],
                    },
                })
                : null;

            if (!existingCust && dto.customerEmail?.trim()) {
                existingCust = await this.prisma.customer.findFirst({
                    where: {
                        workspaceId: safeWsId,
                        email: dto.customerEmail.trim(),
                    },
                });
            }

            if (existingCust) {
                safeCustomerId = existingCust.id;
            } else {
                const resolvedCustomerName =
                    dto.customerName?.trim() ||
                    dto.customerPhone?.trim() ||
                    dto.customerEmail?.trim() ||
                    DEFAULT_DEAL_CONFIG.DEFAULT_CUSTOMER_NAME;

                const newCustomer = await this.prisma.customer.create({
                    data: {
                        workspaceId: safeWsId,
                        fullName: resolvedCustomerName,
                        phone: trimmedPhone,
                        phoneNormalized: trimmedPhone,
                        email: dto.customerEmail?.trim() || null,
                        leadStatus: DEFAULT_DEAL_CONFIG.DEFAULT_CUSTOMER_LEAD_STATUS,
                        channelIdentities: {
                            channel: DEFAULT_DEAL_CONFIG.DEFAULT_CUSTOMER_CHANNEL,
                            source: DEFAULT_DEAL_CONFIG.DEFAULT_CUSTOMER_CHANNEL,
                        },
                    },
                });
                safeCustomerId = newCustomer.id;
            }
        }

        const safeContactId = isValidUuid(dto.contactId) ? dto.contactId : undefined;
        const safeTitle = (dto.title?.trim() || DEFAULT_DEAL_CONFIG.DEFAULT_DEAL_TITLE).slice(0, 250);
        const safeStage = (dto.stage?.trim() || DEFAULT_DEAL_CONFIG.DEFAULT_STAGE).slice(0, 50);
        const safeIntake = dto.intake ? dto.intake.slice(0, 100) : null;
        const safePriority = (dto.priority?.trim() || DEFAULT_DEAL_CONFIG.DEFAULT_PRIORITY).slice(0, 50);
        const safeStatus = (dto.status?.trim() || DEFAULT_DEAL_CONFIG.DEFAULT_STATUS).slice(0, 50);
        const safeStaffName = dto.assignedStaffName ? dto.assignedStaffName.slice(0, 200) : null;

        const deal = await this.prisma.deal.create({
            data: {
                workspaceId: safeWsId,
                customerId: safeCustomerId,
                contactId: safeContactId,
                assignedMemberId: isValidUuid(dto.assignedMemberId) ? dto.assignedMemberId : null,
                title: safeTitle,
                stage: safeStage,
                pipelineId: dto.pipelineId || null,
                intake: safeIntake,
                courses: Array.isArray(dto.courses) ? dto.courses : [],
                expectedRevenue: Number(dto.expectedRevenue) || 0,
                actualRevenue: dto.actualRevenue !== undefined ? Number(dto.actualRevenue) : 0,
                priority: safePriority,
                status: safeStatus,
                lostReason: dto.lostReason ? dto.lostReason.slice(0, 250) : null,
                expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : null,
                actualCloseDate: dto.actualCloseDate ? new Date(dto.actualCloseDate) : null,
                assignedStaffName: safeStaffName,
                notes: dto.notes || null,
                metadata: dto.metadata || {},
            },
            include: {
                customer: {
                    select: {
                        id: true,
                        fullName: true,
                        phone: true,
                        email: true,
                        avatarUrl: true,
                    },
                },
                contact: {
                    select: {
                        id: true,
                        displayName: true,
                        phoneNormalized: true,
                        email: true,
                    },
                },
            },
        });

        this.logger.log(`[CreateDealOperation] Đã tạo cơ hội mới: "${deal.title}" cho khách hàng ${deal.customer?.fullName || deal.contact?.displayName || deal.id}`);

        try {
            this.realtime?.emit('deal:created', {
                workspaceId: safeWsId,
                deal,
            });
        } catch { }

        return deal;
    }
}
