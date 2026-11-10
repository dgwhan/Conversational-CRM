import {
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import { isUuid } from '../../../utils/uuid.util.js';
import { WorkspaceRole } from '../domain/index.js';

const logger = new Logger('WorkspaceResolver');

/**
 * Trích xuất delegate của bảng User trong Prisma
 */
export function getUserDelegate(prisma?: PrismaService) {
  return prisma?.user;
}

/**
 * Tìm kiếm Không gian làm việc (Workspace) mục tiêu
 * Ưu tiên:
 * 1. Tìm theo workspaceId nếu có
 * 2. Tìm theo ownerId (Workspace mà user sở hữu hoặc đang tham gia hoạt động)
 */
export async function findTargetWorkspace(
  prisma: PrismaService,
  workspaceId?: string,
  ownerId?: string
) {
  if (workspaceId) {
    return prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
  }

  if (ownerId) {
    const owned = await prisma.workspace.findFirst({ where: { ownerId } });
    if (owned) return owned;

    const member = await prisma.workspaceMember.findFirst({
      where: { userId: ownerId, isActive: true },
    });
    if (member?.workspaceId) {
      return prisma.workspace.findUnique({
        where: { id: member.workspaceId },
      });
    }
  }

  return null;
}

/**
 * Phân giải ID người gọi từ Header request (ownerId hoặc currentStaffId)
 */
export async function resolveOwnerId(
  prisma?: PrismaService,
  ownerId?: string,
  currentStaffId?: string
): Promise<string> {
  const targetId = ownerId || currentStaffId || '';
  if (!targetId) return '';
  if (!prisma) return targetId;

  try {
    if (isUuid(targetId)) {
      const user = await getUserDelegate(prisma)?.findUnique({
        where: { id: targetId },
      });
      if (user) return user.id;
    }
  } catch (err) {
    logger.warn(`Could not resolve ownerId in DB: ${(err as Error).message}`);
  }

  return targetId;
}

/**
 * Xác định danh tính và vai trò RBAC (OWNER / STAFF) của người dùng trong Workspace
 */
export async function getCurrentUserAndRole(
  prisma: PrismaService,
  callerId: string,
  workspaceOrId?: any
): Promise<{ currentUser: any; role: WorkspaceRole }> {
  if (!callerId) {
    throw new ForbiddenException('Không thể xác định tài khoản truy vấn.');
  }

  const userDelegate = getUserDelegate(prisma);
  let currentUser: any = userDelegate
    ? await userDelegate.findUnique({
        where: { id: callerId },
      })
    : null;

  if (!currentUser) {
    currentUser = { id: callerId };
  }

  const targetWs =
    typeof workspaceOrId === 'object' && workspaceOrId !== null
      ? workspaceOrId
      : await findTargetWorkspace(prisma, workspaceOrId, callerId);

  // Nếu là người tạo/chủ sở hữu workspace -> OWNER
  if (targetWs && targetWs.ownerId === callerId) {
    return { currentUser, role: WorkspaceRole.OWNER };
  }

  // Nếu là thành viên trong workspace -> kiểm tra role từ WorkspaceMember
  if (targetWs) {
    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: targetWs.id,
        userId: callerId,
        isActive: true,
      },
    });

    if (member?.role === WorkspaceRole.OWNER) {
      return { currentUser, role: WorkspaceRole.OWNER };
    }
  }

  return { currentUser, role: WorkspaceRole.STAFF };
}

/**
 * Xác định ownerId từ Workspace hoặc tài khoản người dùng trong DB.
 * Ưu tiên:
 * 1. workspaceId -> ws.ownerId
 * 2. currentStaffId -> user.id
 * 3. ownerId -> user.id
 */
export async function resolveWorkspaceOwnerId(
  prisma?: PrismaService,
  ownerId?: string,
  workspaceId?: string,
  currentStaffId?: string
): Promise<string | null> {
  if (!prisma) return null;

  try {
    const userDelegate = getUserDelegate(prisma);

    // 1. Kiểm tra theo workspaceId truyền lên (lấy ownerId của Workspace đó)
    if (workspaceId) {
      const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
      if (ws?.ownerId) return ws.ownerId;
    }

    // 2. Kiểm tra theo currentStaffId (từ JWT / header người dùng hiện tại)
    if (currentStaffId && userDelegate) {
      const user = await userDelegate.findUnique({ where: { id: currentStaffId } });
      if (user) {
        return user.id;
      }
    }

    // 3. Kiểm tra theo ownerId truyền lên
    if (ownerId && userDelegate) {
      const user = await userDelegate.findUnique({ where: { id: ownerId } });
      if (user) {
        return user.id;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Tìm workspaceId hợp lệ từ DB cho Owner.
 * Nếu owner đã có workspace trong bảng workspaces, trả về workspace.id.
 */
export async function resolveWorkspaceForOwner(
  prisma?: PrismaService,
  resolvedOwner?: string,
  workspaceId?: string
): Promise<string | null> {
  if (!resolvedOwner) return null;
  if (!prisma) return workspaceId && isUuid(workspaceId) ? workspaceId : null;

  try {
    // 1. Nếu workspaceId truyền lên hợp lệ, kiểm tra xem có thuộc về Owner này không
    if (workspaceId) {
      const directWs = await prisma.workspace.findFirst({
        where: isUuid(workspaceId)
          ? { id: workspaceId, ownerId: resolvedOwner }
          : { OR: [{ id: workspaceId }, { slug: workspaceId }] },
      });
      if (directWs) return directWs.id;
    }

    // 2. Fallback sang workspace đầu tiên của Owner nếu không truyền hoặc không khớp
    const existingOwnerWs = await prisma.workspace.findFirst({
      where: { ownerId: resolvedOwner },
      orderBy: { createdAt: 'asc' },
    });
    if (existingOwnerWs) {
      return existingOwnerWs.id;
    }

    return null;
  } catch (err) {
    logger.error(`Error resolving workspace for owner ${resolvedOwner}: ${(err as Error).message}`);
    return null;
  }
}

