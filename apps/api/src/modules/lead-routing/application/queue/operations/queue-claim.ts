import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuditAction, LeadQueueStatus, Prisma, WorkspaceMemberStatus } from '@prisma/client';
import { ConversationStatus } from '../../constants/routing-status.constants.js';
import { PrismaService } from '../../../../../platform/database/prisma.service.js';
import { AuditService } from '../../../../audit/audit.service.js';
import { RealtimeService } from '../../../../realtime/realtime.service.js';
import { LeadRoutingSupportService } from '../../support/lead-routing-support.service.js';
import { lockMemberRow } from '../../support/row-locking.js';
import { setConversationAssignee } from '../../support/conversation-assignee.js';

export interface ClaimQueueEntryResult {
  success: boolean;
  conversationId: string;
  assignedMemberId: string;
}

/**
 * Xử lý khi nhân viên chủ động nhận (claim) một lead đang đợi trong hàng chờ.
 * Luôn trả về đối tượng ClaimQueueEntryResult, không bao giờ trả về undefined.
 */
export async function executeClaimQueueEntry(
  prisma: PrismaService,
  audit: AuditService,
  support: LeadRoutingSupportService,
  workspaceId: string,
  actorId: string,
  conversationId: string,
  realtime?: RealtimeService,
): Promise<ClaimQueueEntryResult> {
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId: actorId,
      status: WorkspaceMemberStatus.ACTIVE,
      isActive: true,
    },
  });
  if (!membership) {
    throw new ForbiddenException('Bạn không thuộc workspace này.');
  }

  const result = await prisma.$transaction(
    async (tx) => {
      await lockMemberRow(tx, membership.id);
      const entry = await tx.leadQueueEntry.findFirst({
        where: {
          workspaceId,
          conversationId,
          status: LeadQueueStatus.WAITING,
        },
      });
      if (!entry) {
        throw new NotFoundException('Lead không còn trong hàng chờ.');
      }

      const candidates = await support.getCandidates(
        tx,
        workspaceId,
        new Date(),
      );
      const candidate = candidates.find(
        (item) => item.workspaceMemberId === membership.id,
      );
      if (!candidate) {
        throw new ConflictException(
          'Bạn hiện không trong ca hoặc đang không đủ điều kiện nhận lead.',
        );
      }

      const counts = await support.getOpenCounts(tx, workspaceId, [
        membership.id,
      ]);
      if ((counts.get(membership.id) ?? 0) >= candidate.capacity) {
        throw new ConflictException('Bạn đã đạt hạn mức hội thoại mở.');
      }

      const current = await tx.conversation.findFirst({
        where: {
          id: conversationId,
          workspaceId,
          assignedMemberId: null,
          status: ConversationStatus.OPEN,
        },
        select: { id: true },
      });
      if (!current) {
        throw new ConflictException(
          'Hội thoại đã thay đổi hoặc không còn mở.',
        );
      }

      await setConversationAssignee(
        tx,
        workspaceId,
        conversationId,
        membership.id,
      );

      await support.markShiftMemberIdsUsed(
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
      if (!updated.count) {
        throw new ConflictException('Lead vừa được người khác nhận.');
      }

      await audit.recordBusinessEvent(tx, {
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

  if (!result) {
    throw new ConflictException('Không thể hoàn tất thao tác nhận lead từ hàng chờ.');
  }

  realtime?.emit('conversation:assigned', result, workspaceId);
  return result;
}
