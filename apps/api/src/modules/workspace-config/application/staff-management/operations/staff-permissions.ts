import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../../../../platform/database/prisma.service.js';
import { WorkspaceRole } from '../../../domain/index.js';
import {
  findTargetWorkspace,
  getCurrentUserAndRole,
  resolveOwnerId,
} from '../../workspace-resolver.js';
import { STAFF_STATUS } from '../../../../auth/domain/staff-status.constants.js';
import { WorkspaceMemberRole } from '@prisma/client';

export async function setWorkspaceMemberRole(
  prisma: PrismaService,
  actorId: string,
  targetUserId: string,
  role: WorkspaceMemberRole,
  workspaceId?: string,
) {
  const resolvedActorId = await resolveOwnerId(prisma, actorId);

  const workspace = await findTargetWorkspace(
    prisma,
    workspaceId,
    resolvedActorId,
  );

  if (!workspace) {
    throw new NotFoundException('Không tìm thấy workspace.');
  }

  const { role: actorRole } = await getCurrentUserAndRole(
    prisma,
    resolvedActorId,
    workspace,
  );

  if (actorRole !== WorkspaceRole.OWNER) {
    throw new ForbiddenException(
      'Chỉ Owner mới được phép thay đổi vai trò thành viên.',
    );
  }

  if (role === WorkspaceRole.OWNER) {
    throw new BadRequestException(
      'Không thể cấp vai trò Owner thông qua chức năng này.',
    );
  }

  if (targetUserId === workspace.ownerId) {
    throw new BadRequestException(
      'Không thể thay đổi vai trò của Owner.',
    );
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: targetUserId,
      },
    },
  });

  if (
    !membership ||
    !membership.isActive ||
    membership.status !== STAFF_STATUS.ACTIVE
  ) {
    throw new NotFoundException(
      'Không tìm thấy thành viên đang hoạt động trong workspace.',
    );
  }

  if (membership.role === role) {
    return {
      userId: targetUserId,
      role: membership.role,
      changed: false,
    };
  }

  const updatedMembership = await prisma.workspaceMember.update({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: targetUserId,
      },
    },
    data: {
      role,
    },
    select: {
      userId: true,
      role: true,
    },
  });

  return {
    ...updatedMembership,
    changed: true,
  };
}