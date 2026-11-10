import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../../../platform/database/prisma.service.js';
import { WorkspaceRole } from '../../../domain/index.js';
import {
  getUserDelegate,
  resolveOwnerId,
  findTargetWorkspace,
  getCurrentUserAndRole,
} from '../../workspace-resolver.js';

const logger = new Logger('StaffRemoval');

/**
 * Xóa thành viên khỏi Không gian làm việc hoặc Rời khỏi Không gian làm việc
 * Chỉ xóa bản ghi liên kết WorkspaceMember
 */
export async function removeStaff(
  prisma: PrismaService,
  ownerId: string,
  targetStaffId: string,
  workspaceId?: string
): Promise<{ success: boolean; message: string }> {
  const resolvedCaller = await resolveOwnerId(prisma, ownerId);
  const userDelegate = getUserDelegate(prisma);

  try {
    const targetStaff = userDelegate
      ? await userDelegate.findUnique({
        where: { id: targetStaffId },
      })
      : null;

    if (!targetStaff) {
      throw new NotFoundException('Không tìm thấy tài khoản nhân viên cần xóa.');
    }

    // Xác định workspace cần thao tác
    const targetWs = await findTargetWorkspace(
      prisma,
      workspaceId,
      resolvedCaller
    );

    if (!targetWs) {
      throw new NotFoundException(
        'Không tìm thấy Không gian làm việc tương ứng.'
      );
    }

    // Lấy tư cách thành viên của người gọi trong Workspace này
    const { currentUser, role: currentUserRole } = await getCurrentUserAndRole(
      prisma,
      resolvedCaller,
      targetWs
    );

    const isCallerOwner = currentUserRole === WorkspaceRole.OWNER;
    const isSelfLeave = targetStaffId === currentUser.id;

    // Nhân viên chỉ được phép tự rời workspace của mình
    if (!isCallerOwner && !isSelfLeave) {
      throw new ForbiddenException(
        'Bạn không có quyền xóa thành viên khác khỏi Không gian làm việc này.'
      );
    }

    // Nếu là OWNER muốn rời/xóa chính mình, kiểm tra xem Workspace còn Owner nào khác không
    if (isSelfLeave && isCallerOwner) {
      const totalOwners = await prisma.workspaceMember.count({
        where: {
          workspaceId: targetWs.id,
          role: WorkspaceRole.OWNER,
          isActive: true,
        },
      });

      if (totalOwners <= 1) {
        throw new BadRequestException(
          'Không thể rời hoặc xóa Chủ sở hữu. Không gian làm việc phải có ít nhất 1 Chủ sở hữu.'
        );
      }
    }

    // Xóa thành viên khỏi bảng WorkspaceMember
    await prisma.workspaceMember.deleteMany({
      where: {
        workspaceId: targetWs.id,
        userId: targetStaffId,
      },
    });

    logger.log(`Member ${targetStaffId} removed from workspace ${targetWs.id}`);
    return {
      success: true,
      message: isSelfLeave
        ? 'Bạn đã rời khỏi Không gian làm việc thành công.'
        : 'Đã xóa nhân viên khỏi Không gian làm việc.',
    };
  } catch (err) {
    if (
      err instanceof BadRequestException ||
      err instanceof NotFoundException ||
      err instanceof ForbiddenException
    ) {
      throw err;
    }
    logger.warn(`Could not remove member from workspace: ${(err as Error).message}`);
    throw err;
  }
}

