import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { AuditAction, WorkspaceMemberRole, WorkspaceMemberStatus } from '@prisma/client';
import { PrismaService } from '../../../../../platform/database/prisma.service.js';
import { STAFF_STATUS } from '../../../../auth/domain/staff-status.constants.js';

const logger = new Logger('WorkspaceTransfer');

/**
 * Chuyển giao toàn quyền sở hữu Không gian làm việc cho một thành viên đang hoạt động khác.
 * Đảm bảo tính toàn vẹn dữ liệu qua Prisma Transaction.
 */
export async function transferOwnership(
  prisma: PrismaService,
  callerId: string,
  targetMemberId: string,
  workspaceId: string,
  leaveWorkspace = false,
): Promise<{ success: boolean; message: string; newOwnerId: string }> {
  if (!prisma) {
    throw new BadRequestException('Dịch vụ cơ sở dữ liệu hiện không khả dụng.');
  }

  if (!callerId) {
    throw new BadRequestException('Không thể xác định danh tính người thao tác.');
  }

  if (!targetMemberId) {
    throw new BadRequestException('ID thành viên nhận chuyển quyền (targetMemberId) là bắt buộc.');
  }

  if (callerId === targetMemberId) {
    throw new BadRequestException('Bạn đang là Chủ sở hữu của Workspace này; người nhận phải là một thành viên khác.');
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true, ownerId: true, isActive: true },
  });

  if (!workspace) {
    throw new NotFoundException('Không tìm thấy Không gian làm việc.');
  }

  if (workspace.ownerId !== callerId) {
    throw new ForbiddenException('Chỉ Chủ sở hữu hiện tại mới có quyền chuyển giao quyền sở hữu Workspace này.');
  }

  // Kiểm tra thành viên nhận chuyển quyền
  const targetMember = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: targetMemberId,
      },
    },
    select: {
      id: true,
      role: true,
      status: true,
      isActive: true,
      user: { select: { id: true, fullName: true, email: true } },
    },
  });

  if (!targetMember || !targetMember.isActive || targetMember.status !== STAFF_STATUS.ACTIVE) {
    throw new BadRequestException('Người nhận chuyển quyền phải là thành viên đang hoạt động trong Không gian làm việc này.');
  }

  await prisma.$transaction(async (tx) => {
    // 1. Cập nhật ownerId của workspace
    await tx.workspace.update({
      where: { id: workspaceId },
      data: { ownerId: targetMemberId },
    });

    // 2. Cập nhật cấu hình workspace nếu có
    await tx.workspaceConfiguration.updateMany({
      where: { workspaceId },
      data: { ownerId: targetMemberId },
    });

    // 3. Nâng quyền thành viên mới lên OWNER và gỡ cờ manager
    await tx.workspaceMember.update({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: targetMemberId,
        },
      },
      data: {
        role: WorkspaceMemberRole.OWNER,
        isWorkspaceManager: false,
      },
    });

    // 4. Nếu yêu cầu rời workspace: xóa thành viên cũ; Nếu ở lại: chuyển về MANAGER
    if (leaveWorkspace) {
      await tx.workspaceMember.deleteMany({
        where: {
          workspaceId,
          userId: callerId,
        },
      });
    } else {
      await tx.workspaceMember.upsert({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: callerId,
          },
        },
        update: {
          role: WorkspaceMemberRole.MANAGER,
          isWorkspaceManager: true,
        },
        create: {
          workspaceId,
          userId: callerId,
          role: WorkspaceMemberRole.MANAGER,
          status: WorkspaceMemberStatus.ACTIVE,
          isActive: true,
          isWorkspaceManager: true,
        },
      });
    }

    // 5. Ghi nhật ký kiểm toán (Audit Log)
    await tx.auditLog.create({
      data: {
        action: AuditAction.WORKSPACE_TRANSFERRED,
        userId: callerId,
        actorId: callerId,
        workspaceId,
        metadata: {
          workspaceName: workspace.name,
          previousOwnerId: callerId,
          newOwnerId: targetMemberId,
          targetEmail: targetMember.user?.email,
          leaveWorkspace,
          timestamp: new Date().toISOString(),
        },
      },
    });
  });

  logger.log(
    `Workspace ${workspaceId} ownership transferred from ${callerId} to ${targetMemberId} (leaveWorkspace=${leaveWorkspace})`,
  );

  return {
    success: true,
    message: leaveWorkspace
      ? `Đã chuyển quyền sở hữu cho ${targetMember.user?.fullName || targetMemberId} và rời khỏi Không gian làm việc thành công.`
      : `Đã chuyển quyền sở hữu Không gian làm việc cho ${targetMember.user?.fullName || targetMemberId} thành công.`,
    newOwnerId: targetMemberId,
  };
}

