import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../../../platform/database/prisma.service.js';
import { WorkspaceRole } from '../../../domain/index.js';

const logger = new Logger('WorkspaceDeletion');

/**
 * Xóa Không gian làm việc 
 */
export async function deleteWorkspace(
  prisma: PrismaService,
  workspaceId: string,
  callerIdOrStaffId?: string,
  ownerId?: string
): Promise<{ success: boolean; message: string }> {
  if (!prisma) {
    throw new BadRequestException('Database service is unavailable');
  }

  const callerId = ownerId || callerIdOrStaffId;
  if (!callerId) {
    throw new BadRequestException('Không thể xác định tài khoản thao tác');
  }

  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (!ws) {
    throw new NotFoundException('Không tìm thấy Không gian làm việc');
  }

  const isOwner = ws.ownerId === callerId;

  if (!isOwner) {
    throw new ForbiddenException('Chỉ Chủ sở hữu mới có quyền xóa Không gian làm việc này');
  }

  const count = await prisma.workspace.count({
    where: { ownerId: ws.ownerId, isActive: true },
  });

  if (count <= 1) {
    throw new BadRequestException(
      'Không thể xóa Không gian làm việc duy nhất của bạn. Bạn cần có ít nhất 1 không gian làm việc để hoạt động.'
    );
  }

  try {
    await prisma.workspace.delete({
      where: { id: workspaceId },
    });
  } catch {
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { isActive: false },
    });
  }

  logger.log(`Deleted workspace ${workspaceId} by owner ${callerId}`);

  return {
    success: true,
    message: 'Đã xóa Không gian làm việc thành công',
  };
}
