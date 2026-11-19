import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { ChannelManagerService } from '../../src/modules/channel-connection/application/channels/channel-manager.service.js';

const STAFF_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CONVERSATION_ID = '11111111-2222-4333-8444-555555555555';

describe('ChannelManagerService.verifyStaffCanReply conversation ID', () => {
  const makeService = (assignedUserId = STAFF_ID) => {
    const findFirst = vi.fn().mockResolvedValue({
      id: CONVERSATION_ID,
      channelAccountId: 'channel-account-1',
      assignedMember: {
        userId: assignedUserId,
        user: { id: assignedUserId, fullName: 'Nguyễn An', email: 'an@example.test' },
      },
      customer: { channelIdentities: { facebook: 'customer-1' } },
      channelAccount: { channel: 'FACEBOOK', externalAccountId: 'page-1' },
      messages: [{ senderExternalId: 'customer-1', rawPayload: {} }],
    });
    const service = new ChannelManagerService(
      { conversation: { findFirst } } as any,
      {} as any,
    );
    return { service, findFirst };
  };

  it('rejects a synthetic conversation ID before checking an existing assignment', async () => {
    const { service, findFirst } = makeService();

    await expect(service.verifyStaffCanReply({
      conversationId: 'FACEBOOK_page-1_customer-1',
      recipientId: 'customer-1',
      workspaceId: 'workspace-1',
    }, STAFF_ID)).rejects.toThrow('Phải có hội thoại hợp lệ và được phân công trước khi trả lời.');

    expect(findFirst).not.toHaveBeenCalled();
  });

  it('accepts a UUID conversation assigned to the sending staff member', async () => {
    const { service, findFirst } = makeService();

    await expect(service.verifyStaffCanReply({
      conversationId: CONVERSATION_ID,
      recipientId: 'customer-1',
      workspaceId: 'workspace-1',
    }, STAFF_ID)).resolves.toEqual({
      channelAccountId: 'channel-account-1',
      recipientId: 'customer-1',
      staffName: 'Nguyễn An',
    });

    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: CONVERSATION_ID, workspaceId: 'workspace-1' },
    }));
  });

  it('accepts Zalo Personal when recipientId is customer UUID and resolves to customer Zalo UID', async () => {
    const CUSTOMER_ID = '22222222-3333-4444-8555-666666666666';
    const findFirst = vi.fn().mockResolvedValue({
      id: CONVERSATION_ID,
      channelAccountId: 'channel-account-zca-1',
      customerId: CUSTOMER_ID,
      assignedMember: {
        userId: STAFF_ID,
        user: { id: STAFF_ID, fullName: 'Dương Ngọc Hân', email: 'han@example.test' },
      },
      customer: {
        id: CUSTOMER_ID,
        phone: '0901234567',
        channelIdentities: { zalo: '987654321', zalo_personal: '987654321' },
      },
      channelAccount: { channel: 'ZALO', externalAccountId: 'zca_my_uid', metadata: { isPersonal: true } },
      messages: [{ senderExternalId: '987654321', rawPayload: { uidFrom: '987654321' } }],
    });
    const service = new ChannelManagerService({ conversation: { findFirst } } as any, {} as any);

    await expect(service.verifyStaffCanReply({
      conversationId: CONVERSATION_ID,
      recipientId: CUSTOMER_ID, // Frontend fallback UUID
      workspaceId: 'workspace-1',
    }, STAFF_ID)).resolves.toEqual({
      channelAccountId: 'channel-account-zca-1',
      recipientId: '987654321',
      staffName: 'Dương Ngọc Hân',
    });
  });

  it('accepts Zalo Personal when recipientId matches customer phone number', async () => {
    const CUSTOMER_ID = '22222222-3333-4444-8555-666666666666';
    const findFirst = vi.fn().mockResolvedValue({
      id: CONVERSATION_ID,
      channelAccountId: 'channel-account-zca-1',
      customerId: CUSTOMER_ID,
      assignedMember: {
        userId: STAFF_ID,
        user: { id: STAFF_ID, fullName: 'Dương Ngọc Hân', email: 'han@example.test' },
      },
      customer: {
        id: CUSTOMER_ID,
        phone: '0901234567',
        channelIdentities: { zalo: '987654321' },
      },
      channelAccount: { channel: 'ZALO', externalAccountId: 'zca_my_uid', metadata: { isPersonal: true } },
      messages: [],
    });
    const service = new ChannelManagerService({ conversation: { findFirst } } as any, {} as any);

    await expect(service.verifyStaffCanReply({
      conversationId: CONVERSATION_ID,
      recipientId: '0901234567',
      workspaceId: 'workspace-1',
    }, STAFF_ID)).resolves.toEqual({
      channelAccountId: 'channel-account-zca-1',
      recipientId: '0901234567',
      staffName: 'Dương Ngọc Hân',
    });
  });

  it('reports an assignment error separately when the UUID is valid but assigned to another staff member', async () => {
    const { service } = makeService('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

    await expect(service.verifyStaffCanReply({
      conversationId: CONVERSATION_ID,
      recipientId: 'customer-1',
      workspaceId: 'workspace-1',
    }, STAFF_ID)).rejects.toThrow('Bạn chỉ có thể trả lời hội thoại đã được phân công cho mình.');
  });
});
