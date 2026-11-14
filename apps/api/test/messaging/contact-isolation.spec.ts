import { describe, it, expect, beforeEach } from 'vitest';
import { ContactController } from '../../src/modules/messaging/presentation/contact.controller.js';
import { WorkspaceRole } from '../../src/contracts/roles.js';

describe('ContactController Workspace Isolation', () => {
  let controller: ContactController;
  let mockPrisma: any;

  beforeEach(() => {
    const contacts: any[] = [
      {
        id: 'contact-ws1',
        displayName: 'Contact Workspace 1',
        phoneNormalized: '0901234567',
        workspaceId: 'ws-1',
        isMerged: false,
        channelIdentities: [],
      },
      {
        id: 'contact-ws2',
        displayName: 'Contact Workspace 2',
        phoneNormalized: '0909999999',
        workspaceId: 'ws-2',
        isMerged: false,
        channelIdentities: [],
      },
      {
        id: 'contact-ws1-merged',
        displayName: 'Contact Workspace 1 Merged',
        workspaceId: 'ws-1',
        isMerged: true,
        channelIdentities: [],
      },
    ];

    mockPrisma = {
      contact: {
        findMany: async ({ where }: any) => {
          return contacts.filter((c) => {
            if (where.workspaceId && c.workspaceId !== where.workspaceId) return false;
            if (where.isMerged !== undefined && c.isMerged !== where.isMerged) return false;
            return true;
          });
        },
        findFirst: async ({ where }: any) => {
          return (
            contacts.find((c) => {
              if (where.workspaceId && c.workspaceId !== where.workspaceId) return false;
              if (where.phoneNormalized && c.phoneNormalized !== where.phoneNormalized) return false;
              if (where.email && c.email !== where.email) return false;
              if (where.isMerged !== undefined && c.isMerged !== where.isMerged) return false;
              return true;
            }) || null
          );
        },
      },
      channelIdentity: {
        findFirst: async () => null,
      },
    };

    controller = new ContactController(mockPrisma as any, {} as any);
  });

  it('getContacts chỉ trả về các liên hệ thuộc workspace đã xác thực của request', async () => {
    const reqWs1 = { workspace: { id: 'ws-1', role: WorkspaceRole.OWNER } };
    const resWs1 = await controller.getContacts(reqWs1);

    expect(resWs1.total).toBe(1);
    expect(resWs1.items[0].id).toBe('contact-ws1');
    expect(resWs1.items[0].workspaceId).toBe('ws-1');

    const reqWs2 = { workspace: { id: 'ws-2', role: WorkspaceRole.STAFF } };
    const resWs2 = await controller.getContacts(reqWs2);

    expect(resWs2.total).toBe(1);
    expect(resWs2.items[0].id).toBe('contact-ws2');
    expect(resWs2.items[0].workspaceId).toBe('ws-2');
  });

  it('STAFF bị chặn khi gọi hoàn tác gộp liên hệ (ForbiddenException)', async () => {
    const req = {
      user: { id: 'user-staff-1' },
      workspace: { id: 'ws-1', role: WorkspaceRole.STAFF },
    };

    await expect(controller.unmergeContact('log-1', undefined, undefined, req)).rejects.toThrow();
  });

  it('lookupContact không tìm thấy contact nếu contact thuộc workspace khác', async () => {
    const reqWs1 = { workspace: { id: 'ws-1', role: WorkspaceRole.STAFF } };
    // Tìm số của workspace 2 từ context workspace 1
    const res = await controller.lookupContact(reqWs1, undefined, undefined, '0909999999', undefined);

    expect(res.contact).toBeNull();
  });

  it('lookupContact tìm thấy contact nếu cùng workspace', async () => {
    const reqWs1 = { workspace: { id: 'ws-1', role: 'STAFF' } };
    const res = await controller.lookupContact(reqWs1, undefined, undefined, '0901234567', undefined);

    expect(res.contact).not.toBeNull();
    expect(res.contact?.id).toBe('contact-ws1');
  });
});

