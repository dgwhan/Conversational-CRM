import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  AuditAction,
  AvailabilityExceptionStatus,
  AvailabilityExceptionType,
  LeadQueueReason,
  LeadQueueStatus,
  NotificationSeverity,
  NotificationType,
  Prisma,
  UserStatus,
  WorkspaceMemberStatus,
} from '@prisma/client';
import { PrismaService } from '../../platform/database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { NotificationService } from '../notification/notification.service.js';
import { RealtimeService } from '../realtime/realtime.service.js';
import { WorkspaceRole } from '../workspace-config/index.js';

type Db = PrismaService | Prisma.TransactionClient;

@Injectable()
export class LeadRoutingService {
  private readonly logger = new Logger(LeadRoutingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService,
    @Optional() private readonly realtime?: RealtimeService,
  ) { }


  private async markShiftMemberIdsUsed(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    shiftMemberIds: string[],
  ) {
    if (!shiftMemberIds.length) return;
    await tx.workShift.updateMany({
      where: {
        workspaceId,
        usedAt: null,
        members: { some: { id: { in: shiftMemberIds } } },
      },
      data: { usedAt: new Date() },
    });
  } 

  @Cron(CronExpression.EVERY_MINUTE, { name: 'lead-routing-queue-escalations' })
  async escalateWaitingLeads() {
    const workspaces = await this.prisma.leadQueueEntry.findMany({
      where: { status: LeadQueueStatus.WAITING },
      distinct: ['workspaceId'],
      select: { workspaceId: true },
    });
    for (const workspace of workspaces)
      await this.processWaitingQueue(workspace.workspaceId);
    const waiting = await this.prisma.leadQueueEntry.findMany({
      where: { status: LeadQueueStatus.WAITING },
      take: 200,
      orderBy: { queuedAt: 'asc' },
    });
    const now = Date.now();
    for (const entry of waiting) {
      const ageMinutes = (now - entry.queuedAt.getTime()) / 60_000;
      const thresholds = entry.priority >= 2 ? [2, 5, 10] : [5, 15, 30];
      const targetLevel =
        ageMinutes >= thresholds[2]
          ? 3
          : ageMinutes >= thresholds[1]
            ? 2
            : ageMinutes >= thresholds[0]
              ? 1
              : 0;
      if (targetLevel <= entry.escalationLevel) continue;
      try {
        const changed = await this.prisma.$transaction(async (tx) => {
          const updated = await tx.leadQueueEntry.updateMany({
            where: {
              id: entry.id,
              status: LeadQueueStatus.WAITING,
              escalationLevel: entry.escalationLevel,
            },
            data: { escalationLevel: targetLevel, lastEscalatedAt: new Date() },
          });
          if (!updated.count) return false;
          await this.audit.recordBusinessEvent(tx, {
            action: AuditAction.LEAD_ESCALATED,
            workspaceId: entry.workspaceId,
            actorId: null,
            metadata: {
              conversationId: entry.conversationId,
              queueEntryId: entry.id,
              fromLevel: entry.escalationLevel,
              toLevel: targetLevel,
              ageMinutes: Math.floor(ageMinutes),
            },
          });
          return true;
        });
        if (!changed) continue;
        await this.notifyQueue(
          entry.workspaceId,
          entry.conversationId,
          targetLevel,
        );
      } catch (error) {
        this.logger.error(
          `Failed to audit/escalate queue entry ${entry.id}`,
          error,
        );
      }
    }
  }

  

