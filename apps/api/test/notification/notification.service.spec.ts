import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../src/platform/database/prisma.service.js';
import type { RealtimeService } from '../../src/modules/realtime/realtime.service.js';
import { NotificationService } from '../../src/modules/notification/notification.service.js';

const notificationId = 'a4e47e8f-4e16-4f25-9a1f-e7e58d6af551';
const recipientId = 'b5f58f90-5f27-4a36-8b2a-f8f69e7b0652';

describe('NotificationService.markPersonalNotificationAsRead', () => {
  const updateMany = vi.fn();
  const findFirst = vi.fn();
  const prisma = {
    notification: { updateMany, findFirst },
  } as unknown as PrismaService;
  const service = new NotificationService(prisma, {} as RealtimeService);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks a personal notification read by recipient, without workspace membership', async () => {
    const notification = { id: notificationId, userId: recipientId, isRead: true };
    updateMany.mockResolvedValue({ count: 1 });
    findFirst.mockResolvedValue(notification);

    await expect(
      service.markPersonalNotificationAsRead(recipientId, notificationId),
    ).resolves.toBe(notification);

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: notificationId, userId: recipientId },
      data: { isRead: true },
    });
  });

  it("does not mark another user's notification read", async () => {
    updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.markPersonalNotificationAsRead(recipientId, notificationId),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(findFirst).not.toHaveBeenCalled();
  });
});
