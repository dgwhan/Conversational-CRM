import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuditAction, LeadQueueReason, LeadQueueStatus, UserStatus, WorkspaceMemberStatus } from '@prisma/client';
import { PrismaService } from '../../../../../platform/database/prisma.service.js';
import { AuditService } from '../../../../audit/audit.service.js';
import { RealtimeService } from '../../../../realtime/realtime.service.js';
import { LeadQueueService } from '../../queue/lead-queue.service.js';
import { ShiftManagementService } from '../../shifts/shift-management.service.js';
import { LeadRoutingSupportService } from '../../support/lead-routing-support.service.js';
import { setConversationAssignee } from '../../support/conversation-assignee.js';

/**
 * Thực hiện bàn giao một hội thoại đơn lẻ đến nhân viên mục tiêu hoặc đưa về hàng chờ
 */
export async function executeSingleHandover(
  prisma: PrismaService,
  audit: AuditService,
  support: LeadRoutingSupportService,
  shiftService: ShiftManagementService,
  queueService: LeadQueueService,
  realtime: RealtimeService | undefined,
  workspaceId: string,
  actorId: string,
  conversationId: string,
  targetMemberId?: string | null,
) {
  const existingConversation = await prisma.conversation.findFirst({
    where: { id: conversationId, workspaceId },
    select: { assignedMemberId: true },
  });
  if (!existingConversation) {
    throw new NotFoundException('Không tìm thấy hội thoại trong workspace.');
  }

  const workspaceManager = await support.hasWorkspaceManagementPermission(
    workspaceId,
    actorId,
  );
  if (!workspaceManager && existingConversation.assignedMemberId) {
    await support.assertMemberManager(
      workspaceId,
      actorId,
      existingConversation.assignedMemberId,
    );
  } else if (!workspaceManager) {
    const shiftManager = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: actorId,
        status: WorkspaceMemberStatus.ACTIVE,
        isActive: true,
        shiftAssignments: { some: { isShiftManager: true } },
      },
      select: { id: true },
    });
    if (!shiftManager) {
      throw new ForbiddenException(
        'Chỉ Owner, Quản lý workspace hoặc ca trưởng mới được bàn giao lead.',
      );
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.findFirst({
      where: { id: conversationId, workspaceId },
    });
    if (!conversation) {
      throw new NotFoundException('Không tìm thấy hội thoại trong workspace.');
    }

    if (!targetMemberId) {
      await setConversationAssignee(
        tx,
        workspaceId,
        conversationId,
        null,
      );
      const entry = await queueService.queueWithinTransaction(
        tx,
        workspaceId,
        conversationId,
        LeadQueueReason.HANDOVER_REQUIRED,
      );
      await audit.recordBusinessEvent(tx, {
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
    if (!target) {
      throw new BadRequestException(
        'Người nhận không hoạt động trong workspace.',
      );
    }

    await setConversationAssignee(
      tx,
      workspaceId,
      conversationId,
      targetMemberId,
    );
    await shiftService.markCurrentShiftUsage(tx, workspaceId, targetMemberId);

    await tx.leadQueueEntry.updateMany({
      where: { conversationId, status: LeadQueueStatus.WAITING },
      data: {
        status: LeadQueueStatus.ASSIGNED,
        assignedAt: new Date(),
        assignedById: actorId,
        resolvedAt: new Date(),
      },
    });

    const overCapacity = await support.isOverCapacity(
      tx,
      workspaceId,
      targetMemberId,
    );
    await audit.recordBusinessEvent(tx, {
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

  if (result.queued) {
    await queueService.processAndNotifyQueue(workspaceId, [conversationId]);
  }
  realtime?.emit(
    'conversation:assigned',
    { conversationId, ...result },
    workspaceId,
  );
  return result;
}
