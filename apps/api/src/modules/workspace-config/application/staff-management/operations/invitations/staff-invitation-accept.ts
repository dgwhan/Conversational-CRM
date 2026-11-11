import { Logger, NotFoundException } from '@nestjs/common';
import { WorkspaceMemberStatus, NotificationType } from '@prisma/client';
import { PrismaService } from '../../../../../../platform/database/prisma.service.js';
import { resolveOwnerId } from '../../../workspace-resolver.js';

const logger = new Logger('StaffAccept');

/**
 * Chấp nhận lời mời tham gia Không gian làm việc
 * Chuyển trạng thái WorkspaceMember từ PENDING -> ACTIVE và cập nhật joinedAt
 */
export async function acceptInvitation(
  prisma: PrismaService,
  callerId: string,
  invitationOrWsId: string
): Promise<{ success: boolean; message: string; workspace: any }> {
  if (!callerId) {
    throw new NotFoundException('Không tìm thấy lời mời hoặc bạn không có quyền truy cập.');
  }

  const resolvedCaller = await resolveOwnerId(prisma, callerId);
  if (!resolvedCaller) {
    throw new NotFoundException('Không tìm thấy lời mời hoặc bạn không có quyền truy cập.');
  }

  if (!invitationOrWsId || /[<>'"\\;`|\s]/.test(invitationOrWsId)) {
    throw new NotFoundException('Không tìm thấy lời mời hoặc bạn không có quyền truy cập.');
  }

  // 1. Tìm bản ghi WorkspaceMember ở trạng thái PENDING của người gọi
  const member = await prisma.workspaceMember.findFirst({
    where: {
      OR: [
        { id: invitationOrWsId, userId: resolvedCaller },
        { workspaceId: invitationOrWsId, userId: resolvedCaller },
      ],
      status: WorkspaceMemberStatus.PENDING,
    },
    include: {
      workspace: true,
    },
  });

  if (!member) {
    // Kiểm tra xem đã là thành viên ACTIVE chưa (idempotent)
    const alreadyActive = await prisma.workspaceMember.findFirst({
      where: {
        OR: [
          { id: invitationOrWsId, userId: resolvedCaller },
          { workspaceId: invitationOrWsId, userId: resolvedCaller },
        ],
        status: WorkspaceMemberStatus.ACTIVE,
      },
      include: {
        workspace: true,
      },
    });

    if (alreadyActive) {
      return {
        success: true,
        message: 'Bạn đã là thành viên chính thức của Không gian làm việc này.',
        workspace: alreadyActive.workspace,
      };
    }

    throw new NotFoundException(
      'Không tìm thấy lời mời đang chờ chấp nhận cho Không gian làm việc này.'
    );
  }

  // 2. Chuyển trạng thái sang ACTIVE, ghi nhận thời gian joinedAt
  await prisma.workspaceMember.update({
    where: { id: member.id },
    data: {
      status: WorkspaceMemberStatus.ACTIVE,
      isActive: true,
      joinedAt: new Date(),
    },
  });

  // 3. Đánh dấu các thông báo lời mời liên quan là đã đọc
  try {
    if (prisma.notification?.updateMany) {
      await prisma.notification.updateMany({
        where: {
          workspaceId: member.workspaceId,
          userId: resolvedCaller,
          type: NotificationType.WORKSPACE_INVITATION,
        },
        data: {
          isRead: true,
        },
      });
    }
  } catch (e) {
    logger.warn(`Could not update invitation notification: ${(e as Error).message}`);
  }

  logger.log(
    `User ${resolvedCaller} accepted invitation to workspace ${member.workspaceId}`
  );

  return {
    success: true,
    message: 'Đã chấp nhận lời mời tham gia Không gian làm việc thành công.',
    workspace: member.workspace,
  };
}
