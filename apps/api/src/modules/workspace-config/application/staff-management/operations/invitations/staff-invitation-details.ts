import { NotFoundException } from '@nestjs/common';
import { WorkspaceMemberStatus } from '@prisma/client';
import { PrismaService } from '../../../../../../platform/database/prisma.service.js';
import { resolveOwnerId } from '../../../workspace-resolver.js';

/**
 * Lấy thông tin chi tiết lời mời tham gia Không gian làm việc
 */
export async function getInvitationDetails(
  prisma: PrismaService,
  callerId: string,
  invitationOrWsId: string
): Promise<{
  id: string;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug?: string | null;
  membersCount: number;
  role: string;
  status: string;
  invitedAt: Date;
  joinedAt?: Date | null;
  invitedBy?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  invitee: {
    id: string;
    fullName: string;
    email: string;
  };
}> {
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

  // Tìm kiếm lời mời theo ID WorkspaceMember hoặc workspaceId
  const member = await prisma.workspaceMember.findFirst({
    where: {
      OR: [
        { id: invitationOrWsId },
        { workspaceId: invitationOrWsId, userId: resolvedCaller },
      ],
    },
    include: {
      workspace: true,
      user: {
        select: { id: true, fullName: true, email: true },
      },
      invitedBy: {
        select: { id: true, fullName: true, email: true },
      },
    },
  });

  if (!member) {
    throw new NotFoundException('Không tìm thấy lời mời hoặc bạn không có quyền truy cập.');
  }

  // CHỐNG ACCESS BROKEN / IDOR: Người dùng hiện tại PHẢI là người nhận lời mời
  if (member.userId !== resolvedCaller) {
    throw new NotFoundException('Không tìm thấy lời mời hoặc bạn không có quyền truy cập.');
  }

  // Đếm số lượng thành viên chính thức (ACTIVE) của Không gian làm việc
  const membersCount = await prisma.workspaceMember.count({
    where: {
      workspaceId: member.workspaceId,
      status: WorkspaceMemberStatus.ACTIVE,
    },
  });

  return {
    id: member.id,
    workspaceId: member.workspaceId,
    workspaceName: member.workspace?.name,
    workspaceSlug: member.workspace?.slug,
    membersCount,
    role: member.role,
    status: member.status,
    invitedAt: member.invitedAt,
    joinedAt: member.joinedAt,
    invitedBy: member.invitedBy
      ? {
        id: member.invitedBy.id,
        fullName: member.invitedBy.fullName,
        email: member.invitedBy.email,
      }
      : null,
    invitee: {
      id: member.user.id,
      fullName: member.user.fullName,
      email: member.user.email,
    },
  };
}
