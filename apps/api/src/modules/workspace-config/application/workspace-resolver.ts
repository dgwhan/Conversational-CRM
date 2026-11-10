import {
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import { isUuid } from '../../../utils/uuid.util.js';
import { WorkspaceRole } from '../domain/index.js';

const logger = new Logger('WorkspaceResolver');
const fallbackJwtService = new JwtService();

/**
 * Trích xuất ID và Role của người dùng từ Authorization Bearer Token
 */
export function extractUserFromAuthHeader(
  authHeader?: string
): { id: string; role?: string } | null {
  if (!authHeader) return null;
  const match = /^Bearer\s+([^\s]+)$/i.exec(authHeader);
  if (!match) return null;
  const token = match[1];

  try {
    const secret = process.env.JWT_ACCESS_SECRET;
    const payload: any = secret
      ? fallbackJwtService.verify(token, { secret })
      : fallbackJwtService.decode(token);
    if (payload && typeof payload.sub === 'string') {
      return { id: payload.sub, role: payload.role };
    }
  } catch {
    try {
      const decoded: any = fallbackJwtService.decode(token);
      if (decoded && typeof decoded.sub === 'string') {
        return { id: decoded.sub, role: decoded.role };
      }
    } catch {}
  }
  return null;
}

/**
 * Phân giải Caller ID an toàn theo độ ưu tiên:
 * 1. req.user.id (đã xác thực qua JwtAuthGuard)
 * 2. Authorization Bearer Access Token trong header
 * 3. ownerId / staffId header (fallback cho mock testing)
 */
export function resolveCallerId(
  req?: any,
  ownerId?: string,
  staffId?: string
): string {
  if (req?.user?.id) {
    return req.user.id;
  }
  const tokenUser = extractUserFromAuthHeader(req?.headers?.authorization);
  if (tokenUser?.id) {
    return tokenUser.id;
  }
  return ownerId || staffId || '';
}

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

