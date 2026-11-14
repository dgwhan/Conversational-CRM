import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuditAction, AvailabilityExceptionStatus, AvailabilityExceptionType, LeadQueueReason, LeadQueueStatus, UserStatus, WorkspaceMemberStatus } from '@prisma/client';
import { ConversationStatus, HandoverMode, HandoverReasonCode, WorkspaceRole } from '../../constants/routing-status.constants.js';
import { PrismaService } from '../../../../../platform/database/prisma.service.js';
import { AuditService } from '../../../../audit/audit.service.js';
import { RealtimeService } from '../../../../realtime/realtime.service.js';
import { LeadQueueService } from '../../queue/lead-queue.service.js';
import { ShiftManagementService } from '../../shifts/shift-management.service.js';
import { LeadRoutingSupportService } from '../../support/lead-routing-support.service.js';
import { lockMemberRows } from '../../support/row-locking.js';
import { setConversationAssignee } from '../../support/conversation-assignee.js';

/**
 * Khóa hoặc mở khóa nhận lead mới của nhân viên; xử lý bàn giao hội thoại mở khi bị khóa
 */
export async function executeSetAssignmentLock(
  prisma: PrismaService,
  audit: AuditService,
  support: LeadRoutingSupportService,
  shiftService: ShiftManagementService,
  queueService: LeadQueueService,
  realtime: RealtimeService | undefined,
  workspaceId: string,
  actorId: string,
  memberId: string,
  locked: boolean,
  handoverMode: HandoverMode = HandoverMode.QUEUE,
  targetMemberId?: string,
) {
  if (!(await support.hasWorkspaceManagementPermission(workspaceId, actorId))) {
    await support.assertMemberManager(workspaceId, actorId, memberId);
  }

  const member = await prisma.workspaceMember.findFirst({
    where: { id: memberId, workspaceId },
    include: { workspace: { select: { ownerId: true } } },
  });
  if (!member) {
    throw new NotFoundException('Không tìm thấy thành viên trong workspace.');
  }

  // Owner cannot be locked by a non-owner Manager
  const isActorOwner = await support.isWorkspaceOwner(workspaceId, actorId);
  const isTargetOwner =
    member.role === WorkspaceRole.OWNER ||
    member.workspace.ownerId === member.userId;
  if (locked && isTargetOwner && !isActorOwner) {
    throw new ForbiddenException('Không thể khóa nhận lead của Chủ sở hữu (Owner).');
  }

  if (locked && handoverMode === HandoverMode.TRANSFER) {
    if (!targetMemberId || targetMemberId === memberId) {
      throw new BadRequestException('Chọn một nhân viên khác để nhận bàn giao.');
    }
    const target = await prisma.workspaceMember.findFirst({
      where: {
        id: targetMemberId,
        workspaceId,
        status: WorkspaceMemberStatus.ACTIVE,
        isActive: true,
        assignmentLocked: false,
        user: { status: UserStatus.ACTIVE },
      },
    });
    if (!target) {
      throw new BadRequestException(
        'Người nhận bàn giao không hoạt động hoặc đang bị khóa nhận lead.',
      );
    }
  }

  const handoff = await prisma.$transaction(async (tx) => {
    await lockMemberRows(tx, [
      memberId,
      ...(locked && handoverMode === HandoverMode.TRANSFER && targetMemberId
        ? [targetMemberId]
        : []),
    ]);

    if (locked && handoverMode === HandoverMode.TRANSFER) {
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
      if (!target) {
        throw new BadRequestException(
          'Người nhận bàn giao không hoạt động hoặc đang bị khóa nhận lead.',
        );
      }
      await shiftService.markCurrentShiftUsage(tx, workspaceId, target.id);
    }

    const conversations = locked
      ? await tx.conversation.findMany({
          where: {
            workspaceId,
            assignedMemberId: memberId,
            status: ConversationStatus.OPEN,
          },
          select: { id: true },
        })
      : [];

    await tx.workspaceMember.update({
      where: { id: memberId },
      data: { assignmentLocked: locked },
    });

    for (const conversation of conversations) {
      const newAssignee =
        handoverMode === HandoverMode.TRANSFER ? targetMemberId! : null;
      await setConversationAssignee(
        tx,
        workspaceId,
        conversation.id,
        newAssignee,
      );
      if (handoverMode === HandoverMode.QUEUE) {
        await queueService.queueWithinTransaction(
          tx,
          workspaceId,
          conversation.id,
          LeadQueueReason.HANDOVER_REQUIRED,
        );
      } else {
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
      }
      await audit.recordBusinessEvent(tx, {
        action: AuditAction.LEAD_HANDED_OVER,
        workspaceId,
        actorId,
        metadata: {
          conversationId: conversation.id,
          previousAssignee: memberId,
          newAssignee,
          reason: HandoverReasonCode.STAFF_ASSIGNMENT_LOCKED,
        },
      });
    }

    await audit.recordBusinessEvent(tx, {
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

  realtime?.emit(
    'staff:availability_updated',
    { workspaceMemberId: memberId },
    workspaceId,
  );

  if (locked && handoverMode === HandoverMode.QUEUE) {
    await queueService.processAndNotifyQueue(
      workspaceId,
      handoff.conversations.map((item) => item.id),
    );
  } else {
    await queueService.processWaitingQueue(workspaceId);
  }

  const overCapacity =
    locked && handoverMode === HandoverMode.TRANSFER && targetMemberId
      ? await support.isOverCapacity(prisma, workspaceId, targetMemberId)
      : false;

  return {
    success: true,
    assignmentLocked: locked,
    handedOverCount: handoff.conversations.length,
    overCapacity,
  };
}

export async function executeRecordOvertimeConsent(
  prisma: PrismaService,
  audit: AuditService,
  queueService: LeadQueueService,
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
  ) {
    throw new BadRequestException('Khoảng thời gian ca ngoài không hợp lệ.');
  }

  const assignment = await prisma.workShiftMember.findFirst({
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
  if (!assignment) {
    throw new NotFoundException('Không tìm thấy phân ca của nhân viên.');
  }

  const exception = await prisma.$transaction(async (tx) => {
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
    await audit.recordBusinessEvent(tx, {
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

  await queueService.processWaitingQueue(workspaceId);
  return exception;
}
