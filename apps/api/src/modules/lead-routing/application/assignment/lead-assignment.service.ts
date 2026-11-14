import { Inject, Injectable, Logger, Optional, forwardRef } from '@nestjs/common';
import { AuditAction, LeadQueueReason, LeadQueueStatus, Prisma } from '@prisma/client';
import { ConversationStatus, LeadRoutingStatus, RoutingAuditSource } from '../constants/routing-status.constants.js';
import { PrismaService } from '../../../../platform/database/prisma.service.js';
import { AuditService } from '../../../audit/audit.service.js';
import { RealtimeService } from '../../../realtime/realtime.service.js';
import { LeadQueueService } from '../queue/lead-queue.service.js';
import { ShiftManagementService } from '../shifts/shift-management.service.js';
import { LeadRoutingSupportService } from '../support/lead-routing-support.service.js';
import { setConversationAssignee } from '../support/conversation-assignee.js';
import { lockMemberRow } from '../support/row-locking.js';

/**
 * Service điều phối và phân bổ hội thoại/lead mới vào ca trực phù hợp nhất
 */
@Injectable()
export class LeadAssignmentService {
  private readonly logger = new Logger(LeadAssignmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly support: LeadRoutingSupportService,
    @Inject(forwardRef(() => ShiftManagementService))
    private readonly shiftService: any,
    @Inject(forwardRef(() => LeadQueueService))
    private readonly queueService: any,
    @Optional() private readonly realtime?: RealtimeService,
  ) {}

  /**
   * Định tuyến hội thoại mới đến nhân viên trực phù hợp nhất theo thuật toán tải cân bằng (load balancing)
   * Nếu không có nhân viên trực/hết hạn mức, hội thoại được đẩy vào hàng chờ (Queue)
   */
  async routeNewConversation(conversationId: string, workspaceId: string) {
    const configuredShiftCount = await this.prisma.workShift.count({
      where: { workspaceId },
    });
    if (configuredShiftCount === 0) return { status: LeadRoutingStatus.LEGACY };

    const result = await this.prisma.$transaction(
      async (tx) => {
        const conversation = await tx.conversation.findFirst({
          where: { id: conversationId, workspaceId },
        });
        if (
          !conversation ||
          conversation.status !== ConversationStatus.OPEN ||
          conversation.assignedMemberId
        ) {
          return { status: LeadRoutingStatus.SKIPPED };
        }

        const now = new Date();
        const candidates = await this.support.getCandidates(tx, workspaceId, now);
        const counts = await this.support.getOpenCounts(
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
            this.support.shiftIsActive(shift, now),
          )
            ? LeadQueueReason.NO_CAPACITY
            : LeadQueueReason.NO_ACTIVE_SHIFT;
          const queued = await this.queueService.queueWithinTransaction(
            tx,
            workspaceId,
            conversationId,
            reason,
          );
          return { status: LeadRoutingStatus.QUEUED, reason, created: queued.created };
        }

        await lockMemberRow(tx, candidate.workspaceMemberId);
        const refreshedCandidate = (
          await this.support.getCandidates(tx, workspaceId, now)
        ).find((row) => row.workspaceMemberId === candidate.workspaceMemberId);
        const recheckedCounts = await this.support.getOpenCounts(tx, workspaceId, [
          candidate.workspaceMemberId,
        ]);
        if (
          !refreshedCandidate ||
          (recheckedCounts.get(candidate.workspaceMemberId) ?? 0) >=
          refreshedCandidate.capacity
        ) {
          const queued = await this.queueService.queueWithinTransaction(
            tx,
            workspaceId,
            conversationId,
            LeadQueueReason.NO_CAPACITY,
          );
          return {
            status: LeadRoutingStatus.QUEUED,
            reason: LeadQueueReason.NO_CAPACITY,
            created: queued.created,
          };
        }

        const current = await tx.conversation.findFirst({
          where: {
            id: conversationId,
            workspaceId,
            assignedMemberId: null,
            status: ConversationStatus.OPEN,
          },
        });
        if (!current) return { status: LeadRoutingStatus.SKIPPED };

        await setConversationAssignee(
          tx,
          workspaceId,
          conversationId,
          candidate.workspaceMemberId,
        );

        await this.shiftService.markShiftMemberIdsUsed(
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
        if (chosenShiftMember) {
          await tx.workShiftMember.update({
            where: { id: chosenShiftMember.id },
            data: { lastAssignedAt: now },
          });
        }

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
            source: RoutingAuditSource.SHIFT_ROUTING,
          },
        });

        return {
          status: LeadRoutingStatus.ASSIGNED,
          assignedMemberId: candidate.workspaceMemberId,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (result.status === LeadRoutingStatus.ASSIGNED) {
      this.realtime?.emit(
        'conversation:assigned',
        { conversationId, assignedMemberId: result.assignedMemberId },
        workspaceId,
      );
    } else if (result.status === LeadRoutingStatus.QUEUED && result.created) {
      await this.queueService.notifyQueue(workspaceId, conversationId, 0);
    }
    return result;
  }
}

