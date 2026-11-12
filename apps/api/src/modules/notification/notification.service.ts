import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../platform/database/prisma.service.js';
import { RealtimeService } from '../realtime/realtime.service.js';
import { CreateNotificationDto, NotificationFilterDto } from './dto/notification.dto.js';
import { Notification, NotificationType } from '@prisma/client';
import { isUuid } from '../../utils/uuid.util.js';

const normalizeWorkspaceId = (workspaceId?: string): string | undefined =>
  workspaceId && isUuid(workspaceId) ? workspaceId : undefined;

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  /**
   * Tạo thông báo mới và phát sự kiện realtime đến các client trong Workspace
   */
  async create(dto: CreateNotificationDto): Promise<Notification> {
    const safeWorkspaceId = normalizeWorkspaceId(dto.workspaceId);
    if (!safeWorkspaceId) {
      throw new BadRequestException('workspaceId must be a valid UUID');
    }

    const notification = await this.prisma.notification.create({
      data: {
        workspaceId: safeWorkspaceId,
        userId: dto.userId || null,
        type: dto.type,
        severity: dto.severity,
        title: dto.title,
        content: dto.content,
        actionUrl: dto.actionUrl || null,
        metadata: dto.metadata || {},
      },
    });

    this.logger.log(
      `[Notification] Đã tạo thông báo mới [${notification.severity}] "${notification.title}" cho workspace: ${dto.workspaceId}`,
    );

    // Phát sự kiện realtime đến các client đang mở giao diện
    try {
      this.realtime.broadcastNotification({
        workspaceId: dto.workspaceId,
        notification,
      });
    } catch (err) {
      this.logger.warn(`Không thể phát broadcast thông báo: ${(err as Error).message}`);
    }

    return notification;
  }

  /**
   * Lấy danh sách thông báo có phân trang và lọc
   */
  async findAll(
    workspaceId: string,
    filter: NotificationFilterDto = {},
  ): Promise<{
    items: Notification[];
    total: number;
    unreadCount: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const safeWorkspaceId = normalizeWorkspaceId(workspaceId);

    // Xây dựng điều kiện lọc người nhận bảo mật & hỗ trợ nhận lời mời toàn cục
    let recipientCondition: any;
    if (safeWorkspaceId && filter.userId) {
      recipientCondition = {
        OR: [
          // 1. Thông báo trong workspace này (thông báo riêng cho user hoặc thông báo chung của workspace)
          {
            workspaceId: safeWorkspaceId,
            OR: [
              { userId: filter.userId },
              { userId: null },
            ],
          },
          // 2. VÀ TẤT CẢ các lời mời tham gia workspace (WORKSPACE_INVITATION) gửi riêng cho chính user này
          {
            userId: filter.userId,
            type: NotificationType.WORKSPACE_INVITATION,
          },
        ],
      };
    } else if (safeWorkspaceId) {
      // Có workspace hợp lệ nhưng không truyền callerId -> chỉ lấy thông báo chung của workspace
      recipientCondition = {
        workspaceId: safeWorkspaceId,
        userId: null,
      };
    } else if (filter.userId) {
      // Trường hợp workspaceId không phải UUID hợp lệ (ví dụ ws-default-001 khi user mới đăng nhập)
      // Lấy các thông báo dành riêng cho user này (đặc biệt là lời mời tham gia workspace)
      recipientCondition = {
        userId: filter.userId,
      };
    } else {
      return {
        items: [],
        total: 0,
        unreadCount: 0,
        page: Math.max(1, Number(filter.page) || 1),
        limit: Math.min(100, Math.max(1, Number(filter.limit) || 20)),
        totalPages: 0,
      };
    }

    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filter.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      ...recipientCondition,
    };
    if (typeof filter.isRead === 'boolean') {
      where.isRead = filter.isRead;
    }
    if (filter.type) {
      where.type = filter.type;
    }
    if (filter.severity) {
      where.severity = filter.severity;
    }

    const unreadWhere: any = {
      ...recipientCondition,
      isRead: false,
    };

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: unreadWhere,
      }),
    ]);

    return {
      items,
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Lấy danh sách thông báo của một người dùng (bao gồm lời mời tham gia workspace)
   */
  async findByUser(
    userId: string,
    filter: NotificationFilterDto = {},
  ): Promise<{
    items: Notification[];
    total: number;
    unreadCount: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filter.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (typeof filter.isRead === 'boolean') {
      where.isRead = filter.isRead;
    }
    if (filter.type) {
      where.type = filter.type;
    }

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return {
      items,
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Lấy số lượng thông báo chưa đọc của workspace
   */
  async getUnreadCount(workspaceId: string): Promise<number> {
    const safeWorkspaceId = normalizeWorkspaceId(workspaceId);
    if (!safeWorkspaceId) {
      return 0;
    }

    return this.prisma.notification.count({
      where: { workspaceId: safeWorkspaceId, isRead: false },
    });
  }

  /**
   * Đánh dấu một thông báo là đã đọc
   */
  async markAsRead(workspaceId: string, id: string): Promise<Notification> {
    const safeWorkspaceId = normalizeWorkspaceId(workspaceId);
    if (!safeWorkspaceId) {
      throw new NotFoundException('Invalid workspaceId');
    }

    const notification = await this.prisma.notification.findFirst({
      where: { id, workspaceId: safeWorkspaceId },
    });

    if (!notification) {
      throw new NotFoundException(`Không tìm thấy thông báo ${id}`);
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markPersonalNotificationAsRead(userId: string, id: string): Promise<Notification> {
    if (!userId || !isUuid(id)) {
      throw new NotFoundException(`Không tìm thấy thông báo ${id}`);
    }

    const result = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });

    if (result.count === 0) {
      throw new NotFoundException(`Không tìm thấy thông báo ${id}`);
    }

    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) {
      throw new NotFoundException(`Không tìm thấy thông báo ${id}`);
    }

    return notification;
  }

  /**
   * Đánh dấu tất cả thông báo của workspace là đã đọc
   */
  async markAllAsRead(workspaceId: string): Promise<{ count: number }> {
    const safeWorkspaceId = normalizeWorkspaceId(workspaceId);
    if (!safeWorkspaceId) {
      return { count: 0 };
    }

    const result = await this.prisma.notification.updateMany({
      where: { workspaceId: safeWorkspaceId, isRead: false },
      data: { isRead: true },
    });

    return { count: result.count };
  }

  /**
   * Xóa một thông báo
   */
  async delete(workspaceId: string, id: string): Promise<{ success: boolean }> {
    const safeWorkspaceId = normalizeWorkspaceId(workspaceId);
    if (!safeWorkspaceId) {
      throw new NotFoundException('Invalid workspaceId');
    }

    const notification = await this.prisma.notification.findFirst({
      where: { id, workspaceId: safeWorkspaceId },
    });

    if (!notification) {
      throw new NotFoundException(`Không tìm thấy thông báo ${id}`);
    }

    await this.prisma.notification.delete({
      where: { id },
    });

    return { success: true };
  }
}
