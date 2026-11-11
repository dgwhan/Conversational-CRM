import { isUuid } from '../../utils/uuid.util.js';
import { WorkspaceRole } from '../../contracts/roles.js';
import type { PrismaService } from '../../platform/database/prisma.service.js';

export interface ResolvedMembership {
  workspaceId: string;
  ownerId: string;
  /** Vai trò của người dùng TRONG workspace này (lấy từ DB, không tin client) */
  role: WorkspaceRole;
  /** ACTIVE | PENDING | DECLINED | CANCELLED (chủ sở hữu luôn là ACTIVE) */
  status: string;
}

type WorkspaceWithMembers = {
  id: string;
  ownerId: string;
  members?: Array<{ role: string; status: string; isActive: boolean }>;
};

function toMembership(ws: WorkspaceWithMembers, userId: string): ResolvedMembership | null {
  if (ws.ownerId === userId) {
    return { workspaceId: ws.id, ownerId: ws.ownerId, role: WorkspaceRole.OWNER, status: 'ACTIVE' };
  }
  const member = ws.members?.[0];
  if (!member || !member.isActive) return null;
  return {
    workspaceId: ws.id,
    ownerId: ws.ownerId,
    role: member.role === WorkspaceRole.OWNER ? WorkspaceRole.OWNER : WorkspaceRole.STAFF,
    status: member.status,
  };
}

/**
 * Xác định tư cách thành viên của `userId` trong workspace `workspaceRef` (UUID hoặc slug).
 * Trả về null nếu workspace không tồn tại hoặc người dùng không thuộc workspace đó.
 */
export async function resolveWorkspaceMembership(
  prisma: PrismaService,
  userId: string,
  workspaceRef: string,
): Promise<ResolvedMembership | null> {
  if (!userId || !workspaceRef) return null;

  const ws = (await prisma.workspace.findUnique({
    where: isUuid(workspaceRef) ? { id: workspaceRef } : { slug: workspaceRef },
    select: {
      id: true,
      ownerId: true,
      members: {
        where: { userId },
        select: { role: true, status: true, isActive: true },
        take: 1,
      },
    },
  })) as WorkspaceWithMembers | null;

  return ws ? toMembership(ws, userId) : null;
}

/**
 * Workspace mặc định của người dùng khi request không chỉ định workspace:
 * ưu tiên workspace do chính họ sở hữu (cũ nhất), sau đó là workspace họ đang là thành viên ACTIVE.
 */
export async function resolveDefaultMembership(
  prisma: PrismaService,
  userId: string,
): Promise<ResolvedMembership | null> {
  if (!userId) return null;

  const owned = await prisma.workspace.findFirst({
    where: { ownerId: userId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, ownerId: true },
  });
  if (owned) {
    return { workspaceId: owned.id, ownerId: owned.ownerId, role: WorkspaceRole.OWNER, status: 'ACTIVE' };
  }

  const member = await prisma.workspaceMember.findFirst({
    where: { userId, isActive: true, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
    select: { role: true, status: true, workspace: { select: { id: true, ownerId: true } } },
  });
  if (!member?.workspace) return null;

  return {
    workspaceId: member.workspace.id,
    ownerId: member.workspace.ownerId,
    role: member.role === WorkspaceRole.OWNER ? WorkspaceRole.OWNER : WorkspaceRole.STAFF,
    status: member.status,
  };
}
