import { Prisma } from '@prisma/client';

/**
 * Cập nhật thành viên phụ trách (assignee) cho hội thoại và đồng bộ sang customer identities.
 * Được dùng chung giữa LeadAssignmentService, LeadHandoverService và LeadQueueService.
 */
export async function setConversationAssignee(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  conversationId: string,
  workspaceMemberId: string | null,
): Promise<void> {
  const conversation = await tx.conversation.update({
    where: { id: conversationId },
    data: { assignedMemberId: workspaceMemberId },
    select: { workspaceId: true, customerId: true },
  });
  if (conversation.workspaceId !== workspaceId || !conversation.customerId) {
    return;
  }
  const [customer, assignee] = await Promise.all([
    tx.customer.findUnique({
      where: { id: conversation.customerId },
      select: { channelIdentities: true },
    }),
    workspaceMemberId
      ? tx.workspaceMember.findFirst({
          where: { id: workspaceMemberId, workspaceId },
          select: { userId: true, user: { select: { fullName: true } } },
        })
      : Promise.resolve(null),
  ]);
  const current = customer?.channelIdentities;
  const identities =
    current && typeof current === 'object' && !Array.isArray(current)
      ? (current as Record<string, unknown>)
      : {};
  await tx.customer.update({
    where: { id: conversation.customerId },
    data: {
      channelIdentities: {
        ...identities,
        assignedMemberId: workspaceMemberId,
        assignedStaffId: assignee?.userId ?? null,
        assignedStaffName: assignee?.user.fullName ?? null,
      },
    },
  });
}
