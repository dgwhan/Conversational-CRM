import { ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import {NotificationType, WorkspaceMemberRole, WorkspaceMemberStatus } from '@prisma/client';
import { PrismaService } from '../../../../../../platform/database/prisma.service.js';
import { WorkspaceRole } from '../../../../domain/index.js';
import { findTargetWorkspace, getCurrentUserAndRole, resolveOwnerId } from '../../../workspace-resolver.js';

const logger = new Logger('StaffCancelInvitation');

/**
 * Hủy lời mời đã gửi vào Workspace.
 *
 * OWNER: Có thể hủy lời mời MANAGER và STAFF.
 * MANAGER: Chỉ có thể hủy lời mời STAFF.
 * STAFF: Không có quyền.
 */
export async function cancelInvitation(
  prisma: PrismaService,
  actorId: string,
  targetStaffIdOrMemberId: string,
  workspaceId?: string,
): Promise<{ success: boolean; message: string }> {
  const resolvedOwnerId = await resolveOwnerId(prisma, actorId);

  const targetWs = await findTargetWorkspace(
    prisma,
    workspaceId,
    resolvedOwnerId,
  );

  if (!targetWs) {
    throw new NotFoundException(
      'Không tìm thấy Không gian làm việc.',
    );
  }

  const { currentUser, role: actorRole } =
    await getCurrentUserAndRole(
      prisma,
      actorId,
      targetWs,
    );

  if (
    actorRole !== WorkspaceRole.OWNER &&
    actorRole !== WorkspaceRole.MANAGER
  ) {
    throw new ForbiddenException(
      'Bạn không có quyền hủy lời mời thành viên.',
    );
  }

  const member = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId: targetWs.id,
      OR: [
        { id: targetStaffIdOrMemberId },
        { userId: targetStaffIdOrMemberId },
      ],
      status: WorkspaceMemberStatus.PENDING,
      isActive: true,
    },
  });

  if (!member) {
    throw new NotFoundException(
      'Không tìm thấy lời mời đang chờ chấp nhận.',
    );
  }

  // MANAGER chỉ được hủy lời mời STAFF.
  if (
    actorRole === WorkspaceRole.MANAGER &&
    member.role !== WorkspaceMemberRole.STAFF
  ) {
    throw new ForbiddenException(
      'Quản lý Workspace chỉ được hủy lời mời nhân viên tư vấn.',
    );
  }

  await prisma.workspaceMember.update({
    where: {
      id: member.id,
    },
    data: {
      status: WorkspaceMemberStatus.CANCELLED,
      isActive: false,
    },
  });

  // Thu hồi notification tương ứng nếu schema hỗ trợ lọc theo memberId.
  try {
    if (prisma.notification?.deleteMany) {
      await prisma.notification.deleteMany({
        where: {
          workspaceId: targetWs.id,
          userId: member.userId,
          type: NotificationType.WORKSPACE_INVITATION,
          // Cần bổ sung điều kiện memberId nếu metadata schema hỗ trợ.
        },
      });
    }
  } catch (error) {
    logger.warn(
      `Could not clean up invitation notification: ${(error as Error).message}`,
    );
  }

  logger.log(
    `User ${currentUser.id} cancelled invitation ${member.id} in workspace ${targetWs.id}`,
  );

  return {
    success: true,
    message: 'Đã hủy lời mời thành công.',
  };
}