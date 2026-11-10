import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { WorkspaceMemberStatus, NotificationType, NotificationSeverity } from '@prisma/client';
import { PrismaService } from '../../../../../platform/database/prisma.service.js';
import {
  findUserByIdentifier,
  USER_IDENTIFIER_CONFIG,
} from '../../../../../common/configs/index.js';
import { WorkspaceRole } from '../../../domain/index.js';
import type {
  StaffItemResponse,
  CreateStaffDto,
} from '../../../presentation/dto/index.js';
import {
  findTargetWorkspace,
  resolveOwnerId,
  getCurrentUserAndRole,
} from '../../workspace-resolver.js';

const logger = new Logger('StaffInvite');

/**
 * Mời nhân viên đã có tài khoản vào Workspace
 * Chỉ OWNER mới có quyền mời
 */
export async function createStaff(
  prisma: PrismaService,
  ownerId: string,
  dto: CreateStaffDto,
  workspaceId?: string
): Promise<StaffItemResponse> {
  const resolvedOwner = await resolveOwnerId(prisma, ownerId);
  const rawInput = (dto.identifier || dto.email || dto.phoneNumber || '').trim();

  if (!rawInput) {
    throw new BadRequestException(USER_IDENTIFIER_CONFIG.MESSAGES.MISSING_INPUT);
  }

  if (!dto.role) {
    throw new BadRequestException(USER_IDENTIFIER_CONFIG.MESSAGES.MISSING_ROLE);
  }

  if (dto.role !== WorkspaceRole.OWNER && dto.role !== WorkspaceRole.STAFF) {
    throw new BadRequestException(USER_IDENTIFIER_CONFIG.MESSAGES.INVALID_ROLE);
  }

  try {
    const ownerWorkspace = await findTargetWorkspace(
      prisma,
      workspaceId,
      resolvedOwner
    );

    if (!ownerWorkspace) {
      throw new NotFoundException('Không tìm thấy Không gian làm việc.');
    }

    // Lấy tài khoản hiện tại và vai trò trong Workspace
    const { currentUser, role: currentUserRole } =
      await getCurrentUserAndRole(prisma, resolvedOwner, ownerWorkspace);

    // KIỂM TRA QUYỀN: Chỉ Chủ sở hữu (OWNER) mới có quyền mời thành viên vào Không gian làm việc
    if (currentUserRole !== WorkspaceRole.OWNER) {
      throw new ForbiddenException(
        'Chỉ Chủ sở hữu (OWNER) mới có quyền mời thành viên vào Không gian làm việc.'
      );
    }

    // Tìm kiếm theo Email hoặc Số điện thoại qua magic string 'user' trên Prisma
    const { user: existing, identifierType } = await findUserByIdentifier(
      prisma,
      rawInput
    );

    // Tài khoản chưa tồn tại
    if (!existing) {
      throw new NotFoundException(
        USER_IDENTIFIER_CONFIG.MESSAGES.USER_NOT_FOUND(identifierType, rawInput)
      );
    }

    // Không thể tự thêm chính mình
    if (existing.id === currentUser.id) {
      throw new BadRequestException(
        USER_IDENTIFIER_CONFIG.MESSAGES.SELF_INVITE_DENIED
      );
    }

    // Kiểm tra xem tài khoản này đã là thành viên trong Workspace chưa
    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: ownerWorkspace.id,
          userId: existing.id,
        },
      },
    });

    if (existingMember && existingMember.isActive) {
      if (existingMember.status === WorkspaceMemberStatus.ACTIVE) {
        throw new BadRequestException(
          USER_IDENTIFIER_CONFIG.MESSAGES.ALREADY_MEMBER(
            existing.email || existing.phoneNumber
          )
        );
      }
      if (existingMember.status === WorkspaceMemberStatus.PENDING) {
        throw new BadRequestException(
          `Người dùng "${existing.email || existing.phoneNumber}" đã được gửi lời mời và đang chờ chấp nhận.`
        );
      }
    }

    // Sử dụng chính xác vai trò do người mời chỉ định (bắt buộc)
    const finalRole: WorkspaceRole = dto.role;

    const member = await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: ownerWorkspace.id,
          userId: existing.id,
        },
      },
      create: {
        workspaceId: ownerWorkspace.id,
        userId: existing.id,
        role: finalRole,
        status: WorkspaceMemberStatus.PENDING,
        isActive: true,
        invitedById: currentUser.id,
        invitedAt: new Date(),
      },
      update: {
        role: finalRole,
        status: WorkspaceMemberStatus.PENDING,
        isActive: true,
        invitedById: currentUser.id,
        invitedAt: new Date(),
        joinedAt: null,
      },
    });

    // Tạo bản ghi Notification cho người được mời
    try {
      if (prisma.notification?.create) {
        await prisma.notification.create({
          data: {
            workspaceId: ownerWorkspace.id,
            userId: existing.id,
            type: NotificationType.WORKSPACE_INVITATION,
            severity: NotificationSeverity.INFO,
            title: 'Lời mời tham gia Không gian làm việc',
            content: `${currentUser.fullName || 'Chủ sở hữu'} đã mời bạn tham gia không gian làm việc "${ownerWorkspace.name}" với vai trò ${finalRole === WorkspaceRole.OWNER ? 'Chủ sở hữu' : 'Nhân viên tư vấn'}.`,
            actionUrl: `/workspace/invited/${member.id}`,
            metadata: {
              workspaceId: ownerWorkspace.id,
              workspaceName: ownerWorkspace.name,
              invitedById: currentUser.id,
              invitedByName: currentUser.fullName,
              role: finalRole,
              memberId: member.id,
              invitationUrl: `/workspace/invited/${member.id}`,
            },
          },
        });
      }
    } catch (notifErr) {
      logger.warn(`Could not create invitation notification: ${(notifErr as Error).message}`);
    }

    logger.log(
      `Invited user "${existing.email || existing.phoneNumber}" to workspace ${ownerWorkspace.id} of owner ${resolvedOwner}`
    );

    return {
      id: existing.id,
      email: existing.email,
      fullName: existing.fullName,
      phoneNumber: existing.phoneNumber,
      status: existing.status,
      memberStatus: member.status,
      memberId: member.id,
      invitedAt: member.invitedAt,
      joinedAt: member.joinedAt,
      invitedBy: {
        id: currentUser.id,
        fullName: currentUser.fullName,
        email: currentUser.email,
      },
      lockedAt: existing.lockedAt,
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt,
      role: finalRole,
      ownerId: resolvedOwner,
    } as StaffItemResponse;
  } catch (err) {
    if (
      err instanceof BadRequestException ||
      err instanceof NotFoundException ||
      err instanceof ForbiddenException
    ) {
      throw err;
    }
    logger.warn(`Could not invite staff in DB: ${(err as Error).message}`);
    throw err;
  }
}