  private async setConversationAssignee(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    conversationId: string,
    workspaceMemberId: string | null,
  ) {
    const conversation = await tx.conversation.update({
      where: { id: conversationId },
      data: { assignedMemberId: workspaceMemberId },
      select: { workspaceId: true, customerId: true },
    });
    if (conversation.workspaceId !== workspaceId || !conversation.customerId)
      return;
    const [customer, assignee] = await Promise.all([
      tx.customer.findUnique({
        where: { id: conversation.customerId },
        select: { channelIdentities: true },
      }),
      workspaceMemberId
        ? tx.workspaceMember.findFirst({
          where: { id: workspaceMemberId, workspaceId },
          select: { userId: true, user: { select: { fullName: true } } },
        })
        : Promise.resolve(null),
    ]);
    const current = customer?.channelIdentities;
    const identities =
      current && typeof current === 'object' && !Array.isArray(current)
        ? (current as Record<string, unknown>)
        : {};
    await tx.customer.update({
      where: { id: conversation.customerId },
      data: {
        channelIdentities: {
          ...identities,
          assignedMemberId: workspaceMemberId,
          assignedStaffId: assignee?.userId ?? null,
          assignedStaffName: assignee?.user.fullName ?? null,
        },
      },
    });
  }

  

  private async getCandidates(
    db: Db,
    workspaceId: string,
    now: Date,
  ): Promise<Candidate[]> {
    const rows = await db.workShiftMember.findMany({
      where: {
        shift: { workspaceId, isActive: true },
        workspaceMember: {
          workspaceId,
          status: WorkspaceMemberStatus.ACTIVE,
          isActive: true,
          assignmentLocked: false,
          user: { status: UserStatus.ACTIVE },
        },
      },
      include: {
        shift: true,
        workspaceMember: {
          include: {
            user: true,
            availabilityExceptions: {
              where: {
                status: AvailabilityExceptionStatus.ACTIVE,
                startsAt: { lte: now },
                OR: [{ endsAt: null }, { endsAt: { gt: now } }],
              },
            },
          },
        },
      },
    });
    const grouped = new Map<string, Candidate>();
    for (const row of rows) {
      const exceptions = row.workspaceMember.availabilityExceptions;
      const leave = exceptions.some(
        (item) => item.type === AvailabilityExceptionType.UNEXPECTED_LEAVE,
      );
      const hasOvertime = exceptions.some(
        (item) =>
          item.type === AvailabilityExceptionType.OVERTIME_CONSENT &&
          item.shiftId === row.shiftId,
      );
      if (leave) continue;
      const inSchedule = this.shiftIsActive(row.shift, now);
      if (!inSchedule && !hasOvertime) continue;
      const existing = grouped.get(row.workspaceMemberId) ?? {
        workspaceMemberId: row.workspaceMemberId,
        userId: row.workspaceMember.userId,
        capacity: 0,
        lastAssignedAt: null,
        shiftMemberIds: [],
      };
      existing.capacity += row.leadCapacity;
      existing.shiftMemberIds.push(row.id);
      if (
        row.lastAssignedAt &&
        (!existing.lastAssignedAt ||
          row.lastAssignedAt < existing.lastAssignedAt)
      )
        existing.lastAssignedAt = row.lastAssignedAt;
      grouped.set(row.workspaceMemberId, existing);
    }
    return [...grouped.values()].filter((candidate) => candidate.capacity > 0);
  }

  private async getOpenCounts(
    db: Db,
    workspaceId: string,
    memberIds: string[],
  ) {
    const counts = new Map<string, number>();
    if (!memberIds.length) return counts;
    const rows = await db.conversation.groupBy({
      by: ['assignedMemberId'],
      where: {
        workspaceId,
        status: 'OPEN',
        assignedMemberId: { in: memberIds },
      },
      _count: { _all: true },
    });
    for (const row of rows)
      if (row.assignedMemberId)
        counts.set(row.assignedMemberId, row._count._all);
    return counts;
  }

  private async isOverCapacity(db: Db, workspaceId: string, memberId: string) {
    const candidate = (
      await this.getCandidates(db, workspaceId, new Date())
    ).find((item) => item.workspaceMemberId === memberId);
    if (!candidate) return true;
    const counts = await this.getOpenCounts(db, workspaceId, [memberId]);
    return (counts.get(memberId) ?? 0) > candidate.capacity;
  }

