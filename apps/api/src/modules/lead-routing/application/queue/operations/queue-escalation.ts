import { Logger } from '@nestjs/common';
import { AuditAction, LeadQueueStatus, NotificationSeverity, NotificationType, UserStatus, WorkspaceMemberStatus } from '@prisma/client';
import { PrismaService } from '../../../../../platform/database/prisma.service.js';
import { AuditService } from '../../../../audit/audit.service.js';
import { NotificationService } from '../../../../notification/notification.service.js';
import { LeadRoutingSupportService } from '../../support/lead-routing-support.service.js';

/**
 * Gửi thông báo đến ca trưởng / quản lý / nhân viên trực khi có lead trong hàng chờ đạt ngưỡng leo thang
 */
export async function notifyQueueRecipients(
  prisma: PrismaService,
  notifications: NotificationService,
  support: LeadRoutingSupportService,
  logger: Logger,
  workspaceId: string,
  conversationId: string,
  level: number,
): Promise<void> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { ownerId: true },
  });
  if (!workspace) return;
  const now = new Date();
  const managerRows = await prisma.workShiftMember.findMany({
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
    .filter((row) => support.shiftIsActive(row.shift, now))
    .map((row) => row.workspaceMember.userId);
  const recipients = [...new Set([workspace.ownerId, ...managerIds])];
  const queue = await prisma.leadQueueEntry.findUnique({
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
      notifications
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
          logger.warn(
            `Could not notify lead queue: ${(error as Error).message}`,
          ),
        ),
    ),
  );
}

export async function executeEscalateWaitingLeads(
  prisma: PrismaService,
  audit: AuditService,
  logger: Logger,
  processWaitingQueueFn: (workspaceId: string) => Promise<void>,
  notifyQueueFn: (workspaceId: string, conversationId: string, level: number) => Promise<void>,
): Promise<void> {
  const workspaces = await prisma.leadQueueEntry.findMany({
    where: { status: LeadQueueStatus.WAITING },
    distinct: ['workspaceId'],
    select: { workspaceId: true },
  });

  for (const workspace of workspaces) {
    await processWaitingQueueFn(workspace.workspaceId);
  }

  const waiting = await prisma.leadQueueEntry.findMany({
    where: { status: LeadQueueStatus.WAITING },
    take: 200,
    orderBy: { queuedAt: 'asc' },
  });
  const now = Date.now();
  for (const entry of waiting) {
    const ageMinutes = (now - entry.queuedAt.getTime()) / 60_000;
    const thresholds = entry.priority >= 2 ? [2, 5, 10] : [5, 15, 30];
    const targetLevel =
      ageMinutes >= thresholds[2]
        ? 3
        : ageMinutes >= thresholds[1]
          ? 2
          : ageMinutes >= thresholds[0]
            ? 1
            : 0;
    if (targetLevel <= entry.escalationLevel) continue;
    try {
      const changed = await prisma.$transaction(async (tx) => {
        const updated = await tx.leadQueueEntry.updateMany({
          where: {
            id: entry.id,
            status: LeadQueueStatus.WAITING,
            escalationLevel: entry.escalationLevel,
          },
          data: { escalationLevel: targetLevel, lastEscalatedAt: new Date() },
        });
        if (!updated.count) return false;
        await audit.recordBusinessEvent(tx, {
          action: AuditAction.LEAD_ESCALATED,
          workspaceId: entry.workspaceId,
          actorId: null,
          metadata: {
            conversationId: entry.conversationId,
            queueEntryId: entry.id,
            fromLevel: entry.escalationLevel,
            toLevel: targetLevel,
            ageMinutes: Math.floor(ageMinutes),
          },
        });
        return true;
      });
      if (!changed) continue;
      await notifyQueueFn(
        entry.workspaceId,
        entry.conversationId,
        targetLevel,
      );
    } catch (error) {
      logger.error(
        `Failed to audit/escalate queue entry ${entry.id}`,
        error,
      );
    }
  }
}
