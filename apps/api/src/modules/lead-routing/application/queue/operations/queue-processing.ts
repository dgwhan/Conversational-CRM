import { Logger } from '@nestjs/common';
import { AuditAction, LeadQueueReason, LeadQueueStatus, Prisma } from '@prisma/client';
import { LeadRoutingStatus } from '../../constants/routing-status.constants.js';
import { PrismaService } from '../../../../../platform/database/prisma.service.js';
import { AuditService } from '../../../../audit/audit.service.js';
import type { LeadAssignmentService } from '../../assignment/lead-assignment.service.js';

/**
 * Xử lý tái định tuyến cho các lead đang chờ (waiting) trong hàng chờ khi có nhân viên rảnh
 */
export async function executeProcessWaitingQueue(
  prisma: PrismaService,
  assignmentService: LeadAssignmentService,
  logger: Logger,
  workspaceId: string,
): Promise<void> {
  const waiting = await prisma.leadQueueEntry.findMany({
    where: { workspaceId, status: LeadQueueStatus.WAITING },
    orderBy: [{ priority: 'desc' }, { queuedAt: 'asc' }],
    take: 100,
    select: { conversationId: true },
  });

  for (const entry of waiting) {
    try {
      const result = await assignmentService.routeNewConversation(
        entry.conversationId,
        workspaceId,
      );
      if (result.status === LeadRoutingStatus.QUEUED) break;
    } catch (error) {
      logger.warn(
        `Could not retry queued conversation ${entry.conversationId}: ${(error as Error).message}`,
      );
    }
  }
}

export async function executeProcessAndNotifyQueue(
  prisma: PrismaService,
  processWaitingQueueFn: (workspaceId: string) => Promise<void>,
  notifyQueueFn: (workspaceId: string, conversationId: string, level: number) => Promise<void>,
  workspaceId: string,
  conversationIds: string[],
): Promise<void> {
  if (!conversationIds.length) return;
  await processWaitingQueueFn(workspaceId);
  for (const conversationId of conversationIds) {
    const entry = await prisma.leadQueueEntry.findUnique({
      where: { conversationId },
      select: { status: true, escalationLevel: true },
    });
    if (entry?.status === LeadQueueStatus.WAITING) {
      await notifyQueueFn(
        workspaceId,
        conversationId,
        entry.escalationLevel,
      );
    }
  }
}

export async function executeQueueWithinTransaction(
  tx: Prisma.TransactionClient,
  audit: AuditService,
  workspaceId: string,
  conversationId: string,
  reason: LeadQueueReason,
  customPriority?: number,
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
  const calculatedPriority = tags.some((tag) => urgentTags.has(tag))
    ? 2
    : conversation?.customer?.leadStatus === 'QUALIFIED'
      ? 1
      : 0;
  const priority = customPriority !== undefined ? customPriority : calculatedPriority;

  if (previous?.status === LeadQueueStatus.WAITING) {
    if (priority > previous.priority) {
      await tx.leadQueueEntry.update({
        where: { id: previous.id },
        data: { priority },
      });
    }
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

  await audit.recordBusinessEvent(tx, {
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
