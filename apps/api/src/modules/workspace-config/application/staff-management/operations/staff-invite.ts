import { BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { WorkspaceMemberRole, WorkspaceMemberStatus, NotificationType, NotificationSeverity, } from '@prisma/client';
import { PrismaService } from '../../../../../platform/database/prisma.service.js';
import { findUserByIdentifier, USER_IDENTIFIER_CONFIG } from '../../../../../common/configs/index.js';
import { WorkspaceRole } from '../../../domain/index.js';
import type { StaffItemResponse, CreateStaffDto} from '../../../presentation/dto/index.js';
import { findTargetWorkspace, resolveOwnerId, getCurrentUserAndRole } from '../../workspace-resolver.js';

const logger = new Logger('StaffInvite');

/**
 * Mời nhân viên đã có tài khoản vào Workspace
 * Chỉ OWNER và MANAGER mới có quyền mời
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

  // Mỗi workspace chỉ có duy nhất 1 Owner (người tạo hoặc nhận chuyển nhượng).
  // Thành viên mới luôn được mời với vai trò mặc định duy nhất là STAFF; Manager sẽ được cấp quyền sau tại cột Thao tác.
  if (dto.role && dto.role !== WorkspaceRole.STAFF) {
    throw new BadRequestException(
      'Chỉ được mời thành viên mới với vai trò Nhân viên tư vấn (STAFF). Sau khi gia nhập, Chủ sở hữu có thể đặt làm Quản lý tại cột Thao tác.',
    );
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
      await getCurrentUserAndRole(prisma, ownerId, ownerWorkspace);

    if (
      currentUserRole !== WorkspaceRole.OWNER &&
      currentUserRole !== WorkspaceRole.MANAGER
    ) {
      throw new ForbiddenException(
        'Bạn không có quyền mời thành viên vào workspace này.',
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

    // Vai trò khi mời luôn luôn là STAFF
    const finalRole: WorkspaceMemberRole = WorkspaceMemberRole.STAFF;

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

    const roleLabel = 'Nhân viên tư vấn';

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
            content: `${currentUser.fullName} đã mời bạn tham gia không gian làm việc "${ownerWorkspace.name}" với vai trò ${roleLabel}.`,
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

