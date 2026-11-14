import { ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../../platform/database/prisma.service.js';
import { WorkspaceRole } from '../../contracts/roles.js';
import type { RequestIdentity } from './request-identity.js';
import { resolveActiveMemberId } from './workspace-membership.js';

type ScopePrisma = Pick<PrismaService, 'workspaceMember' | 'customer'>;

/**
 * Bộ lọc danh sách cho STAFF: chỉ thấy bản ghi giao cho mình hoặc chưa giao cho ai.
 * OWNER không bị giới hạn (trả về {}).
 */
export async function staffAssignmentFilter(
  prisma: ScopePrisma,
  identity: RequestIdentity,
): Promise<{ OR?: Array<{ assignedMemberId: string | null }> }> {
  if (identity.role === WorkspaceRole.OWNER) return {};
  const memberId = await resolveActiveMemberId(prisma, identity.workspaceId, identity.userId);
  return { OR: [{ assignedMemberId: null }, ...(memberId ? [{ assignedMemberId: memberId }] : [])] };
}

/**
 * Chặn STAFF sửa / xóa bản ghi (deal, activity, tag khách hàng) không thuộc phạm vi phụ trách.
 * STAFF được phép khi bản ghi giao cho chính họ, hoặc khi cả bản ghi lẫn khách hàng liên quan
 * đều chưa được giao cho ai.
 */
export async function assertStaffCanModify(
  prisma: ScopePrisma,
  identity: RequestIdentity,
  target: { assignedMemberId?: string | null; customerId?: string | null },
): Promise<void> {
  if (identity.role === WorkspaceRole.OWNER) return;
  const memberId = await resolveActiveMemberId(prisma, identity.workspaceId, identity.userId);
  const mine = (id?: string | null) => Boolean(id) && (id === memberId || id === identity.userId);

  if (mine(target.assignedMemberId)) return;

  let customerAssignees: Array<string | null | undefined> = [];
  if (target.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: target.customerId, workspaceId: identity.workspaceId },
      select: { channelIdentities: true, conversations: { select: { assignedMemberId: true } } },
    });
    const ids = (customer?.channelIdentities as Record<string, unknown> | null) ?? {};
    customerAssignees = [
      ids.assignedMemberId as string | undefined,
      ids.assignedStaffId as string | undefined,
      ...(customer?.conversations ?? []).map((c) => c.assignedMemberId),
    ].filter(Boolean);
  }

  if (customerAssignees.some(mine)) return;
  if (!target.assignedMemberId && customerAssignees.length === 0) return;

  throw new ForbiddenException('Bạn chỉ được thao tác trên dữ liệu thuộc khách hàng mình phụ trách (403 Forbidden).');
}
