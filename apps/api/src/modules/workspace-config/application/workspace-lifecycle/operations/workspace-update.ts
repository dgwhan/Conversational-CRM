import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../../../platform/database/prisma.service.js';
import type {
  UpdateWorkspaceRequestDto,
  WorkspaceItemResponseDto,
} from '../../../presentation/dto/index.js';
import { WorkspaceRole, resolveBusinessDomain } from '../../../domain/index.js';

const logger = new Logger('WorkspaceUpdate');

/**
 * Cập nhật thông tin cơ bản của Workspace (Tên, Ngành nghề/Domain)
 */
export async function updateWorkspace(
  prisma: PrismaService,
  workspaceId: string,
  data: UpdateWorkspaceRequestDto,
  ownerId?: string
): Promise<WorkspaceItemResponseDto> {
  if (!prisma) {
    throw new BadRequestException('Database service is unavailable');
  }

  const callerId = ownerId;
  if (!callerId) {
    throw new BadRequestException('Không thể xác định tài khoản thao tác');
  }

  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      configuration: true,
      owner: { select: { fullName: true, email: true } },
    },
  });

  if (!ws) {
    throw new NotFoundException('Không tìm thấy Không gian làm việc');
  }

  const isOwner = ws.ownerId === callerId;
  const managerMembership = isOwner ? null : await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId: callerId,
      status: 'ACTIVE',
      isActive: true,
      isWorkspaceManager: true,
    },
    select: { id: true },
  });

  if (!isOwner && !managerMembership) {
    throw new ForbiddenException(
      'Chỉ Owner hoặc Quản lý workspace mới có quyền chỉnh sửa Không gian làm việc này'
    );
  }

  const updateName = data.name?.trim();
  const updateData: {
    name?: string
  } = {};
  if (updateName) {
    updateData.name = updateName;
  }

  const updated = await prisma.workspace.update({
    where: { id: workspaceId },
    data: updateData,
    include: {
      configuration: true,
      owner: { select: { fullName: true, email: true } },
    },
  });

  if (updated.configuration) {
    const configPatch: {
      workspaceName?:
      string; domain?: string
    } = {};
    if (updateName) {
      configPatch.workspaceName = updateName;
    }
    if (data.domain?.trim()) {
      configPatch.domain = resolveBusinessDomain(data.domain);
    }
    if (Object.keys(configPatch).length > 0) {
      await prisma.workspaceConfiguration.update({
        where: { id: updated.configuration.id },
        data: configPatch,
      });
    }
  }

  logger.log(`Updated workspace ${updated.id} (${updated.name}) by caller ${callerId}`);

  return {
    id: updated.id,
    name: updated.name,
    slug: updated.slug,
    role: isOwner ? WorkspaceRole.OWNER : WorkspaceRole.STAFF,
    isOwner,
    domain: data.domain?.trim() || updated.configuration?.domain,
    ownerId: updated.ownerId,
    ownerName: updated.owner?.fullName,
    createdAt: updated.createdAt,
  };
}
