import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuditAction, LeadQueueReason, LeadQueueStatus, UserStatus, WorkspaceMemberStatus } from '@prisma/client';
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
 * Xử lý bàn giao toàn bộ lead và thu hồi quyền nhận lead khi một nhân viên rời workspace (offboard)
 */
export async function executeMemberOffboard(
  prisma: PrismaService,
  audit: AuditService,
  support: LeadRoutingSupportService,
  shiftService: ShiftManagementService,
  queueService: LeadQueueService,
  realtime: RealtimeService | undefined,
  workspaceId: string,
  actorId: string,
  memberId: string,
  mode: HandoverMode,
  targetMemberId?: string,
) {
  if (!(await support.hasWorkspaceManagementPermission(workspaceId, actorId))) {
    throw new ForbiddenException(
      'Chỉ Owner hoặc Quản lý workspace mới được hoàn tất bàn giao nhân viên.',
    );
  }
  const member = await prisma.workspaceMember.findFirst({
    where: { id: memberId, workspaceId },
    include: { workspace: { select: { ownerId: true } } },
  });
  if (!member) {
    throw new NotFoundException('Không tìm thấy thành viên cần bàn giao.');
  }

  const isActorOwner = await support.isWorkspaceOwner(workspaceId, actorId);
  const isTargetOwner =
    member.role === WorkspaceRole.OWNER ||
    member.workspace.ownerId === member.userId;

  if (
    !isActorOwner &&
    (isTargetOwner ||
      member.isWorkspaceManager ||
      member.role === WorkspaceRole.MANAGER)
  ) {
    throw new ForbiddenException(
      'Quản lý workspace không thể bàn giao hoặc gỡ Owner/Quản lý workspace khác.',
    );
  }

  if (mode === HandoverMode.TRANSFER) {
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
      ...(mode === HandoverMode.TRANSFER && targetMemberId
        ? [targetMemberId]
        : []),
    ]);
    if (mode === HandoverMode.TRANSFER) {
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

    await tx.workspaceMember.update({
      where: { id: memberId },
      data: { assignmentLocked: true },
    });
    await tx.workShiftMember.deleteMany({
      where: { workspaceMemberId: memberId },
    });

    const openConversations = await tx.conversation.findMany({
      where: {
        workspaceId,
        assignedMemberId: memberId,
        status: ConversationStatus.OPEN,
      },
      select: { id: true },
    });

    for (const conversation of openConversations) {
      const previousAssignee = memberId;
      const newAssignee =
        mode === HandoverMode.TRANSFER ? targetMemberId! : null;
      await setConversationAssignee(
        tx,
        workspaceId,
        conversation.id,
        newAssignee,
      );
      if (mode === HandoverMode.QUEUE) {
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
          previousAssignee,
          newAssignee,
          reason: HandoverReasonCode.STAFF_OFFBOARDING,
          mode,
        },
      });
    }

    return {
      conversationIds: openConversations.map((item) => item.id),
      handedOverCount: openConversations.length,
    };
  });

  if (mode === HandoverMode.QUEUE) {
    await queueService.processAndNotifyQueue(workspaceId, handoff.conversationIds);
  } else {
    await queueService.processWaitingQueue(workspaceId);
  }

  realtime?.emit(
    'staff:offboarded',
    { workspaceMemberId: memberId },
    workspaceId,
  );
  const overCapacity =
    mode === HandoverMode.TRANSFER && targetMemberId
      ? await support.isOverCapacity(prisma, workspaceId, targetMemberId)
      : false;

  return {
    success: true,
    handedOverCount: handoff.handedOverCount,
    mode,
    overCapacity,
  };
}
