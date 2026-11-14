import { BadRequestException, ConflictException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { WorkspaceMemberRole } from '@prisma/client';
import { PrismaService } from '../../../../../platform/database/prisma.service.js';
import { WorkspaceRole } from '../../../domain/index.js';
import { getUserDelegate, resolveOwnerId, findTargetWorkspace, getCurrentUserAndRole } from '../../workspace-resolver.js';
import { transferOwnership } from '../../workspace-lifecycle/operations/workspace-transfer.js';

const logger = new Logger('StaffRemoval');

/**
 * Xóa thành viên khỏi Workspace hoặc tự rời Workspace.
 * Nếu Chủ sở hữu tự rời Workspace, bắt buộc phải chuyển quyền sở hữu cho thành viên khác.
 */
export async function removeStaff(
  prisma: PrismaService,
  actorId: string,
  targetStaffId: string,
  workspaceId?: string,
  targetNewOwnerId?: string,
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
    const isOwnerActor = actorRole === WorkspaceRole.OWNER || workspace.ownerId === currentUser.id;

    // Trường hợp: Chủ sở hữu tự rời khỏi Workspace
    if (isSelfLeave && isOwnerActor) {
      if (targetNewOwnerId) {
        const transferRes = await transferOwnership(
          prisma,
          currentUser.id,
          targetNewOwnerId,
          workspace.id,
          true,
        );
        return {
          success: true,
          message: transferRes.message,
        };
      }

      const otherMembersCount = await prisma.workspaceMember.count({
        where: {
          workspaceId: workspace.id,
          userId: { not: currentUser.id },
          isActive: true,
        },
      });

      if (otherMembersCount === 0) {
        throw new BadRequestException(
          'Không thể rời hoặc xóa Chủ sở hữu. Không gian làm việc phải có ít nhất 1 Chủ sở hữu. Bạn là thành viên duy nhất, hãy xóa Workspace nếu không còn nhu cầu sử dụng.',
        );
      }

      throw new BadRequestException(
        'Không thể rời hoặc xóa Chủ sở hữu. Không gian làm việc phải có ít nhất 1 Chủ sở hữu. Bắt buộc phải chọn thành viên nhận chuyển nhượng quyền Chủ sở hữu trước khi rời đi.',
      );
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: targetStaffId,
        },
      },
    });

    if (!membership) {
      if (workspace.ownerId === targetStaffId) {
        throw new BadRequestException(
          'Không thể rời hoặc xóa Chủ sở hữu mà không chuyển nhượng quyền sở hữu.',
        );
      }
      throw new NotFoundException(
        'Người dùng không phải là thành viên của Workspace này.',
      );
    }

    // Không cho phép bất kỳ ai xóa Chủ sở hữu
    if (membership.role === WorkspaceMemberRole.OWNER || workspace.ownerId === targetStaffId) {
      throw new ForbiddenException(
        'Không thể xóa Chủ sở hữu. Không gian làm việc phải luôn có 1 Chủ sở hữu.',
      );
    }

    // Tự rời Workspace (đối với MANAGER hoặc STAFF)
    if (isSelfLeave) {
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