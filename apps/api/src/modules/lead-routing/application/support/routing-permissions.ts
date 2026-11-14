import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { WorkspaceMemberStatus } from '@prisma/client';
import { PrismaService } from '../../../../platform/database/prisma.service.js';
import { Candidate, Db } from '../types/routing.types.js';

/**
 * Kiểm tra người dùng có quyền quản trị workspace (Owner hoặc Manager) hay không
 */
export async function hasWorkspaceManagementPermission(
  prisma: PrismaService,
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  return prisma.workspace
    .findFirst({
      where: {
        id: workspaceId,
        OR: [
          { ownerId: userId },
          {
            members: {
              some: {
                userId,
                isActive: true,
                status: WorkspaceMemberStatus.ACTIVE,
                OR: [
                  { role: 'OWNER' },
                  { role: 'MANAGER' },
                  { isWorkspaceManager: true },
                ],
              },
            },
          },
        ],
      },
      select: { id: true },
    })
    .then(Boolean);
}

export async function isWorkspaceOwner(
  prisma: PrismaService,
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  return prisma.workspace
    .findFirst({
      where: {
        id: workspaceId,
        OR: [
          { ownerId: userId },
          {
            members: {
              some: {
                userId,
                isActive: true,
                status: WorkspaceMemberStatus.ACTIVE,
                role: 'OWNER',
              },
            },
          },
        ],
      },
      select: { id: true },
    })
    .then(Boolean);
}

export async function assertShiftManager(
  prisma: PrismaService,
  workspaceId: string,
  actorId: string,
  shiftId: string,
): Promise<void> {
  if (await hasWorkspaceManagementPermission(prisma, workspaceId, actorId)) {
    return;
  }
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId: actorId,
      status: WorkspaceMemberStatus.ACTIVE,
      isActive: true,
      shiftAssignments: { some: { shiftId, isShiftManager: true } },
    },
  });
  if (!membership) {
    throw new ForbiddenException(
      'Chỉ Owner, Quản lý hoặc ca trưởng của ca này mới được thực hiện thao tác.',
    );
  }
}

export async function assertMemberManager(
  prisma: PrismaService,
  workspaceId: string,
  actorId: string,
  memberId: string,
): Promise<void> {
  const target = await prisma.workspaceMember.findFirst({
    where: { id: memberId, workspaceId },
    include: { workspace: { select: { ownerId: true } } },
  });
  if (!target) {
    throw new BadRequestException('Không tìm thấy thành viên trong workspace.');
  }
  const isTargetOwner =
    target.role === 'OWNER' || target.workspace.ownerId === target.userId;

  const isActorOwner = await isWorkspaceOwner(prisma, workspaceId, actorId);

  // Nếu target là Owner, CHỈ Owner mới được can thiệp
  if (isTargetOwner && !isActorOwner) {
    throw new ForbiddenException(
      'Không thể thay đổi hoặc quản lý vai trò của Chủ sở hữu (Owner).',
    );
  }

  if (await hasWorkspaceManagementPermission(prisma, workspaceId, actorId)) {
    return;
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId: actorId,
      status: WorkspaceMemberStatus.ACTIVE,
      isActive: true,
      shiftAssignments: {
        some: { workspaceMemberId: memberId, isShiftManager: true },
      },
    },
  });
  if (!membership) {
    throw new ForbiddenException(
      'Chỉ Owner, Quản lý hoặc ca trưởng của nhân viên mới được thực hiện thao tác.',
    );
  }
}

export async function assertQueueAccess(
  prisma: PrismaService,
  workspaceId: string,
  actorId: string,
  getCandidatesFn: (db: Db, workspaceId: string, now: Date) => Promise<Candidate[]>,
): Promise<void> {
  if (await hasWorkspaceManagementPermission(prisma, workspaceId, actorId)) {
    return;
  }
  const activeCandidates = await getCandidatesFn(prisma, workspaceId, new Date());
  if (activeCandidates.some((candidate) => candidate.userId === actorId)) {
    return;
  }
  const manager = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId: actorId,
      status: WorkspaceMemberStatus.ACTIVE,
      isActive: true,
      shiftAssignments: { some: { isShiftManager: true } },
    },
    select: { id: true },
  });
  if (!manager) {
    throw new ForbiddenException(
      'Hàng chờ chỉ dành cho Owner, Quản lý, ca trưởng hoặc nhân viên đang trực.',
    );
  }
}
