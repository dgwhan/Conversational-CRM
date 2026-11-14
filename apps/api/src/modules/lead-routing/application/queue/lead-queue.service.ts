import { Inject, Injectable, Logger, Optional, forwardRef } from '@nestjs/common';
import { LeadQueueReason, LeadQueueStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../platform/database/prisma.service.js';
import { AuditService } from '../../../audit/audit.service.js';
import { NotificationService } from '../../../notification/notification.service.js';
import { RealtimeService } from '../../../realtime/realtime.service.js';
import { LeadAssignmentService } from '../assignment/lead-assignment.service.js';
import { LeadRoutingSupportService } from '../support/lead-routing-support.service.js';
import { executeClaimQueueEntry } from './operations/queue-claim.js';
import { executeEscalateWaitingLeads, notifyQueueRecipients } from './operations/queue-escalation.js';
import { executeProcessAndNotifyQueue, executeProcessWaitingQueue, executeQueueWithinTransaction } from './operations/queue-processing.js';

/**
 * Service quản lý hàng chờ lead (Lead Queue): Đưa lead vào hàng chờ, nhận lead (claim),
 * tự động thử lại khi có nhân viên rảnh và xử lý leo thang hàng chờ (escalation).
 */
@Injectable()
export class LeadQueueService {
  private readonly logger = new Logger(LeadQueueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService,
    private readonly support: LeadRoutingSupportService,
    @Inject(forwardRef(() => LeadAssignmentService))
    private readonly assignmentService: any,
    @Optional() private readonly realtime?: RealtimeService,
  ) {}

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
    return executeClaimQueueEntry(
      this.prisma,
      this.audit,
      this.support,
      workspaceId,
      actorId,
      conversationId,
      this.realtime,
    );
  }

  async processWaitingQueue(workspaceId: string): Promise<void> {
    return executeProcessWaitingQueue(
      this.prisma,
      this.assignmentService,
      this.logger,
      workspaceId,
    );
  }

  async processAndNotifyQueue(
    workspaceId: string,
    conversationIds: string[],
  ): Promise<void> {
    return executeProcessAndNotifyQueue(
      this.prisma,
      (wsId) => this.processWaitingQueue(wsId),
      (wsId, cId, lvl) => this.notifyQueue(wsId, cId, lvl),
      workspaceId,
      conversationIds,
    );
  }

  async queueWithinTransaction(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    conversationId: string,
    reason: LeadQueueReason,
    customPriority?: number,
  ) {
    return executeQueueWithinTransaction(
      tx,
      this.audit,
      workspaceId,
      conversationId,
      reason,
      customPriority,
    );
  }

  async notifyQueue(
    workspaceId: string,
    conversationId: string,
    level: number,
  ): Promise<void> {
    return notifyQueueRecipients(
      this.prisma,
      this.notifications,
      this.support,
      this.logger,
      workspaceId,
      conversationId,
      level,
    );
  }

  async escalateWaitingLeads(): Promise<void> {
    return executeEscalateWaitingLeads(
      this.prisma,
      this.audit,
      this.logger,
      (wsId) => this.processWaitingQueue(wsId),
      (wsId, cId, lvl) => this.notifyQueue(wsId, cId, lvl),
    );
  }
}
