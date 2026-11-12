import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../../../../../platform/database/prisma.service.js';
import { WorkspaceRole } from '../../../domain/index.js';
import { findTargetWorkspace, getCurrentUserAndRole, resolveOwnerId } from '../../workspace-resolver.js';

export async function setWorkspaceManagerPermission(
  prisma: PrismaService,
  actorId: string,
  targetUserId: string,
  isWorkspaceManager: boolean,
  workspaceId?: string,
) {
  const resolvedActorId = await resolveOwnerId(prisma, actorId);
  const workspace = await findTargetWorkspace(prisma, workspaceId, resolvedActorId);
  if (!workspace) throw new NotFoundException('Không tìm thấy workspace.');

  const { role } = await getCurrentUserAndRole(prisma, resolvedActorId, workspace);
  if (role !== WorkspaceRole.OWNER) {
    throw new ForbiddenException('Chỉ Owner kỹ thuật mới được cấp hoặc thu hồi quyền Quản lý workspace.');
  }
  if (targetUserId === workspace.ownerId) {
    throw new BadRequestException('Owner đã có toàn quyền workspace; không cần gán thêm hồ sơ quản lý.');
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: targetUserId } },
    select: { id: true, role: true, status: true, isActive: true, isWorkspaceManager: true },
  });
  if (!membership || !membership.isActive || membership.status !== 'ACTIVE') {
    throw new NotFoundException('Chỉ có thể cấp quyền cho thành viên đang hoạt động trong workspace.');
  }
  if (membership.role === WorkspaceRole.OWNER) {
    throw new BadRequestException('Thành viên có vai trò Owner đã có toàn quyền workspace.');
  }
  if (membership.isWorkspaceManager === isWorkspaceManager) {
    return { userId: targetUserId, isWorkspaceManager, changed: false };
  }

  await prisma.$transaction(async (tx) => {
    const updated = await tx.workspaceMember.updateMany({
      where: { id: membership.id, status: 'ACTIVE', isActive: true },
      data: { isWorkspaceManager },
    });
    if (updated.count !== 1) {
      throw new NotFoundException('Thành viên đã rời workspace hoặc không còn hoạt động.');
    }
    await tx.auditLog.create({
      data: {
        action: AuditAction.WORKSPACE_PERMISSION_CHANGED,
        userId: resolvedActorId,
        actorId: resolvedActorId,
        workspaceId: workspace.id,
        metadata: {
          permission: 'MANAGE_WORKSPACE',
          targetUserId,
          targetMemberId: membership.id,
          before: { isWorkspaceManager: membership.isWorkspaceManager },
          after: { isWorkspaceManager },
        },
      },
    });
  });

  return { userId: targetUserId, isWorkspaceManager, changed: true };
}

export async function getWorkspacePermissions(
  prisma: PrismaService,
  userId: string,
  workspaceId?: string,
) {
  const workspace = await findTargetWorkspace(prisma, workspaceId, userId);
  if (!workspace) throw new NotFoundException('Không tìm thấy workspace.');
  const { role } = await getCurrentUserAndRole(prisma, userId, workspace);
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId } },
    select: { isWorkspaceManager: true, status: true, isActive: true },
  });
  const isOwner = workspace.ownerId === userId || role === WorkspaceRole.OWNER;
  const isWorkspaceManager = member?.isWorkspaceManager === true && member.isActive && member.status === 'ACTIVE';
  return {
    isOwner,
    isWorkspaceManager,
    canManageWorkspace: isOwner || isWorkspaceManager,
  };
}
