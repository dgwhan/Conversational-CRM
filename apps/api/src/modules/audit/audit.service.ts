import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../platform/database/prisma.service.js';

export type RecordEventInput = {
  action: AuditAction;
  userId?: string | null;
  staffId?: string | null;
  actorId?: string | null;
  workspaceId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue | Record<string, unknown> | null;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordEvent(input: RecordEventInput) {
    try {
      const resolvedUserId = input.userId ?? input.staffId ?? null;
      return await this.prisma.auditLog.create({
        data: {
          action: input.action,
          userId: resolvedUserId,
          actorId: input.actorId ?? null,
          workspaceId: input.workspaceId ?? null,
          ip: input.ip ?? null,
          userAgent: input.userAgent?.slice(0, 512) ?? null,
          metadata: (input.metadata ?? undefined) as
            Prisma.InputJsonValue | undefined,
        },
      });
    } catch (error) {
      // Ghi log lỗi nội bộ, không làm crash flow xác thực của người dùng
      this.logger.error(`Failed to record audit event: ${input.action}`, error);
      return null;
    }
  }

  /** Business mutations use this transaction-aware method so an audit failure rolls back the change. */
  async recordBusinessEvent(
    tx: Prisma.TransactionClient,
    input: Pick<
      RecordEventInput,
      'action' | 'userId' | 'actorId' | 'workspaceId' | 'metadata'
    >,
  ) {
    const resolvedUserId = input.userId ?? input.actorId ?? null;
    return tx.auditLog.create({
      data: {
        action: input.action,
        userId: resolvedUserId,
        actorId: input.actorId ?? null,
        workspaceId: input.workspaceId ?? null,
        metadata: (input.metadata ?? undefined) as
          Prisma.InputJsonValue | undefined,
      },
    });
  }

  async getRecentAuditLogs(take = 50) {
    return this.prisma.auditLog.findMany({
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });
  }

  async getWorkspaceAuditLogs(
    workspaceId: string,
    take = 50,
    cursor?: string,
    shiftId?: string,
    startAt?: string,
    endAt?: string,
  ) {
    const limit = Math.min(100, Math.max(1, Number(take) || 50));
    const startDate = startAt ? new Date(startAt) : undefined;
    const endDate = endAt ? new Date(endAt) : undefined;
    if (
      Boolean(startAt) !== Boolean(endAt) ||
      (startDate && !Number.isFinite(startDate.getTime())) ||
      (endDate && !Number.isFinite(endDate.getTime())) ||
      (startDate && endDate && startDate >= endDate)
    ) {
      throw new BadRequestException('Khoảng thời gian nhật ký không hợp lệ.');
    }

    const where: Prisma.AuditLogWhereInput = {
      workspaceId,
      ...(shiftId
        ? {
            OR: [
              { metadata: { path: ['shiftId'], equals: shiftId } },
              { metadata: { path: ['after', 'id'], equals: shiftId } },
              { metadata: { path: ['before', 'id'], equals: shiftId } },
            ],
          }
        : {}),
      ...(startDate && endDate
        ? {
            createdAt: { gte: startDate, lt: endDate },
          }
        : {}),
    };
    const rows = await this.prisma.auditLog.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        user: { select: { id: true, email: true, fullName: true } },
      },
    });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return {
      items,
      nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null,
    };
  }
}
