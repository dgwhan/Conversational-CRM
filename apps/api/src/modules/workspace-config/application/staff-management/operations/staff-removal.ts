import { BadRequestException, ConflictException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { WorkspaceMemberRole } from '@prisma/client';
import { PrismaService } from '../../../../../platform/database/prisma.service.js';
import { WorkspaceRole } from '../../../domain/index.js';
import { getUserDelegate, resolveOwnerId, findTargetWorkspace, getCurrentUserAndRole } from '../../workspace-resolver.js';

const logger = new Logger('StaffRemoval');

/**
 * Xóa thành viên khỏi Workspace hoặc tự rời Workspace.
 */
export async function removeStaff(
  prisma: PrismaService,
  actorId: string,
  targetStaffId: string,
  workspaceId?: string,
): Promise<{ success: boolean; message: string }> {
  const resolvedOwnerId = await resolveOwnerId(prisma, actorId);
  const userDelegate = getUserDelegate(prisma);

  try {
    const targetUser = userDelegate
      ? await userDelegate.findUnique({
          where: { id: targetStaffId },
          select: { id: true },
        })
      : null;

    if (!targetUser) {
      throw new NotFoundException(
        'Không tìm thấy tài khoản cần xóa.',
      );
    }

    const workspace = await findTargetWorkspace(
      prisma,
      workspaceId,
      resolvedOwnerId,
    );

    if (!workspace) {
      throw new NotFoundException(
        'Không tìm thấy Không gian làm việc tương ứng.',
      );
    }

    const { currentUser, role: actorRole } =
      await getCurrentUserAndRole(
        prisma,
        actorId,
        workspace,
      );

    const isSelfLeave = currentUser.id === targetStaffId;

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: targetStaffId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException(
        'Người dùng không phải là thành viên của Workspace này.',
      );
    }

    // Không cho phép xóa Owner thông qua chức năng quản lý nhân viên.
    if (membership.role === WorkspaceMemberRole.OWNER) {
      throw new ForbiddenException(
        'Không thể xóa Chủ sở hữu Workspace bằng chức năng này.',
      );
    }

    // Tự rời Workspace.
    if (isSelfLeave) {
      if (actorRole === WorkspaceRole.OWNER) {
        throw new BadRequestException(
          'Không thể rời Workspace khi bạn là Chủ sở hữu. Hãy chuyển quyền sở hữu trước.',
        );
      }

      await prisma.workspaceMember.delete({
        where: {
          workspaceId_userId: {
            workspaceId: workspace.id,
            userId: currentUser.id,
          },
        },
      });

      return {
        success: true,
        message: 'Bạn đã rời khỏi Không gian làm việc thành công.',
      };
    }

    // Không cho phép STAFF xóa thành viên khác.
    if (actorRole === WorkspaceRole.STAFF) {
      throw new ForbiddenException(
        'Bạn không có quyền xóa thành viên khỏi Workspace.',
      );
    }

    // MANAGER chỉ được xóa STAFF.
    if (
      actorRole === WorkspaceRole.MANAGER &&
      membership.role !== WorkspaceMemberRole.STAFF
    ) {
      throw new ForbiddenException(
        'Quản lý Workspace chỉ được xóa nhân viên tư vấn.',
      );
    }

    // Chỉ OWNER và MANAGER được phép xóa thành viên theo quy tắc trên.
    if (
      actorRole !== WorkspaceRole.OWNER &&
      actorRole !== WorkspaceRole.MANAGER
    ) {
      throw new ForbiddenException(
        'Bạn không có quyền thực hiện thao tác này.',
      );
    }

    await prisma.workspaceMember.delete({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: targetStaffId,
        },
      },
    });

    logger.log(
      `Member ${targetStaffId} removed from workspace ${workspace.id} by ${currentUser.id}`,
    );

    return {
      success: true,
      message: 'Đã xóa thành viên khỏi Không gian làm việc.',
    };
  } catch (err) {
    if (
      err instanceof BadRequestException ||
      err instanceof ConflictException ||
      err instanceof NotFoundException ||
      err instanceof ForbiddenException
    ) {
      throw err;
    }

    logger.error(
      `Could not remove member from workspace: ${(err as Error).message}`,
    );

    throw err;
  }
}