import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../platform/database/prisma.service.js';
import { RealtimeService } from '../realtime/realtime.service.js';
import { NotificationService } from '../notification/notification.service.js';
import {
    CreateActivityDto,
    UpdateActivityDto,
    ActivityFilterDto,
    ActivityTypeEnum,
    ActivityStatusEnum,
} from './dto/activity.dto.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class ActivityService {
    private readonly logger = new Logger(ActivityService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly realtime: RealtimeService,
        private readonly notificationService: NotificationService,
    ) { }

    /**
     * Tạo một hoạt động mới (Nhật ký cuộc gọi, Lịch hẹn, Công việc nhắc hẹn)
     */
    async create(dto: CreateActivityDto, creatorId?: string) {
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

        let scheduledAt: Date | undefined = undefined;
        if (dto.scheduledAt) {
            scheduledAt = new Date(dto.scheduledAt);
        }

        let dueAt: Date | undefined = undefined;
        if (dto.dueAt) {
            dueAt = new Date(dto.dueAt);
        }

        let reminderAt: Date | undefined = undefined;
        if (dto.reminderAt) {
            reminderAt = new Date(dto.reminderAt);
        } else if (scheduledAt && dto.type === ActivityTypeEnum.CALL) {
            reminderAt = scheduledAt;
        }

        const fullCallResult = dto.callResult || null;
        // Giới hạn an toàn 50 ký tự cho call_result để tương thích tuyệt đối với PostgreSQL ngay cả khi bảng chưa ALTER
        const safeCallResult = fullCallResult ? fullCallResult.slice(0, 50) : null;
        const safeTitle = (dto.title || 'Hoạt động').slice(0, 250);
        const safeMeetingType = (dto.meetingType || 'OFFLINE').slice(0, 50);
        const safeMeetingLocation = dto.meetingLocation ? dto.meetingLocation.slice(0, 250) : null;
        const safeStatus = (dto.status || ActivityStatusEnum.PENDING).slice(0, 50);
        const safePriority = (dto.priority || 'MEDIUM').slice(0, 50);
        const safeAssignedTo = (dto.assignedTo || 'Tư vấn viên').slice(0, 200);

        const mergedMetadata = {
            ...(dto.metadata || {}),
            ...(fullCallResult && fullCallResult.length > 50 ? { fullCallResult } : {}),
        };

        const createData = {
            workspaceId: safeWsId,
            customerId: safeCustomerId,
            contactId: dto.contactId,
            creatorId: creatorId || dto.creatorId,
            assignedMemberId: dto.assignedMemberId,
            type: (dto.type || ActivityTypeEnum.TASK) as any,
            title: safeTitle,
            description: dto.description || null,
            callResult: safeCallResult,
            callDuration: dto.callDuration ? Number(dto.callDuration) : 0,
            meetingType: safeMeetingType,
            meetingLocation: safeMeetingLocation,
            meetingJoinUrl: dto.meetingJoinUrl || null,
            status: safeStatus,
            priority: safePriority,
            assignedTo: safeAssignedTo,
            scheduledAt,
            dueAt,
            reminderAt,
            metadata: mergedMetadata,
        };

        let activity: any;
        try {
            activity = await this.prisma.activity.create({
                data: createData,
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
                },
            });
        } catch (err: any) {
            // Fallback an toàn nếu DB báo lỗi P2000 (quá dài cột)
            if (err?.code === 'P2000') {
                this.logger.warn(`Prisma P2000 detected on create, truncating fields further...`);
                activity = await this.prisma.activity.create({
                    data: {
                        ...createData,
                        title: safeTitle.slice(0, 100),
                        callResult: safeCallResult ? safeCallResult.slice(0, 30) : null,
                        meetingType: 'OFFLINE',
                        meetingLocation: safeMeetingLocation ? safeMeetingLocation.slice(0, 100) : null,
                        status: 'PENDING',
                        priority: 'MEDIUM',
                        assignedTo: safeAssignedTo.slice(0, 50),
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
                    },
                });
            } else {
                throw err;
            }
        }

        this.logger.log(`[ActivityService] Đã tạo hoạt động "${activity.title}" (${activity.type})`);

        // Realtime broadcast cho các tư vấn viên khác
        try {
            this.realtime?.emit('activity:created', {
                workspaceId: safeWsId,
                activity,
            });
        } catch { }

        // Nếu là Lịch hẹn hoặc Task có nhắc việc cụ thể, tạo thông báo hệ thống
        if (activity.type === ActivityTypeEnum.MEETING || activity.dueAt || activity.scheduledAt) {
            try {
                await this.notificationService.create({
                    workspaceId: safeWsId,
                    type: 'TASK_REMINDER' as any,
                    severity: activity.priority === 'URGENT' ? ('URGENT' as any) : ('INFO' as any),
                    title: `Nhiệm vụ / Lịch hẹn mới: ${activity.title}`,
                    content: `${activity.assignedTo ? `[${activity.assignedTo}] ` : ''}${activity.description || activity.title} - Thời gian: ${activity.scheduledAt ? new Date(activity.scheduledAt).toLocaleString('vi-VN') : (activity.dueAt ? new Date(activity.dueAt).toLocaleString('vi-VN') : 'Sắp tới')}`,
                    metadata: {
                        activityId: activity.id,
                        customerId: activity.customerId,
                        type: activity.type,
                    },
                });
            } catch (notifErr) {
                this.logger.warn(`Không thể tạo notification tự động: ${(notifErr as Error).message}`);
            }
        }

        return activity;
    }

    /**
     * Lấy danh sách hoạt động có phân trang và lọc
     */
    async findAll(filter: ActivityFilterDto) {
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

        if (filter.type) {
            where.type = filter.type;
        }

        if (filter.status) {
            where.status = filter.status;
        }

        if (filter.priority) {
            where.priority = filter.priority;
        }

        if (filter.startDate || filter.endDate) {
            where.OR = [
                {
                    scheduledAt: {
                        ...(filter.startDate ? { gte: new Date(filter.startDate) } : {}),
                        ...(filter.endDate ? { lte: new Date(filter.endDate) } : {}),
                    },
                },
                {
                    dueAt: {
                        ...(filter.startDate ? { gte: new Date(filter.startDate) } : {}),
                        ...(filter.endDate ? { lte: new Date(filter.endDate) } : {}),
                    },
                },
                {
                    createdAt: {
                        ...(filter.startDate ? { gte: new Date(filter.startDate) } : {}),
                        ...(filter.endDate ? { lte: new Date(filter.endDate) } : {}),
                    },
                },
            ];
        }

        if (filter.search) {
            const term = filter.search.trim();
            where.AND = [
                ...(where.AND || []),
                {
                    OR: [
                        { title: { contains: term, mode: 'insensitive' } },
                        { description: { contains: term, mode: 'insensitive' } },
                        { assignedTo: { contains: term, mode: 'insensitive' } },
                        { customer: { fullName: { contains: term, mode: 'insensitive' } } },
                    ],
                },
            ];
        }

        const [items, total] = await Promise.all([
            this.prisma.activity.findMany({
                where,
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
                },
                orderBy: [
                    { scheduledAt: 'desc' },
                    { dueAt: 'desc' },
                    { createdAt: 'desc' },
                ],
                skip,
                take: limit,
            }),
            this.prisma.activity.count({ where }),
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
     * Lấy các hoạt động phục vụ hiển thị Lịch biểu (Calendar View)
     */
    async getCalendarEvents(workspaceId: string, startDate?: string, endDate?: string) {
        const safeWsId = UUID_REGEX.test(workspaceId) ? workspaceId : undefined;
        if (!safeWsId) return [];

        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 86400000);
        const end = endDate ? new Date(endDate) : new Date(Date.now() + 60 * 86400000);

        const activities = await this.prisma.activity.findMany({
            where: {
                workspaceId: safeWsId,
                OR: [
                    { scheduledAt: { gte: start, lte: end } },
                    { dueAt: { gte: start, lte: end } },
                    { createdAt: { gte: start, lte: end } },
                ],
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
            },
            orderBy: [
                { scheduledAt: 'asc' },
                { dueAt: 'asc' },
            ],
            take: 500,
        });

        return activities.map((item: any) => {
            const date = item.scheduledAt || item.dueAt || item.createdAt;
            return {
                id: item.id,
                title: item.title,
                description: item.description,
                type: item.type,
                status: item.status,
                priority: item.priority,
                date: date.toISOString(),
                scheduledAt: item.scheduledAt ? item.scheduledAt.toISOString() : null,
                dueAt: item.dueAt ? item.dueAt.toISOString() : null,
                completedAt: item.completedAt ? item.completedAt.toISOString() : null,
                meetingType: item.meetingType,
                meetingLocation: item.meetingLocation,
                meetingJoinUrl: item.meetingJoinUrl,
                callDuration: item.callDuration,
                callResult: item.callResult,
                assignedTo: item.assignedTo,
                customer: item.customer,
            };
        });
    }

    /**
     * Lấy chi tiết một hoạt động
     */
    async findById(id: string) {
        const activity = await this.prisma.activity.findUnique({
            where: { id },
            include: {
                customer: true,
                assignedMember: true,
            },
        });
        if (!activity) {
            throw new NotFoundException(`Hoạt động với ID "${id}" không tồn tại.`);
        }
        return activity;
    }

    /**
     * Cập nhật thông tin hoạt động / hoàn thành task
     */
    async update(id: string, dto: UpdateActivityDto) {
        const existing = await this.findById(id);

        const updateData: any = {};
        if (dto.title !== undefined) updateData.title = dto.title.slice(0, 250);
        if (dto.description !== undefined) updateData.description = dto.description;
        if (dto.callResult !== undefined) {
            updateData.callResult = dto.callResult ? dto.callResult.slice(0, 50) : null;
            if (dto.callResult && dto.callResult.length > 50) {
                updateData.metadata = { ...(existing.metadata as any || {}), fullCallResult: dto.callResult };
            }
        }
        if (dto.callDuration !== undefined) updateData.callDuration = Number(dto.callDuration);
        if (dto.meetingType !== undefined) updateData.meetingType = dto.meetingType ? dto.meetingType.slice(0, 50) : 'OFFLINE';
        if (dto.meetingLocation !== undefined) updateData.meetingLocation = dto.meetingLocation ? dto.meetingLocation.slice(0, 250) : null;
        if (dto.meetingJoinUrl !== undefined) updateData.meetingJoinUrl = dto.meetingJoinUrl;
        if (dto.priority !== undefined) updateData.priority = dto.priority ? dto.priority.slice(0, 50) : 'MEDIUM';
        if (dto.assignedTo !== undefined) updateData.assignedTo = dto.assignedTo ? dto.assignedTo.slice(0, 200) : 'Tư vấn viên';
        if (dto.assignedMemberId !== undefined) updateData.assignedMemberId = dto.assignedMemberId;

        if (dto.scheduledAt !== undefined) {
            updateData.scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
        }
        if (dto.dueAt !== undefined) {
            updateData.dueAt = dto.dueAt ? new Date(dto.dueAt) : null;
        }
        if (dto.reminderAt !== undefined) {
            updateData.reminderAt = dto.reminderAt ? new Date(dto.reminderAt) : null;
        }
        if (dto.isReminderSent !== undefined) {
            updateData.isReminderSent = dto.isReminderSent;
        }

        if (dto.status !== undefined) {
            updateData.status = dto.status;
            if (dto.status === ActivityStatusEnum.COMPLETED && !existing.completedAt) {
                updateData.completedAt = new Date();
            } else if (dto.status === ActivityStatusEnum.PENDING) {
                updateData.completedAt = null;
            }
        }

        if (dto.completedAt !== undefined) {
            updateData.completedAt = dto.completedAt ? new Date(dto.completedAt) : null;
        }

        if (dto.metadata) {
            updateData.metadata = { ...(existing.metadata as any || {}), ...dto.metadata };
        }

        let updated: any;
        try {
            updated = await this.prisma.activity.update({
                where: { id },
                data: updateData,
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
                },
            });
        } catch (err: any) {
            if (err?.code === 'P2000') {
                this.logger.warn(`Prisma P2000 on update, truncating further...`);
                updated = await this.prisma.activity.update({
                    where: { id },
                    data: {
                        ...updateData,
                        title: updateData.title ? updateData.title.slice(0, 100) : undefined,
                        callResult: updateData.callResult ? updateData.callResult.slice(0, 30) : undefined,
                        meetingLocation: updateData.meetingLocation ? updateData.meetingLocation.slice(0, 100) : undefined,
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
                    },
                });
            } else {
                throw err;
            }
        }

        try {
            this.realtime?.emit('activity:updated', {
                workspaceId: updated.workspaceId,
                activity: updated,
            });
        } catch { }

        return updated;
    }

    /**
     * Xóa một hoạt động
     */
    async delete(id: string) {
        const existing = await this.findById(id);
        await this.prisma.activity.delete({ where: { id } });

        try {
            this.realtime?.emit('activity:deleted', {
                workspaceId: existing.workspaceId,
                activityId: id,
            });
        } catch { }

        return { success: true, message: 'Đã xóa hoạt động thành công' };
    }

    /**
     * Tự động tạo Task xếp phòng máy khi Lead chuyển sang trạng thái "Hẹn Test đầu vào"
     */
    async autoCreateTestTask(workspaceId: string, customerId: string, customerName: string, notes?: string) {
        const safeWsId = UUID_REGEX.test(workspaceId) ? workspaceId : undefined;
        if (!safeWsId) return null;

        const cleanCustomerId = customerId.replace(/^(cust|cand)-/, '');
        const validCustomerId = UUID_REGEX.test(cleanCustomerId) ? cleanCustomerId : undefined;

        // Ngày hẹn dự kiến: 2 ngày sau lúc 09:00 sáng
        const scheduled = new Date();
        scheduled.setDate(scheduled.getDate() + 2);
        scheduled.setHours(9, 0, 0, 0);

        const taskTitle = `Xếp phòng máy & chuẩn bị đề test đầu vào cho ${customerName}`;
        const taskDesc = `Tự động tạo bởi Hệ thống Tuyển sinh CUSC: Thí sinh "${customerName}" vừa được xác nhận lịch Hẹn làm bài test đầu vào. Phòng Đào tạo vui lòng kiểm tra phòng máy thực hành và phân công cán bộ coi thi. ${notes ? `(Ghi chú: ${notes})` : ''}`;

        const created = await this.create({
            workspaceId: safeWsId,
            customerId: validCustomerId,
            type: ActivityTypeEnum.TASK,
            title: taskTitle,
            description: taskDesc,
            priority: 'HIGH',
            status: ActivityStatusEnum.PENDING,
            assignedTo: 'Phòng Đào tạo',
            scheduledAt: scheduled,
            dueAt: scheduled,
            reminderAt: new Date(scheduled.getTime() - 2 * 3600000), // Nhắc trước 2 tiếng
            metadata: {
                isAutoGenerated: true,
                triggerReason: 'LEAD_STAGE_TEST_APPOINTMENT',
                customerName,
            },
        });

        this.logger.log(`[AutoTask] Đã tự động tạo Task xếp phòng máy cho thí sinh "${customerName}"`);
        return created;
    }

    /**
     * Lấy danh sách nhiệm vụ cần nhắc nhở hiện tại (due hoặc reminder đến hạn)
     */
    async getDueReminders(workspaceId: string) {
        const safeWsId = UUID_REGEX.test(workspaceId) ? workspaceId : undefined;
        if (!safeWsId) return [];

        const now = new Date();
        const tenMinutesLater = new Date(now.getTime() + 15 * 60000);

        return this.prisma.activity.findMany({
            where: {
                workspaceId: safeWsId,
                status: ActivityStatusEnum.PENDING,
                OR: [
                    // Các task có hạn chót trong vòng 15 phút tới hoặc đã quá hạn
                    { dueAt: { lte: tenMinutesLater } },
                    { scheduledAt: { lte: tenMinutesLater } },
                    { reminderAt: { lte: tenMinutesLater } },
                ],
            },
            include: {
                customer: {
                    select: {
                        id: true,
                        fullName: true,
                        phone: true,
                    },
                },
            },
            orderBy: [
                { dueAt: 'asc' },
                { scheduledAt: 'asc' },
            ],
            take: 20,
        });
    }
}
