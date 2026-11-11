import { Logger, NotFoundException } from '@nestjs/common';
import { WorkspaceMemberStatus, NotificationType } from '@prisma/client';
import { PrismaService } from '../../../../../../platform/database/prisma.service.js';
import { resolveOwnerId } from '../../../workspace-resolver.js';

const logger = new Logger('StaffDecline');

/**
 * Từ chối lời mời tham gia Không gian làm việc
 */
export async function declineInvitation(
  prisma: PrismaService,
  callerId: string,
  invitationOrWsId: string
): Promise<{ success: boolean; message: string }> {
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

  const member = await prisma.workspaceMember.findFirst({
    where: {
      OR: [
        { id: invitationOrWsId, userId: resolvedCaller },
        { workspaceId: invitationOrWsId, userId: resolvedCaller },
      ],
      status: WorkspaceMemberStatus.PENDING,
    },
  });

  if (!member) {
    throw new NotFoundException('Không tìm thấy lời mời hợp lệ.');
  }

  await prisma.workspaceMember.update({
    where: { id: member.id },
    data: {
      status: WorkspaceMemberStatus.DECLINED,
      isActive: false,
    },
  });

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

  return {
    success: true,
    message: 'Đã từ chối lời mời tham gia Không gian làm việc.',
  };
}
