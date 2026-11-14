import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../../../../../platform/database/prisma.service.js';
import { WorkspaceRole } from '../../../domain/index.js';
import { findTargetWorkspace, getCurrentUserAndRole, resolveOwnerId } from '../../workspace-resolver.js';

const logger = new Logger('StaffLock');

/**
 * Khóa hoặc Mở khóa tài khoản thành viên trong Workspace.
 * Khi bị khóa (isActive = false), thành viên sẽ bị chặn truy cập hoàn toàn vào workspace này (chống IDOR).
 * Chỉ OWNER mới có quyền thực hiện.
 */
export async function toggleStaffLock(
  prisma: PrismaService,
  actorId: string,
  targetUserId: string,
  lock: boolean,
  workspaceId?: string,
): Promise<{ success: boolean; userId: string; locked: boolean; message: string }> {
  const resolvedActorId = await resolveOwnerId(prisma, actorId);
  const workspace = await findTargetWorkspace(prisma, workspaceId, resolvedActorId);
  if (!workspace) {
    throw new NotFoundException('Không tìm thấy Không gian làm việc.');
  }

  const { role: actorRole } = await getCurrentUserAndRole(prisma, resolvedActorId, workspace);
  if (actorRole !== WorkspaceRole.OWNER && actorRole !== WorkspaceRole.MANAGER) {
    throw new ForbiddenException('Chỉ Chủ sở hữu (Owner) hoặc Quản lý (Manager) mới có quyền khóa hoặc mở khóa thành viên.');
  }

  if (targetUserId === workspace.ownerId) {
    throw new BadRequestException('Không thể khóa tài khoản của Chủ sở hữu Workspace.');
  }

  if (targetUserId === resolvedActorId) {
    throw new BadRequestException('Bạn không thể tự khóa tài khoản của chính mình.');
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: targetUserId,
      },
    },
    select: {
      id: true,
      role: true,
      isWorkspaceManager: true,
      status: true,
      isActive: true,
      assignmentLocked: true,
      user: { select: { id: true, fullName: true, email: true } },
    },
  });

  if (!membership) {
    throw new NotFoundException('Không tìm thấy thành viên trong Không gian làm việc này.');
  }

  if (membership.role === WorkspaceRole.OWNER) {
    throw new BadRequestException('Không thể khóa tài khoản có vai trò Chủ sở hữu.');
  }

  // Quản lý chỉ được khóa / mở khóa STAFF, không được khóa OWNER hoặc MANAGER khác
  if (
    actorRole === WorkspaceRole.MANAGER &&
    (membership.role !== WorkspaceRole.STAFF || membership.isWorkspaceManager === true)
  ) {
    throw new ForbiddenException('Quản lý workspace chỉ được khóa hoặc mở khóa nhân viên tư vấn.');
  }

  const newIsActive = !lock;
  if (membership.isActive === newIsActive) {
    return {
      success: true,
      userId: targetUserId,
      locked: lock,
      message: lock
        ? 'Thành viên này hiện đã ở trạng thái bị khóa.'
        : 'Thành viên này hiện đã ở trạng thái hoạt động.',
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.workspaceMember.update({
      where: { id: membership.id },
      data: {
        isActive: newIsActive,
        // Khi khóa, đồng thời khóa luôn phân bổ lead mới
        assignmentLocked: lock ? true : membership.assignmentLocked,
      },
    });

    await tx.auditLog.create({
      data: {
        action: lock ? AuditAction.STAFF_LOCKED : AuditAction.STAFF_UNLOCKED,
        userId: resolvedActorId,
        actorId: resolvedActorId,
        workspaceId: workspace.id,
        metadata: {
          targetUserId,
          targetEmail: membership.user?.email,
          targetName: membership.user?.fullName,
          locked: lock,
          timestamp: new Date().toISOString(),
        },
      },
    });
  });

  logger.log(
    `Staff ${targetUserId} in workspace ${workspace.id} was ${lock ? 'locked' : 'unlocked'} by ${resolvedActorId}`,
  );

  return {
    success: true,
    userId: targetUserId,
    locked: lock,
    message: lock
      ? `Đã khóa quyền truy cập workspace của thành viên ${membership.user?.fullName || targetUserId}.`
      : `Đã mở khóa quyền truy cập workspace cho thành viên ${membership.user?.fullName || targetUserId}.`,
  };
}

