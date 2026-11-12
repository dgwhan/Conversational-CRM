import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { WorkspaceMemberStatus } from '@prisma/client';
import { PrismaService } from '../../../../../platform/database/prisma.service.js';
import { WorkspaceRole } from '../../../domain/index.js';
import type { StaffItemResponse } from '../../../presentation/dto/index.js';
import {
  getUserDelegate,
  findTargetWorkspace,
  resolveOwnerId,
} from '../../workspace-resolver.js';

const logger = new Logger('StaffQuery');

/**
 * Lấy danh sách nhân viên thuộc Workspace
 */
export async function getStaffList(
  prisma: PrismaService,
  callerId: string,
  workspaceId?: string
): Promise<StaffItemResponse[]> {
  if (!callerId) {
    throw new ForbiddenException('Không thể xác định tài khoản truy vấn.');
  }

  const resolvedCaller = await resolveOwnerId(prisma, callerId);
  if (!resolvedCaller) {
    throw new ForbiddenException('Không tìm thấy tài khoản người dùng.');
  }

  const userDelegate = getUserDelegate(prisma);

  try {
    const targetWorkspace = await findTargetWorkspace(
      prisma,
      workspaceId,
      resolvedCaller
    );

    if (!targetWorkspace) {
      throw new NotFoundException('Không tìm thấy Không gian làm việc.');
    }

    // Người gọi bắt buộc phải thuộc Không gian làm việc
    const isMember =
      targetWorkspace.ownerId === resolvedCaller ||
      (await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: targetWorkspace.id,
          userId: resolvedCaller,
          isActive: true,
        },
      }));

    if (!isMember) {
      throw new ForbiddenException('Bạn không thuộc Không gian làm việc này.');
    }

    const staffMembers = userDelegate
      ? await userDelegate.findMany({
        where: {
          OR: [
            { id: targetWorkspace.ownerId },
            {
              memberships: {
                some: {
                  workspaceId: targetWorkspace.id,
                  isActive: true,
                },
              },
            },
          ],
        },
        select: {
          id: true,
          email: true,
          phoneNumber: true,
          fullName: true,
          status: true,
          lockedAt: true,
          createdAt: true,
          updatedAt: true,
          memberships: {
            where: { workspaceId: targetWorkspace.id },
            select: {
              id: true,
              role: true,
              status: true,
              isWorkspaceManager: true,
              assignmentLocked: true,
              invitedAt: true,
              joinedAt: true,
              invitedBy: {
                select: { id: true, fullName: true, email: true },
              },
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
      })
      : [];

    //Người tạo Workspace mặc định là OWNER
    const mappedStaff = staffMembers.map((s: any) => {
      const isOwnerUser = s.id === targetWorkspace.ownerId;
      const membership = s.memberships?.find((m: any) => m.workspaceId === targetWorkspace.id || m.id);

      const role: WorkspaceRole = isOwnerUser ? WorkspaceRole.OWNER : (membership?.role || WorkspaceRole.STAFF);
      const memberStatus: WorkspaceMemberStatus = isOwnerUser
        ? WorkspaceMemberStatus.ACTIVE
        : (membership?.status || WorkspaceMemberStatus.PENDING);
      const memberId: string | undefined = membership?.id;
      const assignmentLocked = membership?.assignmentLocked ?? false;
      const isWorkspaceManager = membership?.isWorkspaceManager ?? false;
      const invitedAt: Date | null = isOwnerUser ? null : (membership?.invitedAt ?? null);
      const joinedAt: Date | null = membership?.joinedAt ?? (isOwnerUser ? targetWorkspace.createdAt : null);
      const invitedBy = isOwnerUser ? null : (membership?.invitedBy ?? null);

      const { memberships: _memberships, ...rest } = s;
      return {
        ...rest,
        role,
        memberStatus,
        memberId,
        assignmentLocked,
        isWorkspaceManager,
        invitedAt,
        joinedAt,
        invitedBy,
        ownerId: targetWorkspace.ownerId,
      };
    });

    return mappedStaff as StaffItemResponse[];
  } catch (err) {
    if (
      err instanceof ForbiddenException ||
      err instanceof BadRequestException ||
      err instanceof NotFoundException
    ) {
      throw err;
    }
    logger.warn(`Could not fetch staff from DB: ${(err as Error).message}`);
    throw err;
  }
}

