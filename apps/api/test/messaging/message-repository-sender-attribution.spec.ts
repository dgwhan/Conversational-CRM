import { describe, expect, it, vi } from 'vitest';
import { MessageRepository } from '../../src/modules/messaging/infrastructure/message.repository.js';
import { Channel, MessageDirection } from '../../src/modules/messaging/domain/channel.js';
import type { PrismaService } from '../../src/platform/database/prisma.service.js';

describe('MessageRepository sender attribution', () => {
  it('enriches only missing attribution when an outbound duplicate was inserted first by an echo', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      channelAccount: { upsert: vi.fn().mockResolvedValue({ id: 'account-id' }) },
      message: {
        createManyAndReturn: vi.fn().mockResolvedValue([]),
        updateMany,
      },
    } as unknown as PrismaService;
    const repository = new MessageRepository(prisma);

    await repository.insertManyIgnoreDuplicate([{
      channel: Channel.FACEBOOK,
      externalAccountId: 'page-1',
      externalMessageId: 'mid-echo-1',
      senderExternalId: 'page-1',
      direction: MessageDirection.OUTBOUND,
      content: 'Xin chào',
      sentAt: new Date(),
      conversationId: '11111111-2222-3333-4444-555555555555',
      senderStaffId: 'staff-user-1',
      senderStaffName: 'Nguyễn An',
      rawPayload: { recipient: { id: 'customer-1' } },
    }]);

    expect(updateMany).toHaveBeenNthCalledWith(1, {
      where: { channel: Channel.FACEBOOK, externalMessageId: 'mid-echo-1', direction: MessageDirection.OUTBOUND, senderStaffId: null },
      data: { senderStaffId: 'staff-user-1' },
    });
    expect(updateMany).toHaveBeenNthCalledWith(2, {
      where: { channel: Channel.FACEBOOK, externalMessageId: 'mid-echo-1', direction: MessageDirection.OUTBOUND, senderStaffName: null },
      data: { senderStaffName: 'Nguyễn An' },
    });
  });
});
