import { forwardRef, Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { AuditAction, LeadQueueReason, LeadQueueStatus, NotificationSeverity, NotificationType, Prisma, UserStatus, WorkspaceMemberStatus } from "@prisma/client";
import { PrismaService } from "../../../../platform/database/prisma.service.js";
import { AuditService } from "../../../audit/audit.service.js";
import { NotificationService } from "../../../notification/notification.service.js";
import { RealtimeService } from "../../../realtime/realtime.service.js";
import { LeadRoutingStatus } from "../constants/lead-routing.constants.js";
import { LeadRoutingService } from "./lead-routing.service.js";
import { LeadRoutingSupportService } from "./lead-routing-support.service.js";

@Injectable()
export class LeadQueueService {
    private readonly logger = new Logger(LeadQueueService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditService,
        private readonly notifications: NotificationService,
        private readonly support: LeadRoutingSupportService,
        @Inject(forwardRef(() => LeadRoutingService))
        private readonly routing: LeadRoutingService,
        @Optional() private readonly realtime?: RealtimeService,
      ) { }
    
    
      async listQueue(workspaceId: string, actorId: string) {
        await this.support.assertQueueAccess(workspaceId, actorId);
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
            await this.support.lockMemberRow(tx, membership.id);
            const entry = await tx.leadQueueEntry.findFirst({
              where: {
                workspaceId,
                conversationId,
                status: LeadQueueStatus.WAITING,
              },
            });
            if (!entry)
              throw new NotFoundException('Lead không còn trong hàng chờ.');
            const candidates = await this.support.getCandidates(
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
            const counts = await this.support.getOpenCounts(tx, workspaceId, [
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
            await this.support.setConversationAssignee(
              tx,
              workspaceId,
              conversationId,
              membership.id,
            );
            await this.support.markShiftMemberIdsUsed(
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

      async notifyQueue(
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
            .filter((row) => this.support.shiftIsActive(row.shift, now))
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
      
        async processWaitingQueue(workspaceId: string) {
          const waiting = await this.prisma.leadQueueEntry.findMany({
            where: { workspaceId, status: LeadQueueStatus.WAITING },
            orderBy: [{ priority: 'desc' }, { queuedAt: 'asc' }],
            take: 100,
            select: { conversationId: true },
          });
          for (const entry of waiting) {
            try {
              const result = await this.routing.routeNewConversation(
                entry.conversationId,
                workspaceId,
              );
              if (result.status === LeadRoutingStatus.QUEUED) break;
            } catch (error) {
              this.logger.warn(
                `Could not retry queued conversation ${entry.conversationId}: ${(error as Error).message}`,
              );
            }
          }
        }
      
        async processAndNotifyQueue(
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



        async queueWithinTransaction(
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


}