  private shiftIsActive(
    shift: {
      startTime: string;
      endTime: string;
      timezone: string;
      weekdays: number[];
    },
    instant: Date,
  ) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: shift.timezone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(instant);
    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );
    const weekdayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    const day = weekdayMap[values.weekday];
    const current = Number(values.hour) * 60 + Number(values.minute);
    const start = this.timeToMinutes(shift.startTime);
    const end = this.timeToMinutes(shift.endTime);
    if (start < end)
      return shift.weekdays.includes(day) && current >= start && current < end;
    if (current >= start) return shift.weekdays.includes(day);
    if (current < end) return shift.weekdays.includes((day + 6) % 7);
    return false;
  }

  private timeToMinutes(time: string) {
    const [hour, minute] = time.split(':').map(Number);
    return hour * 60 + minute;
  }

  private validateShift(input: ShiftInput) {
    if (
      typeof input.name !== 'string' ||
      !input.name.trim() ||
      input.name.trim().length > 120
    )
      throw new BadRequestException('Tên ca là bắt buộc và tối đa 120 ký tự.');
    if (
      typeof input.startTime !== 'string' ||
      typeof input.endTime !== 'string' ||
      (input.timezone !== undefined && typeof input.timezone !== 'string')
    )
      throw new BadRequestException('Khung giờ hoặc múi giờ ca không hợp lệ.');
    if (
      !TIME_RE.test(input.startTime) ||
      !TIME_RE.test(input.endTime) ||
      input.startTime === input.endTime
    )
      throw new BadRequestException('Khung giờ ca không hợp lệ.');
    if (
      !Array.isArray(input.weekdays) ||
      !input.weekdays.length ||
      input.weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)
    )
      throw new BadRequestException(
        'Chọn ít nhất một ngày áp dụng từ 0 đến 6.',
      );
    try {
      new Intl.DateTimeFormat('en-US', {
        timeZone: input.timezone || 'Asia/Ho_Chi_Minh',
      });
    } catch {
      throw new BadRequestException('Múi giờ không hợp lệ.');
    }
  }

  private async lockMemberRow(tx: Prisma.TransactionClient, memberId: string) {
    await tx.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT id FROM workspace_members WHERE id = ${memberId}::uuid FOR UPDATE`,
    );
  }

  private async lockMemberRows(
    tx: Prisma.TransactionClient,
    memberIds: string[],
  ) {
    for (const memberId of [...new Set(memberIds)].sort())
      await this.lockMemberRow(tx, memberId);
  }

  private async assertShiftManager(
    workspaceId: string,
    actorId: string,
    shiftId: string,
  ) {
    if (await this.hasWorkspaceManagementPermission(workspaceId, actorId))
      return;
    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: actorId,
        status: WorkspaceMemberStatus.ACTIVE,
        isActive: true,
        shiftAssignments: { some: { shiftId, isShiftManager: true } },
      },
    });
    if (!membership)
      throw new ForbiddenException(
        'Chỉ Owner hoặc ca trưởng của ca này mới được thực hiện thao tác.',
      );
  }

  private async assertMemberManager(
    workspaceId: string,
    actorId: string,
    memberId: string,
  ) {
    if (await this.hasWorkspaceManagementPermission(workspaceId, actorId))
      return;
    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: actorId,
        status: WorkspaceMemberStatus.ACTIVE,
        isActive: true,
        shiftAssignments: {
          some: { workspaceMemberId: memberId, isShiftManager: true },
        },
      },
    });
    if (!membership)
      throw new ForbiddenException(
        'Chỉ Owner hoặc ca trưởng của nhân viên mới được thực hiện thao tác.',
      );
  }

  private async assertQueueAccess(workspaceId: string, actorId: string) {
    if (await this.hasWorkspaceManagementPermission(workspaceId, actorId))
      return;
    const activeCandidates = await this.getCandidates(
      this.prisma,
      workspaceId,
      new Date(),
    );
    if (activeCandidates.some((candidate) => candidate.userId === actorId))
      return;
    const manager = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: actorId,
        status: WorkspaceMemberStatus.ACTIVE,
        isActive: true,
        shiftAssignments: { some: { isShiftManager: true } },
      },
      select: { id: true },
    });
    if (!manager)
      throw new ForbiddenException(
        'Hàng chờ chỉ dành cho Owner, ca trưởng hoặc nhân viên đang trực.',
      );
  }

  
}
