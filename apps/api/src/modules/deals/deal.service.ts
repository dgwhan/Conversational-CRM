import { Injectable, Logger, NotFoundException, BadRequestException, Optional } from '@nestjs/common';
import { PrismaService } from '../../platform/database/prisma.service.js';
import { RealtimeService } from '../realtime/realtime.service.js';
import { ActivityService } from '../activities/activity.service.js';
import { isTestAppointmentStage } from '../messaging/application/customer.service.js';
import { CreateDealDto, UpdateDealDto, DealFilterDto } from './dto/deal.dto.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class DealService {
    private readonly logger = new Logger(DealService.name);

    constructor(
        private readonly prisma: PrismaService,
        @Optional() private readonly realtime?: RealtimeService,
        @Optional() private readonly activityService?: ActivityService,
    ) { }

    /**
     * Tạo một cơ hội tuyển sinh / đợt đăng ký mới cho Học viên (Deal / Registration)
     * Cho phép 1 Contact có N Deals mà không bị ghi đè dữ liệu lịch sử
     */
    async create(dto: CreateDealDto): Promise<any> {
        if (!dto.workspaceId) {
            throw new BadRequestException('workspaceId is required');
        }

        const safeWsId = UUID_REGEX.test(dto.workspaceId) ? dto.workspaceId : undefined;
        if (!safeWsId) {
            throw new BadRequestException('workspaceId must be a valid UUID');
        }

        let safeCustomerId: string | undefined = undefined;
        if (dto.customerId) {
            const stripped = dto.customerId.replace(/^(cust|cand)-/, '');
            if (UUID_REGEX.test(stripped)) {
                safeCustomerId = stripped;
            }
        }

        // Tự động tìm hoặc tạo Customer khi tạo deal từ thông tin học viên nhập tay
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
                const newCustomer = await this.prisma.customer.create({
                    data: {
                        workspaceId: safeWsId,
                        fullName: dto.customerName?.trim() || 'Học viên',
                        phone: trimmedPhone,
                        phoneNormalized: trimmedPhone,
                        email: dto.customerEmail?.trim() || null,
                        channel: 'MANUAL_IMPORT',
                        leadStatus: 'POTENTIAL',
                    },
                });
                safeCustomerId = newCustomer.id;
            }
        }

        let safeContactId: string | undefined = undefined;
        if (dto.contactId && UUID_REGEX.test(dto.contactId)) {
            safeContactId = dto.contactId;
        }

        const safeTitle = (dto.title || 'Cơ hội tuyển sinh').slice(0, 250);
        const safeStage = (dto.stage || 'STAGE_NEW').slice(0, 50);
        const safeIntake = dto.intake ? dto.intake.slice(0, 100) : null;
        const safePriority = (dto.priority || 'MEDIUM').slice(0, 50);
        const safeStatus = (dto.status || 'OPEN').slice(0, 50);
        const safeStaffName = dto.assignedStaffName ? dto.assignedStaffName.slice(0, 200) : null;

        const deal = await this.prisma.deal.create({
            data: {
                workspaceId: safeWsId,
                customerId: safeCustomerId,
                contactId: safeContactId,
                assignedMemberId: dto.assignedMemberId && UUID_REGEX.test(dto.assignedMemberId) ? dto.assignedMemberId : null,
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

        this.logger.log(`[DealService] Đã tạo cơ hội tuyển sinh mới: "${deal.title}" cho học viên ${deal.customer?.fullName || deal.contact?.displayName || deal.id}`);

        try {
            this.realtime?.emit('deal:created', {
                workspaceId: safeWsId,
                deal,
            });
        } catch { }

        return deal;
    }

    /**
     * Lấy danh sách Deal / Cơ hội có phân trang và bộ lọc
     */
    async findAll(filter: DealFilterDto): Promise<any> {
        const safeWsId = filter.workspaceId && UUID_REGEX.test(filter.workspaceId) ? filter.workspaceId : undefined;
        if (!safeWsId) {
            return { items: [], total: 0, page: 1, limit: 50 };
        }

        const page = Math.max(1, Number(filter.page) || 1);
        const limit = Math.min(200, Math.max(1, Number(filter.limit) || 50));
        const skip = (page - 1) * limit;

        const where: any = { workspaceId: safeWsId };

        if (filter.customerId) {
            const stripped = filter.customerId.replace(/^(cust|cand)-/, '');
            if (UUID_REGEX.test(stripped)) {
                where.customerId = stripped;
            }
        }

        if (filter.contactId && UUID_REGEX.test(filter.contactId)) {
            where.contactId = filter.contactId;
        }

        if (filter.stage && filter.stage !== 'ALL') {
            where.stage = filter.stage;
        }

        if (filter.status && filter.status !== 'ALL') {
            where.status = filter.status;
        }

        if (filter.intake && filter.intake !== 'ALL') {
            where.intake = filter.intake;
        }

        if (filter.search) {
            const term = filter.search.trim();
            where.OR = [
                { title: { contains: term, mode: 'insensitive' } },
                { intake: { contains: term, mode: 'insensitive' } },
                { assignedStaffName: { contains: term, mode: 'insensitive' } },
                { customer: { fullName: { contains: term, mode: 'insensitive' } } },
                { contact: { displayName: { contains: term, mode: 'insensitive' } } },
            ];
        }

        const [items, total] = await Promise.all([
            this.prisma.deal.findMany({
                where,
                include: {
                    customer: {
                        select: {
                            id: true,
                            fullName: true,
                            phone: true,
                            email: true,
                            avatarUrl: true,
                            leadStatus: true,
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
                    activities: {
                        take: 5,
                        orderBy: { createdAt: 'desc' },
                    },
                },
                orderBy: { updatedAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.deal.count({ where }),
        ]);

        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Lấy lịch sử tất cả các Deals / Đợt đăng ký của một Khách hàng
     */
    async findDealsByCustomer(customerIdOrContactId: string, workspaceId?: string): Promise<any> {
        const stripped = customerIdOrContactId.replace(/^(cust|cand)-/, '');
        if (!UUID_REGEX.test(stripped)) return [];

        return this.prisma.deal.findMany({
            where: {
                ...(workspaceId ? { workspaceId } : {}),
                OR: [
                    { customerId: stripped },
                    { contactId: stripped },
                ],
            },
            include: {
                activities: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Lấy chi tiết 1 Deal
     */
    async findById(id: string, workspaceId?: string): Promise<any> {
        if (!UUID_REGEX.test(id)) {
            throw new NotFoundException(`Cơ hội tuyển sinh với ID "${id}" không tồn tại.`);
        }
        const deal = await this.prisma.deal.findUnique({
            where: { id },
            include: {
                customer: true,
                contact: true,
                assignedMember: true,
                activities: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        // Bản ghi thuộc workspace khác được coi như không tồn tại (không lộ sự tồn tại giữa các tenant)
        if (!deal || (workspaceId && deal.workspaceId !== workspaceId)) {
            throw new NotFoundException(`Cơ hội tuyển sinh với ID "${id}" không tồn tại.`);
        }
        return deal;
    }

    /**
     * Cập nhật thông tin Deal / chuyển đổi giai đoạn phễu tuyển sinh
     */
    async update(id: string, dto: UpdateDealDto, workspaceId?: string): Promise<any> {
        const existing = await this.findById(id, workspaceId);

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
            updateData.assignedMemberId = dto.assignedMemberId && UUID_REGEX.test(dto.assignedMemberId) ? dto.assignedMemberId : null;
        }
        if (dto.customerId !== undefined) {
            const stripped = dto.customerId ? dto.customerId.replace(/^(cust|cand)-/, '') : null;
            updateData.customerId = stripped && UUID_REGEX.test(stripped) ? stripped : null;
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
            }).catch(() => {});
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

        // Tự động tạo Task phòng máy nếu Deal chuyển sang giai đoạn Hẹn Test đầu vào
        if (isStageChanged && isTestAppointmentStage(dto.stage)) {
            const custName = updated.customer?.fullName || updated.contact?.displayName || 'Thí sinh';
            if (this.activityService && updated.customerId) {
                this.activityService.autoCreateTestTask(
                    updated.workspaceId,
                    updated.customerId,
                    custName,
                    `Cơ hội tuyển sinh: ${updated.title} (Niên khóa: ${updated.intake || 'Hiện tại'})`,
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
                    customerName: updated.customer?.fullName || updated.contact?.displayName || updated.title,
                    newStage: updated.stage,
                    previousStage: existing.stage,
                    updatedBy: dto.updatedBy || 'Tư vấn viên',
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

    /**
     * Xóa một Deal
     */
    async delete(id: string, workspaceId?: string) {
        const existing = await this.findById(id, workspaceId);
        await this.prisma.deal.delete({ where: { id } });

        try {
            this.realtime?.emit('deal:deleted', {
                workspaceId: existing.workspaceId,
                dealId: id,
            });
        } catch { }

        return { success: true, message: 'Đã xóa cơ hội tuyển sinh' };
    }
}
