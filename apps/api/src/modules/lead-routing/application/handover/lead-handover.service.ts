import { Inject, Injectable, Logger, Optional, forwardRef } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../platform/database/prisma.service.js';
import { AuditService } from '../../../audit/audit.service.js';
import { RealtimeService } from '../../../realtime/realtime.service.js';
import { LeadQueueService } from '../queue/lead-queue.service.js';
import { ShiftManagementService } from '../shifts/shift-management.service.js';
import { LeadRoutingSupportService } from '../support/lead-routing-support.service.js';
import { setConversationAssignee } from '../support/conversation-assignee.js';
import { HandoverMode } from '../constants/routing-status.constants.js';
import { executeSingleHandover } from './operations/handover-single.js';
import { executeBatchHandover } from './operations/handover-batch.js';
import { executeMemberOffboard } from './operations/member-offboard.js';

/**
 * Service xử lý các thao tác bàn giao hội thoại/lead (đơn lẻ, hàng loạt, hoặc khi offboard nhân sự)
 */
@Injectable()
export class LeadHandoverService {
  private readonly logger = new Logger(LeadHandoverService.name);

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

  async handover(
    workspaceId: string,
    actorId: string,
    conversationId: string,
    targetMemberId?: string | null,
  ) {
    return executeSingleHandover(
      this.prisma,
      this.audit,
      this.support,
      this.shiftService,
      this.queueService,
      this.realtime,
      workspaceId,
      actorId,
      conversationId,
      targetMemberId,
    );
  }

  async offboardMember(
    workspaceId: string,
    actorId: string,
    memberId: string,
    mode: HandoverMode,
    targetMemberId?: string,
  ) {
    return executeMemberOffboard(
      this.prisma,
      this.audit,
      this.support,
      this.shiftService,
      this.queueService,
      this.realtime,
      workspaceId,
      actorId,
      memberId,
      mode,
      targetMemberId,
    );
  }

  async handoverMemberOpenConversations(
    workspaceId: string,
    actorId: string,
    memberId: string,
    mode: HandoverMode,
    targetMemberId?: string,
  ) {
    return executeBatchHandover(
      this.prisma,
      this.audit,
      this.support,
      this.shiftService,
      this.queueService,
      this.realtime,
      workspaceId,
      actorId,
      memberId,
      mode,
      targetMemberId,
    );
  }

  async setConversationAssignee(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    conversationId: string,
    workspaceMemberId: string | null,
  ) {
    return setConversationAssignee(
      tx,
      workspaceId,
      conversationId,
      workspaceMemberId,
    );
  }
}
