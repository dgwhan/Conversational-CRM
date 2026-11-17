import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, WorkspaceMemberRole } from '@prisma/client';
import { PrismaService } from '../../../../../platform/database/prisma.service.js';
import { WorkspaceRole } from '../../../domain/index.js';
import { findTargetWorkspace, getCurrentUserAndRole, resolveOwnerId } from '../../workspace-resolver.js';
import { STAFF_STATUS } from '../../../../auth/domain/staff-status.constants.js';

export async function setWorkspaceMemberRole(
  prisma: PrismaService,
  actorId: string,
  targetUserId: string,
  role: WorkspaceMemberRole,
  workspaceId?: string,
) {
  if (role !== WorkspaceMemberRole.MANAGER && role !== WorkspaceMemberRole.STAFF) {
    throw new BadRequestException('Role phải là MANAGER hoặc STAFF.');
  }

  const resolvedActorId = await resolveOwnerId(prisma, actorId);
  const workspace = await findTargetWorkspace(prisma, workspaceId, resolvedActorId);
  if (!workspace) throw new NotFoundException('Không tìm thấy workspace.');

  const { role: actorRole } = await getCurrentUserAndRole(prisma, resolvedActorId, workspace);
  if (actorRole !== WorkspaceRole.OWNER) {
    throw new ForbiddenException('Chỉ Owner mới được cấp hoặc thu hồi quyền Quản lý workspace.');
  }
  if (targetUserId === workspace.ownerId) {
    throw new BadRequestException('Owner đã có toàn quyền workspace; không cần gán thêm hồ sơ quản lý.');
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: targetUserId } },
    select: { id: true, role: true, status: true, isActive: true },
  });
  if (!membership || !membership.isActive || membership.status !== STAFF_STATUS.ACTIVE) {
    throw new NotFoundException('Chỉ có thể cấp quyền cho thành viên đang hoạt động trong workspace.');
  }
  if (membership.role === WorkspaceRole.OWNER) {
    throw new BadRequestException('Thành viên có vai trò Owner đã có toàn quyền workspace.');
  }
  if (membership.role === role) {
    return { userId: targetUserId, role, changed: false };
  }

  await prisma.$transaction(async (tx) => {
    const updated = await tx.workspaceMember.updateMany({
      where: { id: membership.id, status: STAFF_STATUS.ACTIVE, isActive: true },
      data: { role },
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
          permission: 'MANAGE_STAFF',
          targetUserId,
          targetMemberId: membership.id,
          before: { role: membership.role },
          after: { role },
        },
      },
    });
  });

  return { userId: targetUserId, role, changed: true };
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
    select: { role: true, status: true, isActive: true },
  });
  const isOwner = workspace.ownerId === userId || role === WorkspaceRole.OWNER || member?.role === WorkspaceRole.OWNER;
  const isManager = member?.role === WorkspaceMemberRole.MANAGER && member.isActive && member.status === STAFF_STATUS.ACTIVE;
  return {
    isOwner,
    role: isOwner ? WorkspaceRole.OWNER : isManager ? WorkspaceRole.MANAGER : WorkspaceRole.STAFF,
    canManageWorkspace: isOwner || isManager,
    canManageStaff: isOwner || isManager,
    canManageShifts: isOwner || isManager,
    canManageRouting: isOwner || isManager,
    canViewAuditLogs: isOwner || isManager,
  };
}
