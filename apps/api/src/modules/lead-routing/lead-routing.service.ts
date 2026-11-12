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

type Db = PrismaService | Prisma.TransactionClient;
type ShiftInput = {
  name: string;
  startTime: string;
  endTime: string;
  timezone?: string;
  weekdays: number[];
  isActive?: boolean;
};
type ShiftMemberInput = {
  workspaceMemberId: string;
  leadCapacity: number;
  isShiftManager?: boolean;
};
type Candidate = {
  workspaceMemberId: string;
  userId: string;
  capacity: number;
  lastAssignedAt: Date | null;
  shiftMemberIds: string[];
};

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const AUDIT_META = (before: unknown, after: unknown, reason: string) => ({
  before,
  after,
  reason,
});

@Injectable()
export class LeadRoutingService {
  private readonly logger = new Logger(LeadRoutingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService,
    @Optional() private readonly realtime?: RealtimeService,
  ) {}

  async listShifts(workspaceId: string) {
    return this.prisma.workShift.findMany({
      where: { workspaceId },
      orderBy: [{ isActive: 'desc' }, { startTime: 'asc' }, { name: 'asc' }],
      include: {
        members: {
          include: {
            workspaceMember: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                    status: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async createShift(workspaceId: string, actorId: string, input: ShiftInput) {
    if (!input || typeof input !== 'object')
      throw new BadRequestException('Cấu hình ca không hợp lệ.');
    this.validateShift(input);
    const shift = await this.prisma.$transaction(async (tx) => {
      const shift = await tx.workShift.create({
        data: {
          workspaceId,
          name: input.name.trim(),
          startTime: input.startTime,
          endTime: input.endTime,
          timezone: input.timezone || 'Asia/Ho_Chi_Minh',
          weekdays: input.weekdays,
          isActive: input.isActive ?? true,
        },
      });
      await this.audit.recordBusinessEvent(tx, {
        action: AuditAction.SHIFT_CREATED,
        workspaceId,
        actorId,
        metadata: {
          shiftId: shift.id,
          before: null,
          after: shift,
          reason: 'OWNER_CREATED_SHIFT',
        },
      });
      return shift;
    });
    await this.processWaitingQueue(workspaceId);
    return shift;
  }

  async updateShift(
    workspaceId: string,
    actorId: string,
    shiftId: string,
    patch: Partial<ShiftInput>,
  ) {
    if (!patch || typeof patch !== 'object')
      throw new BadRequestException('Thông tin cập nhật ca không hợp lệ.');
    if (patch.isActive !== undefined && typeof patch.isActive !== 'boolean')
      throw new BadRequestException('Trạng thái ca không hợp lệ.');
    const current = await this.prisma.workShift.findFirst({
      where: { id: shiftId, workspaceId },
    });
    if (!current) throw new NotFoundException('Không tìm thấy ca làm.');
    if (
      patch.name !== undefined ||
      patch.startTime !== undefined ||
      patch.endTime !== undefined ||
      patch.weekdays !== undefined ||
      patch.timezone !== undefined
    ) {
      this.validateShift({
        name: patch.name ?? current.name,
        startTime: patch.startTime ?? current.startTime,
        endTime: patch.endTime ?? current.endTime,
        timezone: patch.timezone ?? current.timezone,
        weekdays: patch.weekdays ?? current.weekdays,
      });
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.workShift.update({
        where: { id: shiftId },
        data: {
          ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
          ...(patch.startTime !== undefined
            ? { startTime: patch.startTime }
            : {}),
          ...(patch.endTime !== undefined ? { endTime: patch.endTime } : {}),
          ...(patch.timezone !== undefined ? { timezone: patch.timezone } : {}),
          ...(patch.weekdays !== undefined ? { weekdays: patch.weekdays } : {}),
          ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
        },
      });
      await this.audit.recordBusinessEvent(tx, {
        action:
          patch.isActive === false
            ? AuditAction.SHIFT_DEACTIVATED
            : AuditAction.SHIFT_UPDATED,
        workspaceId,
        actorId,
        metadata: {
          shiftId: shiftId,
          ...AUDIT_META(current, result, 'OWNER_UPDATED_SHIFT'),
        },
      });
      return result;
    });
    await this.processWaitingQueue(workspaceId);
    return updated;
  }

  async deleteUnusedShift(
    workspaceId: string,
    actorId: string,
    shiftId: string,
  ) {
    const shift = await this.prisma.workShift.findFirst({
      where: { id: shiftId, workspaceId },
    });
    if (!shift) throw new NotFoundException('Không tìm thấy ca làm.');
    if (shift.usedAt)
      throw new ConflictException('Ca đã được sử dụng; chỉ có thể tắt ca.');
    await this.prisma.$transaction(async (tx) => {
      await tx.workShift.delete({ where: { id: shiftId } });
      await this.audit.recordBusinessEvent(tx, {
        action: AuditAction.SHIFT_DELETED,
        workspaceId,
        actorId,
        metadata: {
          shiftId: shift.id,
          before: shift,
          after: null,
          reason: 'UNUSED_SHIFT_DELETED',
        },
      });
    });
    return { success: true };
  }

  async replaceShiftMembers(
    workspaceId: string,
    actorId: string,
    shiftId: string,
    members: ShiftMemberInput[],
  ) {
    if (!Array.isArray(members))
      throw new BadRequestException(
        'Danh sách nhân viên trong ca không hợp lệ.',
      );
    const shift = await this.prisma.workShift.findFirst({
      where: { id: shiftId, workspaceId },
    });
    if (!shift) throw new NotFoundException('Không tìm thấy ca làm.');
    for (const entry of members) {
      if (
        !Number.isInteger(entry.leadCapacity) ||
        entry.leadCapacity < 0 ||
        entry.leadCapacity > 10000
      ) {
        throw new BadRequestException(
          'Hạn mức phải là số nguyên từ 0 đến 10000.',
        );
      }
    }
    const memberIds = [
      ...new Set(members.map((entry) => entry.workspaceMemberId)),
    ];
    if (memberIds.length !== members.length)
      throw new BadRequestException(
        'Một nhân viên chỉ được thêm một lần trong mỗi ca.',
      );
    const valid = await this.prisma.workspaceMember.findMany({
      where: {
        id: { in: memberIds },
        workspaceId,
        isActive: true,
        status: WorkspaceMemberStatus.ACTIVE,
      },
      select: { id: true },
    });
    if (valid.length !== memberIds.length)
      throw new BadRequestException(
        'Danh sách có thành viên không hoạt động trong workspace.',
      );

    const updated = await this.prisma.$transaction(async (tx) => {
      const before = await tx.workShiftMember.findMany({ where: { shiftId } });
      await tx.workShiftMember.deleteMany({ where: { shiftId } });
      const after = members.length
        ? await tx.workShiftMember.createMany({
            data: members.map((entry) => ({
              shiftId,
              workspaceMemberId: entry.workspaceMemberId,
              leadCapacity: entry.leadCapacity,
              isShiftManager: entry.isShiftManager ?? false,
            })),
          })
        : { count: 0 };
      await this.audit.recordBusinessEvent(tx, {
        action: AuditAction.SHIFT_MEMBER_UPDATED,
        workspaceId,
        actorId,
        metadata: {
          shiftId,
          shiftName: shift.name,
          before,
          after: members,
          reason: 'OWNER_REPLACED_SHIFT_MEMBERS',
          affectedCount: after.count,
        },
      });
      return tx.workShiftMember.findMany({
        where: { shiftId },
        include: { workspaceMember: { include: { user: true } } },
      });
    });
    await this.processWaitingQueue(workspaceId);
    return updated;
  }

  async getRoster(workspaceId: string, now = new Date()) {
    const candidates = await this.getCandidates(this.prisma, workspaceId, now);
    const counts = await this.getOpenCounts(
      this.prisma,
      workspaceId,
      candidates.map((candidate) => candidate.workspaceMemberId),
    );
    const activeShiftMembers = await this.prisma.workShiftMember.findMany({
      where: { shift: { workspaceId } },
      include: { shift: true, workspaceMember: { include: { user: true } } },
    });
    const memberIds = [
      ...new Set(activeShiftMembers.map((entry) => entry.workspaceMemberId)),
    ];
    const exceptionRows = await this.prisma.staffAvailabilityException.findMany(
      {
        where: {
          workspaceId,
          workspaceMemberId: { in: memberIds },
          status: AvailabilityExceptionStatus.ACTIVE,
          startsAt: { lte: now },
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        },
        select: {
          id: true,
          workspaceMemberId: true,
          shiftId: true,
          type: true,
          endsAt: true,
        },
      },
    );
    const unavailable = new Set(
      exceptionRows
        .filter(
          (item) => item.type === AvailabilityExceptionType.UNEXPECTED_LEAVE,
        )
        .map((item) => item.workspaceMemberId),
    );
    const eligibleAssignments = activeShiftMembers.filter(
      (entry) =>
        entry.shift.isActive &&
        (this.shiftIsActive(entry.shift, now) ||
          exceptionRows.some(
            (exception) =>
              exception.type === AvailabilityExceptionType.OVERTIME_CONSENT &&
              exception.workspaceMemberId === entry.workspaceMemberId &&
              exception.shiftId === entry.shiftId,
          )),
    );
    const aggregate = new Map<
      string,
      { capacity: number; manager: boolean; shiftNames: string[] }
    >();
    for (const entry of eligibleAssignments) {
      const current = aggregate.get(entry.workspaceMemberId) ?? {
        capacity: 0,
        manager: false,
        shiftNames: [],
      };
      current.capacity += entry.leadCapacity;
      current.manager ||= entry.isShiftManager;
      current.shiftNames.push(entry.shift.name);
      aggregate.set(entry.workspaceMemberId, current);
    }
    const candidateById = new Map(
      candidates.map((item) => [item.workspaceMemberId, item]),
    );
    return activeShiftMembers
      .map((entry) => {
        const state = aggregate.get(entry.workspaceMemberId) ?? {
          capacity: 0,
          manager: false,
          shiftNames: [],
        };
        const active =
          entry.workspaceMember.status === WorkspaceMemberStatus.ACTIVE &&
          entry.workspaceMember.isActive &&
          entry.workspaceMember.user.status === UserStatus.ACTIVE;
        const online = eligibleAssignments.some(
          (row) => row.workspaceMemberId === entry.workspaceMemberId,
        );
        const overtime = eligibleAssignments.find(
          (row) =>
            row.workspaceMemberId === entry.workspaceMemberId &&
            !this.shiftIsActive(row.shift, now) &&
            exceptionRows.some(
              (exception) =>
                exception.type === AvailabilityExceptionType.OVERTIME_CONSENT &&
                exception.workspaceMemberId === entry.workspaceMemberId &&
                exception.shiftId === row.shiftId,
            ),
        );
        const isEligible =
          active &&
          !entry.workspaceMember.assignmentLocked &&
          !unavailable.has(entry.workspaceMemberId) &&
          online &&
          state.capacity > 0 &&
          Boolean(candidateById.get(entry.workspaceMemberId));
        return {
          workspaceMemberId: entry.workspaceMemberId,
          userId: entry.workspaceMember.userId,
          fullName: entry.workspaceMember.user.fullName,
          email: entry.workspaceMember.user.email,
          accountStatus: entry.workspaceMember.user.status,
          shifts: [...new Set(state.shiftNames)],
          shiftIds: [
            ...new Set(
              eligibleAssignments
                .filter(
                  (row) => row.workspaceMemberId === entry.workspaceMemberId,
                )
                .map((row) => row.shiftId),
            ),
          ],
          isShiftManager: state.manager,
          assignmentLocked: entry.workspaceMember.assignmentLocked,
          isOnShift: online,
          isEligible,
          isAvailable:
            isEligible &&
            (counts.get(entry.workspaceMemberId) ?? 0) < state.capacity,
          hasOvertimeConsent: Boolean(overtime),
          overtimeConsentUntil: overtime
            ? (exceptionRows.find(
                (item) =>
                  item.workspaceMemberId === entry.workspaceMemberId &&
                  item.shiftId === overtime.shiftId &&
                  item.type === AvailabilityExceptionType.OVERTIME_CONSENT,
              )?.endsAt ?? null)
            : null,
          openConversations: counts.get(entry.workspaceMemberId) ?? 0,
          effectiveCapacity: state.capacity,
          activeLeaveExceptionId:
            exceptionRows.find(
              (item) =>
                item.workspaceMemberId === entry.workspaceMemberId &&
                item.type === AvailabilityExceptionType.UNEXPECTED_LEAVE,
            )?.id ?? null,
        };
      })
      .filter(
        (row, index, all) =>
          all.findIndex(
            (other) => other.workspaceMemberId === row.workspaceMemberId,
          ) === index,
      );
  }

  async getCapacitySummary(
    workspaceId: string,
    memberId: string,
    db: Db = this.prisma,
  ) {
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

  async markCurrentShiftUsage(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    memberId: string,
  ) {
    const candidate = (
      await this.getCandidates(tx, workspaceId, new Date())
    ).find((item) => item.workspaceMemberId === memberId);
    if (candidate)
      await this.markShiftMemberIdsUsed(
        tx,
        workspaceId,
        candidate.shiftMemberIds,
      );
  }

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

  async routeNewConversation(conversationId: string, workspaceId: string) {
    const configuredShiftCount = await this.prisma.workShift.count({
      where: { workspaceId },
    });
    if (configuredShiftCount === 0) return { status: 'LEGACY' as const };

    const result = await this.prisma.$transaction(
      async (tx) => {
        const conversation = await tx.conversation.findFirst({
          where: { id: conversationId, workspaceId },
        });
        if (
          !conversation ||
          conversation.status !== 'OPEN' ||
          conversation.assignedMemberId
        )
          return { status: 'SKIPPED' as const };
        const now = new Date();
        const candidates = await this.getCandidates(tx, workspaceId, now);
        const counts = await this.getOpenCounts(
          tx,
          workspaceId,
          candidates.map((candidate) => candidate.workspaceMemberId),
        );
        const sorted = candidates
          .filter(
            (candidate) =>
              (counts.get(candidate.workspaceMemberId) ?? 0) <
              candidate.capacity,
          )
          .sort((a, b) => {
            const ratio =
              (counts.get(a.workspaceMemberId) ?? 0) / a.capacity -
              (counts.get(b.workspaceMemberId) ?? 0) / b.capacity;
            if (ratio) return ratio;
            if (!a.lastAssignedAt && b.lastAssignedAt) return -1;
            if (a.lastAssignedAt && !b.lastAssignedAt) return 1;
            return (
              (a.lastAssignedAt?.getTime() ?? 0) -
              (b.lastAssignedAt?.getTime() ?? 0)
            );
          });
        const candidate = sorted[0];
        if (!candidate) {
          const hasActiveWindow = await tx.workShift.findMany({
            where: { workspaceId, isActive: true },
          });
          const reason = hasActiveWindow.some((shift) =>
            this.shiftIsActive(shift, now),
          )
            ? LeadQueueReason.NO_CAPACITY
            : LeadQueueReason.NO_ACTIVE_SHIFT;
          const queued = await this.queueWithinTransaction(
            tx,
            workspaceId,
            conversationId,
            reason,
          );
          return { status: 'QUEUED' as const, reason, created: queued.created };
        }
        await this.lockMemberRow(tx, candidate.workspaceMemberId);
        const refreshedCandidate = (
          await this.getCandidates(tx, workspaceId, now)
        ).find((row) => row.workspaceMemberId === candidate.workspaceMemberId);
        const recheckedCounts = await this.getOpenCounts(tx, workspaceId, [
          candidate.workspaceMemberId,
        ]);
        if (
          !refreshedCandidate ||
          (recheckedCounts.get(candidate.workspaceMemberId) ?? 0) >=
            refreshedCandidate.capacity
        ) {
          const queued = await this.queueWithinTransaction(
            tx,
            workspaceId,
            conversationId,
            LeadQueueReason.NO_CAPACITY,
          );
          return {
            status: 'QUEUED' as const,
            reason: LeadQueueReason.NO_CAPACITY,
            created: queued.created,
          };
        }
        const current = await tx.conversation.findFirst({
          where: {
            id: conversationId,
            workspaceId,
            assignedMemberId: null,
            status: 'OPEN',
          },
        });
        if (!current) return { status: 'SKIPPED' as const };
        await this.setConversationAssignee(
          tx,
          workspaceId,
          conversationId,
          candidate.workspaceMemberId,
        );
        await this.markShiftMemberIdsUsed(
          tx,
          workspaceId,
          refreshedCandidate.shiftMemberIds,
        );
        const chosenShiftMember = await tx.workShiftMember.findFirst({
          where: {
            id: { in: refreshedCandidate.shiftMemberIds },
            shift: { isActive: true },
          },
          orderBy: { lastAssignedAt: 'asc' },
        });
        if (chosenShiftMember)
          await tx.workShiftMember.update({
            where: { id: chosenShiftMember.id },
            data: { lastAssignedAt: now },
          });
        await tx.leadQueueEntry.updateMany({
          where: { conversationId, status: LeadQueueStatus.WAITING },
          data: {
            status: LeadQueueStatus.ASSIGNED,
            assignedAt: now,
            resolvedAt: now,
          },
        });
        await this.audit.recordBusinessEvent(tx, {
          action: AuditAction.LEAD_AUTO_ASSIGNED,
          workspaceId,
          actorId: null,
          metadata: {
            conversationId,
            assigneeWorkspaceMemberId: candidate.workspaceMemberId,
            capacity: refreshedCandidate.capacity,
            openBefore: recheckedCounts.get(candidate.workspaceMemberId) ?? 0,
            source: 'SHIFT_ROUTING',
          },
        });
        return {
          status: 'ASSIGNED' as const,
          assignedMemberId: candidate.workspaceMemberId,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (result.status === 'ASSIGNED') {
      this.realtime?.emit(
        'conversation:assigned',
        { conversationId, assignedMemberId: result.assignedMemberId },
        workspaceId,
      );
    } else if (result.status === 'QUEUED' && result.created) {
      await this.notifyQueue(workspaceId, conversationId, 0);
    }
    return result;
  }

  async listQueue(workspaceId: string, actorId: string) {
    await this.assertQueueAccess(workspaceId, actorId);
    return this.prisma.leadQueueEntry.findMany({
      where: { workspaceId, status: LeadQueueStatus.WAITING },
      orderBy: [{ priority: 'desc' }, { queuedAt: 'asc' }],
      include: {
        conversation: {
          include: {
            customer: true,
            assignedMember: { include: { user: true } },
          },
        },
      },
    });
  }

  async claimQueueEntry(
    workspaceId: string,
    actorId: string,
    conversationId: string,
  ) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: actorId,
        status: WorkspaceMemberStatus.ACTIVE,
        isActive: true,
      },
    });
    if (!membership)
      throw new ForbiddenException('Bạn không thuộc workspace này.');
    const result = await this.prisma.$transaction(
      async (tx) => {
        await this.lockMemberRow(tx, membership.id);
        const entry = await tx.leadQueueEntry.findFirst({
          where: {
            workspaceId,
            conversationId,
            status: LeadQueueStatus.WAITING,
          },
        });
        if (!entry)
          throw new NotFoundException('Lead không còn trong hàng chờ.');
        const candidates = await this.getCandidates(
          tx,
          workspaceId,
          new Date(),
        );
        const candidate = candidates.find(
          (item) => item.workspaceMemberId === membership.id,
        );
        if (!candidate)
          throw new ConflictException(
            'Bạn hiện không trong ca hoặc đang không đủ điều kiện nhận lead.',
          );
        const counts = await this.getOpenCounts(tx, workspaceId, [
          membership.id,
        ]);
        if ((counts.get(membership.id) ?? 0) >= candidate.capacity)
          throw new ConflictException('Bạn đã đạt hạn mức hội thoại mở.');
        const current = await tx.conversation.findFirst({
          where: {
            id: conversationId,
            workspaceId,
            assignedMemberId: null,
            status: 'OPEN',
          },
          select: { id: true },
        });
        if (!current)
          throw new ConflictException(
            'Hội thoại đã thay đổi hoặc không còn mở.',
          );
        await this.setConversationAssignee(
          tx,
          workspaceId,
          conversationId,
          membership.id,
        );
        await this.markShiftMemberIdsUsed(
          tx,
          workspaceId,
          candidate.shiftMemberIds,
        );
        const updated = await tx.leadQueueEntry.updateMany({
          where: { id: entry.id, status: LeadQueueStatus.WAITING },
          data: {
            status: LeadQueueStatus.ASSIGNED,
            assignedAt: new Date(),
            assignedById: actorId,
            resolvedAt: new Date(),
          },
        });
        if (!updated.count)
          throw new ConflictException('Lead vừa được người khác nhận.');
        await this.audit.recordBusinessEvent(tx, {
          action: AuditAction.LEAD_CLAIMED,
          workspaceId,
          actorId,
          metadata: {
            conversationId,
            assigneeWorkspaceMemberId: membership.id,
            source: 'TEAM_QUEUE',
          },
        });
        return {
          success: true,
          conversationId,
          assignedMemberId: membership.id,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    this.realtime?.emit('conversation:assigned', result, workspaceId);
    return result;
  }

  async handover(
    workspaceId: string,
    actorId: string,
    conversationId: string,
    targetMemberId?: string | null,
  ) {
    const existingConversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, workspaceId },
      select: { assignedMemberId: true },
    });
    if (!existingConversation)
      throw new NotFoundException('Không tìm thấy hội thoại trong workspace.');
    const workspaceManager = await this.hasWorkspaceManagementPermission(
      workspaceId,
      actorId,
    );
    if (!workspaceManager && existingConversation.assignedMemberId) {
      await this.assertMemberManager(
        workspaceId,
        actorId,
        existingConversation.assignedMemberId,
      );
    } else if (!workspaceManager) {
      const shiftManager = await this.prisma.workspaceMember.findFirst({
        where: {
          workspaceId,
          userId: actorId,
          status: WorkspaceMemberStatus.ACTIVE,
          isActive: true,
          shiftAssignments: { some: { isShiftManager: true } },
        },
        select: { id: true },
      });
      if (!shiftManager)
        throw new ForbiddenException(
          'Chỉ Owner, Quản lý workspace hoặc ca trưởng mới được bàn giao lead.',
        );
    }
    const result = await this.prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.findFirst({
        where: { id: conversationId, workspaceId },
      });
      if (!conversation)
        throw new NotFoundException(
          'Không tìm thấy hội thoại trong workspace.',
        );
      if (!targetMemberId) {
        await this.setConversationAssignee(
          tx,
          workspaceId,
          conversationId,
          null,
        );
        const entry = await this.queueWithinTransaction(
          tx,
          workspaceId,
          conversationId,
          LeadQueueReason.HANDOVER_REQUIRED,
        );
        await this.audit.recordBusinessEvent(tx, {
          action: AuditAction.LEAD_HANDED_OVER,
          workspaceId,
          actorId,
          metadata: {
            conversationId,
            previousAssignee: conversation.assignedMemberId,
            newAssignee: null,
            queueEntryId: entry.entry.id,
          },
        });
        return { success: true, queued: true };
      }
      const target = await tx.workspaceMember.findFirst({
        where: {
          id: targetMemberId,
          workspaceId,
          status: WorkspaceMemberStatus.ACTIVE,
          isActive: true,
          assignmentLocked: false,
          user: { status: UserStatus.ACTIVE },
        },
        select: { id: true },
      });
      if (!target)
        throw new BadRequestException(
          'Người nhận không hoạt động trong workspace.',
        );
      await this.setConversationAssignee(
        tx,
        workspaceId,
        conversationId,
        targetMemberId,
      );
      await this.markCurrentShiftUsage(tx, workspaceId, targetMemberId);
      await tx.leadQueueEntry.updateMany({
        where: { conversationId, status: LeadQueueStatus.WAITING },
        data: {
          status: LeadQueueStatus.ASSIGNED,
          assignedAt: new Date(),
          assignedById: actorId,
          resolvedAt: new Date(),
        },
      });
      const overCapacity = await this.isOverCapacity(
        tx,
        workspaceId,
        targetMemberId,
      );
      await this.audit.recordBusinessEvent(tx, {
        action: AuditAction.LEAD_HANDED_OVER,
        workspaceId,
        actorId,
        metadata: {
          conversationId,
          previousAssignee: conversation.assignedMemberId,
          newAssignee: targetMemberId,
          overCapacity,
          source: 'MANUAL_HANDOVER',
        },
      });
      return { success: true, queued: false, overCapacity };
    });
    if (result.queued)
      await this.processAndNotifyQueue(workspaceId, [conversationId]);
    this.realtime?.emit(
      'conversation:assigned',
      { conversationId, ...result },
      workspaceId,
    );
    return result;
  }

  async offboardMember(
    workspaceId: string,
    actorId: string,
    memberId: string,
    mode: 'QUEUE' | 'TRANSFER',
    targetMemberId?: string,
  ) {
    if (!(await this.hasWorkspaceManagementPermission(workspaceId, actorId))) {
      throw new ForbiddenException(
        'Chỉ Owner hoặc Quản lý workspace mới được hoàn tất bàn giao nhân viên.',
      );
    }
    const member = await this.prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
    });
    if (!member)
      throw new NotFoundException('Không tìm thấy thành viên cần bàn giao.');
    const technicalOwner = await this.prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        OR: [
          { ownerId: actorId },
          {
            members: {
              some: {
                userId: actorId,
                role: 'OWNER',
                isActive: true,
                status: WorkspaceMemberStatus.ACTIVE,
              },
            },
          },
        ],
      },
      select: { id: true },
    });
    if (
      !technicalOwner &&
      (member.role === 'OWNER' || member.isWorkspaceManager)
    ) {
      throw new ForbiddenException(
        'Quản lý workspace không thể bàn giao hoặc gỡ Owner/Quản lý workspace khác.',
      );
    }
    if (mode === 'TRANSFER') {
      if (!targetMemberId || targetMemberId === memberId)
        throw new BadRequestException(
          'Chọn một nhân viên khác để nhận bàn giao.',
        );
      const target = await this.prisma.workspaceMember.findFirst({
        where: {
          id: targetMemberId,
          workspaceId,
          status: WorkspaceMemberStatus.ACTIVE,
          isActive: true,
          assignmentLocked: false,
          user: { status: UserStatus.ACTIVE },
        },
      });
      if (!target)
        throw new BadRequestException(
          'Người nhận bàn giao không hoạt động hoặc đang bị khóa nhận lead.',
        );
    }
    const handoff = await this.prisma.$transaction(async (tx) => {
      await this.lockMemberRows(tx, [
        memberId,
        ...(mode === 'TRANSFER' && targetMemberId ? [targetMemberId] : []),
      ]);
      if (mode === 'TRANSFER') {
        const target = await tx.workspaceMember.findFirst({
          where: {
            id: targetMemberId,
            workspaceId,
            status: WorkspaceMemberStatus.ACTIVE,
            isActive: true,
            assignmentLocked: false,
            user: { status: UserStatus.ACTIVE },
          },
          select: { id: true },
        });
        if (!target)
          throw new BadRequestException(
            'Người nhận bàn giao không hoạt động hoặc đang bị khóa nhận lead.',
          );
        await this.markCurrentShiftUsage(tx, workspaceId, target.id);
      }
      const conversations = await tx.conversation.findMany({
        where: { workspaceId, assignedMemberId: memberId, status: 'OPEN' },
        select: { id: true },
      });
      await this.audit.recordBusinessEvent(tx, {
        action: AuditAction.OFFBOARDING_STARTED,
        workspaceId,
        actorId,
        metadata: {
          workspaceMemberId: memberId,
          activeConversationIds: conversations.map((item) => item.id),
          mode,
          targetMemberId: targetMemberId ?? null,
        },
      });
      for (const conversation of conversations) {
        const previousAssignee = memberId;
        const newAssignee = mode === 'TRANSFER' ? targetMemberId! : null;
        await this.setConversationAssignee(
          tx,
          workspaceId,
          conversation.id,
          newAssignee,
        );
        if (mode === 'QUEUE')
          await this.queueWithinTransaction(
            tx,
            workspaceId,
            conversation.id,
            LeadQueueReason.HANDOVER_REQUIRED,
          );
        else
          await tx.leadQueueEntry.updateMany({
            where: {
              conversationId: conversation.id,
              status: LeadQueueStatus.WAITING,
            },
            data: {
              status: LeadQueueStatus.ASSIGNED,
              assignedAt: new Date(),
              assignedById: actorId,
              resolvedAt: new Date(),
            },
          });
        await this.audit.recordBusinessEvent(tx, {
          action: AuditAction.LEAD_HANDED_OVER,
          workspaceId,
          actorId,
          metadata: {
            conversationId: conversation.id,
            previousAssignee,
            newAssignee,
            reason: 'STAFF_OFFBOARDING',
          },
        });
      }
      await tx.workspaceMember.update({
        where: { id: memberId },
        data: { isActive: false, assignmentLocked: true },
      });
      await tx.workShiftMember.deleteMany({
        where: { workspaceMemberId: memberId },
      });
      await this.audit.recordBusinessEvent(tx, {
        action: AuditAction.OFFBOARDING_COMPLETED,
        workspaceId,
        actorId,
        metadata: {
          workspaceMemberId: memberId,
          handedOverCount: conversations.length,
          mode,
          targetMemberId: targetMemberId ?? null,
        },
      });
      return {
        handedOverCount: conversations.length,
        conversationIds: conversations.map((item) => item.id),
      };
    });
    if (mode === 'QUEUE')
      await this.processAndNotifyQueue(workspaceId, handoff.conversationIds);
    else await this.processWaitingQueue(workspaceId);
    this.realtime?.emit(
      'staff:offboarded',
      { workspaceMemberId: memberId },
      workspaceId,
    );
    const overCapacity =
      mode === 'TRANSFER' && targetMemberId
        ? await this.isOverCapacity(this.prisma, workspaceId, targetMemberId)
        : false;
    return {
      success: true,
      handedOverCount: handoff.handedOverCount,
      mode,
      overCapacity,
    };
  }

  async setUnexpectedLeave(
    workspaceId: string,
    actorId: string,
    shiftId: string,
    targetMemberId: string,
    mode: 'QUEUE' | 'TRANSFER',
    assigneeId?: string,
    note?: string,
  ) {
    await this.assertShiftManager(workspaceId, actorId, shiftId);
    const cleanNote = typeof note === 'string' ? note.trim().slice(0, 500) : '';
    const shiftMember = await this.prisma.workShiftMember.findFirst({
      where: {
        shiftId,
        workspaceMemberId: targetMemberId,
        shift: { workspaceId },
      },
    });
    if (!shiftMember)
      throw new NotFoundException('Nhân viên không thuộc ca này.');
    const existingException =
      await this.prisma.staffAvailabilityException.findFirst({
        where: {
          workspaceId,
          workspaceMemberId: targetMemberId,
          type: AvailabilityExceptionType.UNEXPECTED_LEAVE,
          status: AvailabilityExceptionStatus.ACTIVE,
          startsAt: { lte: new Date() },
          OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
        },
        select: { id: true },
      });
    if (existingException)
      throw new ConflictException('Nhân viên đã được đánh dấu nghỉ đột xuất.');
    if (mode === 'TRANSFER' && !assigneeId)
      throw new BadRequestException('Chọn nhân viên nhận bàn giao.');
    if (mode === 'TRANSFER' && assigneeId === targetMemberId)
      throw new BadRequestException(
        'Chọn một nhân viên khác để nhận bàn giao.',
      );
    const result = await this.prisma.$transaction(async (tx) => {
      await this.lockMemberRows(tx, [
        targetMemberId,
        ...(mode === 'TRANSFER' && assigneeId ? [assigneeId] : []),
      ]);
      const activeLeave = await tx.staffAvailabilityException.findFirst({
        where: {
          workspaceId,
          workspaceMemberId: targetMemberId,
          type: AvailabilityExceptionType.UNEXPECTED_LEAVE,
          status: AvailabilityExceptionStatus.ACTIVE,
          startsAt: { lte: new Date() },
          OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
        },
        select: { id: true },
      });
      if (activeLeave)
        throw new ConflictException(
          'Nhân viên đã được đánh dấu nghỉ đột xuất.',
        );
      const affected = await tx.conversation.findMany({
        where: {
          workspaceId,
          assignedMemberId: targetMemberId,
          status: 'OPEN',
        },
        select: { id: true },
      });
      const created = await tx.staffAvailabilityException.create({
        data: {
          workspaceId,
          workspaceMemberId: targetMemberId,
          shiftId,
          type: AvailabilityExceptionType.UNEXPECTED_LEAVE,
          startsAt: new Date(),
          status: AvailabilityExceptionStatus.ACTIVE,
          requestedById: actorId,
          approvedById: actorId,
          reasonCode: 'UNEXPECTED_LEAVE',
          note: cleanNote || null,
        },
      });
      if (mode === 'QUEUE') {
        for (const item of affected) {
          await this.setConversationAssignee(tx, workspaceId, item.id, null);
          await this.queueWithinTransaction(
            tx,
            workspaceId,
            item.id,
            LeadQueueReason.UNEXPECTED_LEAVE,
          );
        }
      } else {
        const destination = await tx.workspaceMember.findFirst({
          where: {
            id: assigneeId,
            workspaceId,
            status: WorkspaceMemberStatus.ACTIVE,
            isActive: true,
            assignmentLocked: false,
            user: { status: UserStatus.ACTIVE },
          },
        });
        if (!destination)
          throw new BadRequestException(
            'Người nhận bàn giao không hoạt động trong workspace.',
          );
        await this.markCurrentShiftUsage(tx, workspaceId, destination.id);
        for (const item of affected) {
          await this.setConversationAssignee(
            tx,
            workspaceId,
            item.id,
            destination.id,
          );
          await tx.leadQueueEntry.updateMany({
            where: { conversationId: item.id, status: LeadQueueStatus.WAITING },
            data: {
              status: LeadQueueStatus.ASSIGNED,
              assignedAt: new Date(),
              assignedById: actorId,
              resolvedAt: new Date(),
            },
          });
        }
      }
      await this.audit.recordBusinessEvent(tx, {
        action: AuditAction.STAFF_ABSENCE_RECORDED,
        workspaceId,
        actorId,
        metadata: {
          exceptionId: created.id,
          shiftId,
          workspaceMemberId: targetMemberId,
          mode,
          affectedConversationIds: affected.map((item) => item.id),
          assigneeId: assigneeId ?? null,
          note: cleanNote || null,
        },
      });
      return { exception: created, affected };
    });
    if (mode === 'QUEUE') {
      await this.processAndNotifyQueue(
        workspaceId,
        result.affected.map((item) => item.id),
      );
    }
    this.realtime?.emit(
      'staff:availability_updated',
      { workspaceMemberId: targetMemberId },
      workspaceId,
    );
    const overCapacity =
      mode === 'TRANSFER' && assigneeId
        ? await this.isOverCapacity(this.prisma, workspaceId, assigneeId)
        : false;
    return {
      exception: result.exception,
      affectedCount: result.affected.length,
      overCapacity,
    };
  }

  async endUnexpectedLeave(
    workspaceId: string,
    actorId: string,
    exceptionId: string,
  ) {
    const exception = await this.prisma.staffAvailabilityException.findFirst({
      where: {
        id: exceptionId,
        workspaceId,
        type: AvailabilityExceptionType.UNEXPECTED_LEAVE,
        status: AvailabilityExceptionStatus.ACTIVE,
      },
    });
    if (!exception)
      throw new NotFoundException(
        'Không tìm thấy trạng thái nghỉ đang hoạt động.',
      );
    await this.assertMemberManager(
      workspaceId,
      actorId,
      exception.workspaceMemberId,
    );
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.staffAvailabilityException.update({
        where: { id: exception.id },
        data: { status: AvailabilityExceptionStatus.ENDED, endsAt: new Date() },
      });
      await this.audit.recordBusinessEvent(tx, {
        action: AuditAction.STAFF_ABSENCE_ENDED,
        workspaceId,
        actorId,
        metadata: {
          exceptionId,
          shiftId: exception.shiftId,
          workspaceMemberId: exception.workspaceMemberId,
        },
      });
      return result;
    });
    this.realtime?.emit(
      'staff:availability_updated',
      { workspaceMemberId: exception.workspaceMemberId },
      workspaceId,
    );
    await this.processWaitingQueue(workspaceId);
    return updated;
  }

  async setAssignmentLock(
    workspaceId: string,
    actorId: string,
    memberId: string,
    locked: boolean,
    handoverMode: 'QUEUE' | 'TRANSFER' = 'QUEUE',
    targetMemberId?: string,
  ) {
    if (!(await this.hasWorkspaceManagementPermission(workspaceId, actorId))) {
      await this.assertMemberManager(workspaceId, actorId, memberId);
    }
    const member = await this.prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
    });
    if (!member)
      throw new NotFoundException('Không tìm thấy thành viên trong workspace.');
    if (locked && handoverMode === 'TRANSFER') {
      if (!targetMemberId || targetMemberId === memberId)
        throw new BadRequestException(
          'Chọn một nhân viên khác để nhận bàn giao.',
        );
      const target = await this.prisma.workspaceMember.findFirst({
        where: {
          id: targetMemberId,
          workspaceId,
          status: WorkspaceMemberStatus.ACTIVE,
          isActive: true,
          assignmentLocked: false,
          user: { status: UserStatus.ACTIVE },
        },
      });
      if (!target)
        throw new BadRequestException(
          'Người nhận bàn giao không hoạt động hoặc đang bị khóa nhận lead.',
        );
    }
    const handoff = await this.prisma.$transaction(async (tx) => {
      await this.lockMemberRows(tx, [
        memberId,
        ...(locked && handoverMode === 'TRANSFER' && targetMemberId
          ? [targetMemberId]
          : []),
      ]);
      if (locked && handoverMode === 'TRANSFER') {
        const target = await tx.workspaceMember.findFirst({
          where: {
            id: targetMemberId,
            workspaceId,
            status: WorkspaceMemberStatus.ACTIVE,
            isActive: true,
            assignmentLocked: false,
            user: { status: UserStatus.ACTIVE },
          },
          select: { id: true },
        });
        if (!target)
          throw new BadRequestException(
            'Người nhận bàn giao không hoạt động hoặc đang bị khóa nhận lead.',
          );
        await this.markCurrentShiftUsage(tx, workspaceId, target.id);
      }
      const conversations = locked
        ? await tx.conversation.findMany({
            where: { workspaceId, assignedMemberId: memberId, status: 'OPEN' },
            select: { id: true },
          })
        : [];
      await tx.workspaceMember.update({
        where: { id: memberId },
        data: { assignmentLocked: locked },
      });
      for (const conversation of conversations) {
        const newAssignee =
          handoverMode === 'TRANSFER' ? targetMemberId! : null;
        await this.setConversationAssignee(
          tx,
          workspaceId,
          conversation.id,
          newAssignee,
        );
        if (handoverMode === 'QUEUE')
          await this.queueWithinTransaction(
            tx,
            workspaceId,
            conversation.id,
            LeadQueueReason.HANDOVER_REQUIRED,
          );
        else
          await tx.leadQueueEntry.updateMany({
            where: {
              conversationId: conversation.id,
              status: LeadQueueStatus.WAITING,
            },
            data: {
              status: LeadQueueStatus.ASSIGNED,
              assignedAt: new Date(),
              assignedById: actorId,
              resolvedAt: new Date(),
            },
          });
        await this.audit.recordBusinessEvent(tx, {
          action: AuditAction.LEAD_HANDED_OVER,
          workspaceId,
          actorId,
          metadata: {
            conversationId: conversation.id,
            previousAssignee: memberId,
            newAssignee,
            reason: 'STAFF_ASSIGNMENT_LOCKED',
          },
        });
      }
      await this.audit.recordBusinessEvent(tx, {
        action: locked
          ? AuditAction.STAFF_ASSIGNMENT_LOCKED
          : AuditAction.STAFF_ASSIGNMENT_UNLOCKED,
        workspaceId,
        actorId,
        metadata: {
          workspaceMemberId: memberId,
          before: member.assignmentLocked,
          after: locked,
          handoverMode: locked ? handoverMode : null,
          targetMemberId: targetMemberId ?? null,
          handedOverCount: conversations.length,
        },
      });
      return { conversations };
    });
    this.realtime?.emit(
      'staff:availability_updated',
      { workspaceMemberId: memberId },
      workspaceId,
    );
    if (locked && handoverMode === 'QUEUE')
      await this.processAndNotifyQueue(
        workspaceId,
        handoff.conversations.map((item) => item.id),
      );
    else await this.processWaitingQueue(workspaceId);
    const overCapacity =
      locked && handoverMode === 'TRANSFER' && targetMemberId
        ? await this.isOverCapacity(this.prisma, workspaceId, targetMemberId)
        : false;
    return {
      success: true,
      assignmentLocked: locked,
      handedOverCount: handoff.conversations.length,
      overCapacity,
    };
  }

  async handoverMemberOpenConversations(
    workspaceId: string,
    actorId: string,
    memberId: string,
    mode: 'QUEUE' | 'TRANSFER',
    targetMemberId?: string,
  ) {
    await this.assertMemberManager(workspaceId, actorId, memberId);
    if (mode === 'TRANSFER' && (!targetMemberId || targetMemberId === memberId))
      throw new BadRequestException(
        'Chọn một nhân viên khác để nhận bàn giao.',
      );
    const result = await this.prisma.$transaction(async (tx) => {
      await this.lockMemberRows(tx, [
        memberId,
        ...(mode === 'TRANSFER' && targetMemberId ? [targetMemberId] : []),
      ]);
      if (mode === 'TRANSFER') {
        const target = await tx.workspaceMember.findFirst({
          where: {
            id: targetMemberId,
            workspaceId,
            status: WorkspaceMemberStatus.ACTIVE,
            isActive: true,
            assignmentLocked: false,
            user: { status: UserStatus.ACTIVE },
          },
          select: { id: true },
        });
        if (!target)
          throw new BadRequestException(
            'Người nhận bàn giao không hoạt động hoặc đang bị khóa nhận lead.',
          );
        await this.markCurrentShiftUsage(tx, workspaceId, target.id);
      }
      const conversations = await tx.conversation.findMany({
        where: { workspaceId, assignedMemberId: memberId, status: 'OPEN' },
        select: { id: true },
      });
      for (const conversation of conversations) {
        const newAssignee = mode === 'TRANSFER' ? targetMemberId! : null;
        await this.setConversationAssignee(
          tx,
          workspaceId,
          conversation.id,
          newAssignee,
        );
        if (mode === 'QUEUE')
          await this.queueWithinTransaction(
            tx,
            workspaceId,
            conversation.id,
            LeadQueueReason.HANDOVER_REQUIRED,
          );
        else
          await tx.leadQueueEntry.updateMany({
            where: {
              conversationId: conversation.id,
              status: LeadQueueStatus.WAITING,
            },
            data: {
              status: LeadQueueStatus.ASSIGNED,
              assignedAt: new Date(),
              assignedById: actorId,
              resolvedAt: new Date(),
            },
          });
        await this.audit.recordBusinessEvent(tx, {
          action: AuditAction.LEAD_HANDED_OVER,
          workspaceId,
          actorId,
          metadata: {
            conversationId: conversation.id,
            previousAssignee: memberId,
            newAssignee,
            reason: 'STAFF_OUTSIDE_SHIFT',
          },
        });
      }
      return {
        conversationIds: conversations.map((item) => item.id),
        count: conversations.length,
      };
    });
    if (mode === 'QUEUE')
      await this.processAndNotifyQueue(workspaceId, result.conversationIds);
    else await this.processWaitingQueue(workspaceId);
    this.realtime?.emit(
      'staff:leads_handed_over',
      { workspaceMemberId: memberId, count: result.count },
      workspaceId,
    );
    const overCapacity =
      mode === 'TRANSFER' && targetMemberId
        ? await this.isOverCapacity(this.prisma, workspaceId, targetMemberId)
        : false;
    return { success: true, handedOverCount: result.count, mode, overCapacity };
  }

  async recordOvertimeConsent(
    workspaceId: string,
    userId: string,
    shiftId: string,
    startsAt: Date,
    endsAt: Date,
  ) {
    if (
      !(startsAt instanceof Date) ||
      !(endsAt instanceof Date) ||
      !Number.isFinite(startsAt.getTime()) ||
      !Number.isFinite(endsAt.getTime()) ||
      startsAt.getTime() < Date.now() ||
      endsAt <= startsAt
    )
      throw new BadRequestException('Khoảng thời gian ca ngoài không hợp lệ.');
    const assignment = await this.prisma.workShiftMember.findFirst({
      where: {
        shiftId,
        shift: { workspaceId },
        workspaceMember: {
          userId,
          status: WorkspaceMemberStatus.ACTIVE,
          isActive: true,
        },
      },
      include: { workspaceMember: true },
    });
    if (!assignment)
      throw new NotFoundException('Không tìm thấy phân ca của nhân viên.');
    const exception = await this.prisma.$transaction(async (tx) => {
      const item = await tx.staffAvailabilityException.create({
        data: {
          workspaceId,
          workspaceMemberId: assignment.workspaceMemberId,
          shiftId,
          type: AvailabilityExceptionType.OVERTIME_CONSENT,
          startsAt,
          endsAt,
          status: AvailabilityExceptionStatus.ACTIVE,
          requestedById: userId,
          approvedById: userId,
          consentAt: new Date(),
        },
      });
      await this.audit.recordBusinessEvent(tx, {
        action: AuditAction.OVERTIME_CONSENT_RECORDED,
        workspaceId,
        actorId: userId,
        metadata: {
          exceptionId: item.id,
          workspaceMemberId: assignment.workspaceMemberId,
          shiftId,
          startsAt,
          endsAt,
          consentAt: item.consentAt,
        },
      });
      return item;
    });
    await this.processWaitingQueue(workspaceId);
    return exception;
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

  private async notifyQueue(
    workspaceId: string,
    conversationId: string,
    level: number,
  ) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    });
    if (!workspace) return;
    const now = new Date();
    const managerRows = await this.prisma.workShiftMember.findMany({
      where: {
        isShiftManager: true,
        shift: { workspaceId, isActive: true },
        workspaceMember: {
          status: WorkspaceMemberStatus.ACTIVE,
          isActive: true,
          user: { status: UserStatus.ACTIVE },
        },
      },
      include: { shift: true, workspaceMember: { select: { userId: true } } },
    });
    const managerIds = managerRows
      .filter((row) => this.shiftIsActive(row.shift, now))
      .map((row) => row.workspaceMember.userId);
    const recipients = [...new Set([workspace.ownerId, ...managerIds])];
    const queue = await this.prisma.leadQueueEntry.findUnique({
      where: { conversationId },
      select: { priority: true },
    });
    const urgent = (queue?.priority ?? 0) >= 2;
    const labels = urgent
      ? [
          'Khẩn cấp · mới vào hàng chờ',
          'Khẩn cấp · chờ 2 phút',
          'Khẩn cấp · chờ 5 phút',
          'Khẩn cấp · quá SLA 10 phút',
        ]
      : ['Mới vào hàng chờ', 'Chờ 5 phút', 'Chờ 15 phút', 'Quá SLA 30 phút'];
    await Promise.all(
      recipients.map((userId) =>
        this.notifications
          .create({
            workspaceId,
            userId,
            type: NotificationType.CONVERSATION_ALERT,
            severity:
              level >= 3
                ? NotificationSeverity.WARNING
                : NotificationSeverity.INFO,
            title: `Lead chưa được nhận: ${labels[level] ?? labels[3]}`,
            content:
              'Có hội thoại đang chờ phân công. Mở hàng chờ để nhận hoặc chuyển cho tư vấn viên.',
            actionUrl: `/inbox?conversationId=${encodeURIComponent(conversationId)}`,
            metadata: { conversationId, queueLevel: level },
          })
          .catch((error) =>
            this.logger.warn(
              `Could not notify lead queue: ${(error as Error).message}`,
            ),
          ),
      ),
    );
  }

  private async processWaitingQueue(workspaceId: string) {
    const waiting = await this.prisma.leadQueueEntry.findMany({
      where: { workspaceId, status: LeadQueueStatus.WAITING },
      orderBy: [{ priority: 'desc' }, { queuedAt: 'asc' }],
      take: 100,
      select: { conversationId: true },
    });
    for (const entry of waiting) {
      try {
        const result = await this.routeNewConversation(
          entry.conversationId,
          workspaceId,
        );
        if (result.status === 'QUEUED') break;
      } catch (error) {
        this.logger.warn(
          `Could not retry queued conversation ${entry.conversationId}: ${(error as Error).message}`,
        );
      }
    }
  }

  private async processAndNotifyQueue(
    workspaceId: string,
    conversationIds: string[],
  ) {
    if (!conversationIds.length) return;
    await this.processWaitingQueue(workspaceId);
    for (const conversationId of conversationIds) {
      const entry = await this.prisma.leadQueueEntry.findUnique({
        where: { conversationId },
        select: { status: true, escalationLevel: true },
      });
      if (entry?.status === LeadQueueStatus.WAITING)
        await this.notifyQueue(
          workspaceId,
          conversationId,
          entry.escalationLevel,
        );
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

  private async queueWithinTransaction(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    conversationId: string,
    reason: LeadQueueReason,
  ) {
    const previous = await tx.leadQueueEntry.findUnique({
      where: { conversationId },
    });
    const conversation = await tx.conversation.findFirst({
      where: { id: conversationId, workspaceId },
      select: { tags: true, customer: { select: { leadStatus: true } } },
    });
    const urgentTags = new Set(['HOT', 'URGENT', 'KHAN', 'KHẨN', 'LEAD_HOT']);
    const tags = (conversation?.tags ?? []).map((tag) =>
      tag.trim().toLocaleUpperCase('vi-VN'),
    );
    const priority = tags.some((tag) => urgentTags.has(tag))
      ? 2
      : conversation?.customer?.leadStatus === 'QUALIFIED'
        ? 1
        : 0;
    if (previous?.status === LeadQueueStatus.WAITING) {
      if (priority > previous.priority)
        await tx.leadQueueEntry.update({
          where: { id: previous.id },
          data: { priority },
        });
      return { entry: previous, created: false };
    }
    const entry = await tx.leadQueueEntry.upsert({
      where: { conversationId },
      create: { workspaceId, conversationId, reason, priority },
      update: {
        workspaceId,
        reason,
        priority,
        status: LeadQueueStatus.WAITING,
        queuedAt: new Date(),
        escalationLevel: 0,
        lastEscalatedAt: null,
        resolvedAt: null,
      },
    });
    await this.audit.recordBusinessEvent(tx, {
      action: AuditAction.LEAD_QUEUED,
      workspaceId,
      actorId: null,
      metadata: {
        conversationId,
        queueEntryId: entry.id,
        reason,
        previousStatus: previous?.status ?? null,
      },
    });
    return { entry, created: true };
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

  private hasWorkspaceManagementPermission(
    workspaceId: string,
    userId: string,
  ) {
    return this.prisma.workspace
      .findFirst({
        where: {
          id: workspaceId,
          OR: [
            { ownerId: userId },
            {
              members: {
                some: {
                  userId,
                  isActive: true,
                  status: WorkspaceMemberStatus.ACTIVE,
                  OR: [{ role: 'OWNER' }, { isWorkspaceManager: true }],
                },
              },
            },
          ],
        },
        select: { id: true },
      })
      .then(Boolean);
  }
}
