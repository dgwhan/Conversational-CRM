import {
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../../../platform/database/prisma.service.js';
import type {
  CreateWorkspaceRequestDto,
  WorkspaceItemResponseDto,
} from '../../../presentation/dto/index.js';
import { isUuid } from '../../../../../utils/uuid.util.js';
import { SlugUtil } from '../../../../../utils/slug.util.js';
import { resolveBusinessDomain, getIndustryPreset, WorkspaceRole } from '../../../domain/index.js';
import { WorkspaceMemberStatus } from '@prisma/client';
import { getUserDelegate } from '../../workspace-resolver.js';

const logger = new Logger('WorkspaceCreation');

/**
 * Tạo một Workspace mới trong Database kèm cấu hình theo ngành nghề.
 * Người nào tạo thì người đó trực tiếp làm CHỦ SỞ HỮU
 */
export async function createWorkspace(
  prisma: PrismaService,
  data: CreateWorkspaceRequestDto,
  staffId?: string,
  ownerId?: string
): Promise<WorkspaceItemResponseDto> {
  if (!prisma) {
    throw new BadRequestException('Database service is unavailable');
  }

  // Xác định ID tài khoản người dùng thực hiện tạo Workspace (từ headers/token)
  const creatorId = ownerId;
  if (!creatorId || !isUuid(creatorId)) {
    throw new BadRequestException('Không thể xác định tài khoản người tạo Không gian làm việc');
  }

  const userDelegate = getUserDelegate(prisma);
  const creator = userDelegate ? await userDelegate.findUnique({ where: { id: creatorId } }) : null;
  if (!creator) {
    throw new NotFoundException('Không tìm thấy tài khoản người tạo Không gian làm việc');
  }

  const name = data.name?.trim();
  if (!name) {
    throw new BadRequestException('Tên Workspace / Doanh nghiệp không được để trống');
  }

  // Ánh xạ domain chuẩn sang BusinessDomain & lấy preset từ domain
  const domainKey = resolveBusinessDomain(data.domain);
  const preset = getIndustryPreset(domainKey);

  // Sinh slug duy nhất
  const slug = SlugUtil.generateUnique(name);

  // Người tạo trực tiếp làm OWNER của Workspace
  const newWs = await prisma.workspace.create({
    data: {
      name,
      slug,
      ownerId: creator.id,
      isActive: true,
    },
  });

  // Tạo cấu hình theo preset
  await prisma.workspaceConfiguration.create({
    data: {
      workspaceId: newWs.id,
      ownerId: creator.id,
      domain: domainKey,
      workspaceName: name,
      terminology: preset.terminology as any,
      pipelineStages: preset.pipelineStages as any,
      productCatalog: preset.productCatalog as any,
      criteria: preset.criteria as any,
    },
  });

  // Tự động gán quyền OWNER chính thức cho người tạo Không gian làm việc
  await prisma.workspaceMember.create({
    data: {
      workspaceId: newWs.id,
      userId: creator.id,
      role: WorkspaceRole.OWNER,
      status: WorkspaceMemberStatus.ACTIVE,
      isActive: true,
      joinedAt: new Date(),
    },
  });

  logger.log(`Created new workspace ${newWs.id} (${newWs.name}) with owner ${creator.id} (${creator.email})`);

  return {
    id: newWs.id,
    name: newWs.name,
    slug: newWs.slug,
    role: WorkspaceRole.OWNER,
    isOwner: true,
    domain: domainKey,
    ownerId: creator.id,
    ownerName: creator.fullName,
    createdAt: newWs.createdAt,
  };
}
