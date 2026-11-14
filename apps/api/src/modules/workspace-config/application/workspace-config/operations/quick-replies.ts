import { NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import type { PrismaService } from '../../../../../platform/database/prisma.service.js';

export const quickRepliesSchema = z
  .array(
    z.object({
      id: z.string().trim().min(1).max(64),
      label: z.string().trim().min(1).max(100),
      content: z.string().trim().min(1).max(2_000),
      shortcut: z.string().trim().max(30).optional(),
    }),
  )
  .max(200);

export type QuickReply = z.infer<typeof quickRepliesSchema>[number];

/** Mẫu trả lời nhanh của workspace; null khi chưa từng cấu hình (giao diện tự dùng mẫu mặc định). */
export async function getQuickReplies(prisma: PrismaService, workspaceId: string): Promise<QuickReply[] | null> {
  const config = await prisma.workspaceConfiguration.findUnique({
    where: { workspaceId },
    select: { quickReplies: true },
  });
  const parsed = quickRepliesSchema.safeParse(config?.quickReplies);
  return parsed.success ? parsed.data : null;
}

/** Lưu toàn bộ danh sách mẫu trả lời nhanh (dùng chung cho mọi thành viên của workspace). */
export async function saveQuickReplies(
  prisma: PrismaService,
  workspaceId: string,
  replies: QuickReply[],
): Promise<QuickReply[]> {
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { ownerId: true } });
  if (!workspace) throw new NotFoundException('Không tìm thấy không gian làm việc.');

  await prisma.workspaceConfiguration.upsert({
    where: { workspaceId },
    update: { quickReplies: replies },
    create: { workspaceId, ownerId: workspace.ownerId, quickReplies: replies },
  });
  return replies;
}
