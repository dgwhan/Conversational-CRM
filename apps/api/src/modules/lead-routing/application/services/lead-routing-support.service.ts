import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  AvailabilityExceptionStatus,
  AvailabilityExceptionType,
  Prisma,
  UserStatus,
  WorkspaceMemberStatus,
} from '@prisma/client';
import { PrismaService } from '../../../../platform/database/prisma.service.js';
import { WorkspaceRole } from '../../../workspace-config/index.js';
import type { Candidate, Db } from '../types/routing.types.js';
import type { ShiftInput } from '../types/shift.types.js';

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

@Injectable()
export class LeadRoutingSupportService {
  constructor(private readonly prisma: PrismaService) {}

  async getCandidates(
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
      if (
        exceptions.some(
          (item) => item.type === AvailabilityExceptionType.UNEXPECTED_LEAVE,
        )
      ) {
        continue;
      }
      const hasOvertime = exceptions.some(
        (item) =>
          item.type === AvailabilityExceptionType.OVERTIME_CONSENT &&
          item.shiftId === row.shiftId,
      );
      if (!this.shiftIsActive(row.shift, now) && !hasOvertime) continue;

      const candidate = grouped.get(row.workspaceMemberId) ?? {
        workspaceMemberId: row.workspaceMemberId,
        userId: row.workspaceMember.userId,
        capacity: 0,
        lastAssignedAt: null,
        shiftMemberIds: [],
      };
      candidate.capacity += row.leadCapacity;
      candidate.shiftMemberIds.push(row.id);
      if (
        row.lastAssignedAt &&
        (!candidate.lastAssignedAt ||
          row.lastAssignedAt < candidate.lastAssignedAt)
      ) {
        candidate.lastAssignedAt = row.lastAssignedAt;
      }
      grouped.set(row.workspaceMemberId, candidate);
    }
    return [...grouped.values()].filter((candidate) => candidate.capacity > 0);
  }

  async getOpenCounts(db: Db, workspaceId: string, memberIds: string[]) {
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
    for (const row of rows) {
      if (row.assignedMemberId) {
        counts.set(row.assignedMemberId, row._count._all);
      }
    }
    return counts;
  }

  async getCapacitySummary(workspaceId: string, memberId: string, db: Db = this.prisma) {
    const [candidate, counts] = await Promise.all([
      this.getCandidates(db, workspaceId, new Date()).then((items) =>
        items.find((item) => item.workspaceMemberId === memberId),
      ),
      this.getOpenCounts(db, workspaceId, [memberId]),
    ]);
    const openConversations = counts.get(memberId) ?? 0;
    const effectiveCapacity = candidate?.capacity ?? 0;
    return {
      openConversations,
      effectiveCapacity,
      overCapacity: openConversations > effectiveCapacity,
    };
  }

  async isOverCapacity(db: Db, workspaceId: string, memberId: string) {
    return (await this.getCapacitySummary(workspaceId, memberId, db)).overCapacity;
  }

  async markCurrentShiftUsage(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    memberId: string,
  ) {
    const candidate = (await this.getCandidates(tx, workspaceId, new Date())).find(
      (item) => item.workspaceMemberId === memberId,
    );
    if (candidate) {
      await this.markShiftMemberIdsUsed(tx, workspaceId, candidate.shiftMemberIds);
    }
  }

  async markShiftMemberIdsUsed(
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

  async setConversationAssignee(
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
    if (conversation.workspaceId !== workspaceId || !conversation.customerId) {
      return;
    }
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

  async lockMemberRow(tx: Prisma.TransactionClient, memberId: string) {
    await tx.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT id FROM workspace_members WHERE id = ${memberId}::uuid FOR UPDATE`,
    );
  }

  async lockMemberRows(tx: Prisma.TransactionClient, memberIds: string[]) {
    for (const memberId of [...new Set(memberIds)].sort()) {
      await this.lockMemberRow(tx, memberId);
    }
  }

  shiftIsActive(
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
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
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
    if (start < end) {
      return shift.weekdays.includes(day) && current >= start && current < end;
    }
    if (current >= start) return shift.weekdays.includes(day);
    if (current < end) return shift.weekdays.includes((day + 6) % 7);
    return false;
  }

  validateShift(input: ShiftInput) {
    if (
      typeof input.name !== 'string' ||
      !input.name.trim() ||
      input.name.trim().length > 120
    ) {
      throw new BadRequestException('Tên ca là bắt buộc và tối đa 120 ký tự.');
    }
    if (
      typeof input.startTime !== 'string' ||
      typeof input.endTime !== 'string' ||
      (input.timezone !== undefined && typeof input.timezone !== 'string')
    ) {
      throw new BadRequestException('Khung giờ hoặc múi giờ ca không hợp lệ.');
    }
    if (
      !TIME_RE.test(input.startTime) ||
      !TIME_RE.test(input.endTime) ||
      input.startTime === input.endTime
    ) {
      throw new BadRequestException('Khung giờ ca không hợp lệ.');
    }
    if (
      !Array.isArray(input.weekdays) ||
      !input.weekdays.length ||
      input.weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)
    ) {
      throw new BadRequestException('Chọn ít nhất một ngày áp dụng từ 0 đến 6.');
    }
    try {
      new Intl.DateTimeFormat('en-US', {
        timeZone: input.timezone || 'Asia/Ho_Chi_Minh',
      });
    } catch {
      throw new BadRequestException('Múi giờ không hợp lệ.');
    }
  }

  async assertShiftManager(workspaceId: string, actorId: string, shiftId: string) {
    if (await this.hasWorkspaceManagementPermission(workspaceId, actorId)) return;
    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: actorId,
        status: WorkspaceMemberStatus.ACTIVE,
        isActive: true,
        shiftAssignments: { some: { shiftId, isShiftManager: true } },
      },
    });
    if (!membership) {
      throw new ForbiddenException(
        'Chỉ Owner hoặc ca trưởng của ca này mới được thực hiện thao tác.',
      );
    }
  }

  async assertMemberManager(workspaceId: string, actorId: string, memberId: string) {
    if (await this.hasWorkspaceManagementPermission(workspaceId, actorId)) return;
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
    if (!membership) {
      throw new ForbiddenException(
        'Chỉ Owner hoặc ca trưởng của nhân viên mới được thực hiện thao tác.',
      );
    }
  }

  async assertQueueAccess(workspaceId: string, actorId: string) {
    if (await this.hasWorkspaceManagementPermission(workspaceId, actorId)) return;
    const candidates = await this.getCandidates(this.prisma, workspaceId, new Date());
    if (candidates.some((candidate) => candidate.userId === actorId)) return;
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
    if (!manager) {
      throw new ForbiddenException(
        'Hàng chờ chỉ dành cho Owner, ca trưởng hoặc nhân viên đang trực.',
      );
    }
  }

  async hasWorkspaceManagementPermission(workspaceId: string, userId: string) {
    const member = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
        status: WorkspaceMemberStatus.ACTIVE,
        isActive: true,
      },
      select: { role: true },
    });
    if (!member) return false;
    if (member.role === WorkspaceRole.OWNER || member.role === WorkspaceRole.MANAGER) {
      return true;
    }
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    });
    return workspace?.ownerId === userId;
  }

  private timeToMinutes(time: string) {
    const [hour, minute] = time.split(':').map(Number);
    return hour * 60 + minute;
  }
}
