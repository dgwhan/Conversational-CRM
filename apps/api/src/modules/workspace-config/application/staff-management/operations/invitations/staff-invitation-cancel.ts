import { ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { NotificationType, WorkspaceMemberStatus } from '@prisma/client';
import { PrismaService } from '../../../../../../platform/database/prisma.service.js';
import { WorkspaceRole } from '../../../../domain/index.js';
import { findTargetWorkspace, getCurrentUserAndRole, resolveOwnerId } from '../../../workspace-resolver.js';

const logger = new Logger('StaffCancelInvitation');

/**
 * Hủy lời mời đã gửi (Dành cho Chủ sở hữu Workspace)
 */
export async function cancelInvitation(
  prisma: PrismaService,
  ownerId: string,
  targetStaffIdOrMemberId: string,
  workspaceId?: string
): Promise<{ success: boolean; message: string }> {
  const resolvedOwner = await resolveOwnerId(prisma, ownerId);
  const targetWs = await findTargetWorkspace(prisma, workspaceId, resolvedOwner);
  if (!targetWs) {
    throw new NotFoundException('Không tìm thấy Không gian làm việc.');
  }

  const { role } = await getCurrentUserAndRole(prisma, resolvedOwner, targetWs);
  const callerMembership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: targetWs.id, userId: resolvedOwner } },
    select: { isWorkspaceManager: true, isActive: true, status: true },
  });
  const isOwner = targetWs.ownerId === resolvedOwner || role === WorkspaceRole.OWNER;
  const isWorkspaceManager = callerMembership?.isWorkspaceManager === true && callerMembership.isActive && callerMembership.status === 'ACTIVE';
  if (!isOwner && !isWorkspaceManager) {
    throw new ForbiddenException('Bạn chưa được cấp quyền quản lý lời mời trong workspace.');
  }

  const member = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId: targetWs.id,
      OR: [
        { id: targetStaffIdOrMemberId },
        { userId: targetStaffIdOrMemberId },
      ],
      status: WorkspaceMemberStatus.PENDING,
    },
  });

  if (!member) {
    throw new NotFoundException('Không tìm thấy lời mời đang chờ chấp nhận.');
  }
  if (!isOwner && member.role === WorkspaceRole.OWNER) {
    throw new ForbiddenException('Quản lý workspace không thể hủy lời mời cấp quyền Owner.');
  }

  // Xóa bản ghi WorkspaceMember
  await prisma.workspaceMember.delete({
    where: { id: member.id },
  });

  // Xóa hoặc thu hồi notification lời mời tương ứng
  try {
    if (prisma.notification?.deleteMany) {
      await prisma.notification.deleteMany({
        where: {
          workspaceId: targetWs.id,
          userId: member.userId,
          type: NotificationType.WORKSPACE_INVITATION,
        },
      });
    }
  } catch (e) {
    logger.warn(`Could not clean up invitation notifications: ${(e as Error).message}`);
  }

  logger.log(
    `Owner ${resolvedOwner} cancelled invitation for member ${member.id} in workspace ${targetWs.id}`
  );

  return {
    success: true,
    message: 'Đã hủy lời mời thành công.',
  };
}
