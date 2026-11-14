import { BadRequestException } from '@nestjs/common';
import { AuditAction, LeadQueueReason, LeadQueueStatus, UserStatus, WorkspaceMemberStatus } from '@prisma/client';
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
 * Bàn giao hàng loạt tất cả các hội thoại đang mở của một nhân viên (khi hết ca hoặc bàn giao ca)
 */
export async function executeBatchHandover(
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
  await support.assertMemberManager(workspaceId, actorId, memberId);
  if (
    mode === HandoverMode.TRANSFER &&
    (!targetMemberId || targetMemberId === memberId)
  ) {
    throw new BadRequestException('Chọn một nhân viên khác để nhận bàn giao.');
  }

  const result = await prisma.$transaction(async (tx) => {
    await lockMemberRows(tx, [
      memberId,
      ...(mode === HandoverMode.TRANSFER && targetMemberId ? [targetMemberId] : []),
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

    const conversations = await tx.conversation.findMany({
      where: {
        workspaceId,
        assignedMemberId: memberId,
        status: ConversationStatus.OPEN,
      },
      select: { id: true },
    });

    for (const conversation of conversations) {
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
          previousAssignee: memberId,
          newAssignee,
          reason: HandoverReasonCode.STAFF_OUTSIDE_SHIFT,
        },
      });
    }
    return {
      conversationIds: conversations.map((item) => item.id),
      count: conversations.length,
    };
  });

  if (mode === HandoverMode.QUEUE) {
    await queueService.processAndNotifyQueue(workspaceId, result.conversationIds);
  } else {
    await queueService.processWaitingQueue(workspaceId);
  }

  realtime?.emit(
    'staff:leads_handed_over',
    { workspaceMemberId: memberId, count: result.count },
    workspaceId,
  );
  const overCapacity =
    mode === HandoverMode.TRANSFER && targetMemberId
      ? await support.isOverCapacity(prisma, workspaceId, targetMemberId)
      : false;

  return { success: true, handedOverCount: result.count, mode, overCapacity };
}
