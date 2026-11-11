import { Logger } from '@nestjs/common';
import { WorkspaceMemberStatus } from '@prisma/client';
import { PrismaService } from '../../../../../platform/database/prisma.service.js';
import type { WorkspaceItemResponseDto } from '../../../presentation/dto/index.js';
import { WorkspaceRole } from '../../../domain/index.js';
import { getUserDelegate } from '../../workspace-resolver.js';

const logger = new Logger('WorkspaceQuery');

/**
 * Lấy danh sách tất cả Workspace mà tài khoản người dùng tham gia
 */
export async function getMyWorkspaces(
  prisma: PrismaService,
  currentStaffId?: string,
  ownerId?: string
): Promise<WorkspaceItemResponseDto[]> {
  const targetStaffId = currentStaffId || ownerId;
  if (!targetStaffId || !prisma) {
    return [];
  }

  try {
    const userDelegate = getUserDelegate(prisma);
    const currentUser = userDelegate
      ? await userDelegate.findUnique({
        where: { id: targetStaffId },
      })
      : null;

    if (!currentUser) {
      return [];
    }

    //Workspaces do người này làm Chủ sở hữu
    const ownedWorkspaces = await prisma.workspace.findMany({
      where: { ownerId: targetStaffId, isActive: true },
      include: {
        configuration: true,
        owner: { select: { fullName: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    //Workspaces người này tham gia với tư cách thành viên
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: targetStaffId, isActive: true },
      include: {
        workspace: {
          include: {
            configuration: true,
            owner: { select: { fullName: true, email: true } },
          },
        },
      },
    });

    const resultMap = new Map<string, any>();

    for (const ws of ownedWorkspaces) {
      resultMap.set(ws.id, {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        role: WorkspaceRole.OWNER,
        isOwner: true,
        domain: ws.configuration?.domain,
        ownerId: ws.ownerId,
        ownerName: ws.owner?.fullName,
        createdAt: ws.createdAt,
      });
    }

    // Đưa workspaces từ membership vào
    for (const m of memberships) {
      if (!m.workspace || !m.workspace.isActive) continue;
      // Chỉ thành viên chính thức mới được xuất hiện trong danh sách workspace
      if (m.status !== WorkspaceMemberStatus.ACTIVE) continue;
      if (!resultMap.has(m.workspace.id)) {
        const isWsOwner = m.workspace.ownerId === targetStaffId;
        resultMap.set(m.workspace.id, {
          id: m.workspace.id,
          name: m.workspace.name,
          slug: m.workspace.slug,
          role: isWsOwner ? WorkspaceRole.OWNER : WorkspaceRole.STAFF,
          isOwner: isWsOwner,
          domain: m.workspace.configuration?.domain,
          ownerId: m.workspace.ownerId,
          ownerName: m.workspace.owner?.fullName,
          createdAt: m.workspace.createdAt,
        });
      }
    }

    return Array.from(resultMap.values());
  } catch (err) {
    logger.error(`Error in getMyWorkspaces: ${(err as Error).message}`);
    return [];
  }
}

