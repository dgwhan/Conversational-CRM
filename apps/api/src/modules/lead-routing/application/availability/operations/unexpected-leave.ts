import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AuditAction, AvailabilityExceptionStatus, AvailabilityExceptionType, LeadQueueReason, LeadQueueStatus, UserStatus, WorkspaceMemberStatus } from '@prisma/client';
import { ConversationStatus, HandoverMode, HandoverReasonCode } from '../../constants/routing-status.constants.js';
import { PrismaService } from '../../../../../platform/database/prisma.service.js';
import { AuditService } from '../../../../audit/audit.service.js';
import { RealtimeService } from '../../../../realtime/realtime.service.js';
import { LeadQueueService } from '../../queue/lead-queue.service.js';
import { ShiftManagementService } from '../../shifts/shift-management.service.js';
import { LeadRoutingSupportService } from '../../support/lead-routing-support.service.js';
import { lockMemberRows } from '../../support/row-locking.js';
import { setConversationAssignee } from '../../support/conversation-assignee.js';

/**
 * Ghi nhận nhân viên nghỉ đột xuất trong ca, chuyển giao các hội thoại mở theo mode QUEUE hoặc TRANSFER
 */
export async function executeSetUnexpectedLeave(
  prisma: PrismaService,
  audit: AuditService,
  support: LeadRoutingSupportService,
  shiftService: ShiftManagementService,
  queueService: LeadQueueService,
  realtime: RealtimeService | undefined,
  workspaceId: string,
  actorId: string,
  shiftId: string,
  targetMemberId: string,
  mode: HandoverMode,
  assigneeId?: string,
  note?: string,
) {
  await support.assertShiftManager(workspaceId, actorId, shiftId);
  const cleanNote = typeof note === 'string' ? note.trim().slice(0, 500) : '';

  const shiftMember = await prisma.workShiftMember.findFirst({
    where: {
      shiftId,
      workspaceMemberId: targetMemberId,
      shift: { workspaceId },
    },
  });
  if (!shiftMember) {
    throw new NotFoundException('Nhân viên không thuộc ca này.');
  }

  const existingException =
    await prisma.staffAvailabilityException.findFirst({
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
  if (existingException) {
    throw new ConflictException('Nhân viên đã được đánh dấu nghỉ đột xuất.');
  }

  if (mode === HandoverMode.TRANSFER && !assigneeId) {
    throw new BadRequestException('Chọn nhân viên nhận bàn giao.');
  }
  if (mode === HandoverMode.TRANSFER && assigneeId === targetMemberId) {
    throw new BadRequestException('Chọn một nhân viên khác để nhận bàn giao.');
  }

  const result = await prisma.$transaction(async (tx) => {
    await lockMemberRows(tx, [
      targetMemberId,
      ...(mode === HandoverMode.TRANSFER && assigneeId ? [assigneeId] : []),
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
    if (activeLeave) {
      throw new ConflictException('Nhân viên đã được đánh dấu nghỉ đột xuất.');
    }

    const affected = await tx.conversation.findMany({
      where: {
        workspaceId,
        assignedMemberId: targetMemberId,
        status: ConversationStatus.OPEN,
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
        reasonCode: HandoverReasonCode.UNEXPECTED_LEAVE,
        note: cleanNote || null,
      },
    });

    if (mode === HandoverMode.QUEUE) {
      for (const item of affected) {
        await setConversationAssignee(tx, workspaceId, item.id, null);
        await queueService.queueWithinTransaction(
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
      if (!destination) {
        throw new BadRequestException(
          'Người nhận bàn giao không hoạt động trong workspace.',
        );
      }
      await shiftService.markCurrentShiftUsage(tx, workspaceId, destination.id);
      for (const item of affected) {
        await setConversationAssignee(
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

    await audit.recordBusinessEvent(tx, {
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

  if (mode === HandoverMode.QUEUE) {
    await queueService.processAndNotifyQueue(
      workspaceId,
      result.affected.map((item) => item.id),
    );
  }
  realtime?.emit(
    'staff:availability_updated',
    { workspaceMemberId: targetMemberId },
    workspaceId,
  );

  const overCapacity =
    mode === HandoverMode.TRANSFER && assigneeId
      ? await support.isOverCapacity(prisma, workspaceId, assigneeId)
      : false;

  return {
    exception: result.exception,
    affectedCount: result.affected.length,
    overCapacity,
  };
}

export async function executeEndUnexpectedLeave(
  prisma: PrismaService,
  audit: AuditService,
  support: LeadRoutingSupportService,
  queueService: LeadQueueService,
  realtime: RealtimeService | undefined,
  workspaceId: string,
  actorId: string,
  exceptionId: string,
) {
  const exception = await prisma.staffAvailabilityException.findFirst({
    where: {
      id: exceptionId,
      workspaceId,
      type: AvailabilityExceptionType.UNEXPECTED_LEAVE,
      status: AvailabilityExceptionStatus.ACTIVE,
    },
  });
  if (!exception) {
    throw new NotFoundException('Không tìm thấy trạng thái nghỉ đang hoạt động.');
  }

  await support.assertMemberManager(
    workspaceId,
    actorId,
    exception.workspaceMemberId,
  );

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.staffAvailabilityException.update({
      where: { id: exception.id },
      data: { status: AvailabilityExceptionStatus.ENDED, endsAt: new Date() },
    });
    await audit.recordBusinessEvent(tx, {
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

  realtime?.emit(
    'staff:availability_updated',
    { workspaceMemberId: exception.workspaceMemberId },
    workspaceId,
  );
  await queueService.processWaitingQueue(workspaceId);
  return updated;
}
