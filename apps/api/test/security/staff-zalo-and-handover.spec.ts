import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChannelConnectorController } from '../../src/modules/channel-connection/presentation/channel-connector.controller.js';
import { WorkspaceRole } from '../../src/contracts/roles.js';
import { ForbiddenException } from '@nestjs/common';
import { Channel } from '../../src/modules/messaging/domain/channel.js';

describe('STAFF Permissions - Zalo Exception & Handover Security', () => {
  let controller: ChannelConnectorController;
  let mockOAuthService: any;
  let mockChannelManager: any;
  let mockZcaService: any;

  beforeEach(() => {
    mockOAuthService = {
      generateAuthorizeUrl: vi.fn().mockReturnValue({ authorizeUrl: 'https://oauth.zalo.me/...', state: 'test-state', channel: 'ZALO' }),
      exchangeToken: vi.fn().mockResolvedValue({ pages: [] }),
    };

    mockChannelManager = {
      activateChannels: vi.fn().mockResolvedValue({ activatedCount: 1, workspaceId: 'ws-1' }),
      syncChannel: vi.fn().mockResolvedValue({ syncedCount: 5, conversationsCount: 1, pageName: 'Zalo' }),
      getChannelById: vi.fn(),
      disconnectChannel: vi.fn().mockResolvedValue({ success: true, id: 'ch-1' }),
    };

    mockZcaService = {
      createQrSession: vi.fn().mockReturnValue({ sessionId: 'session-1', qrCodeUrl: 'base64...' }),
      getQrSessionStatus: vi.fn().mockReturnValue({ sessionId: 'session-1', status: 'PENDING' }),
      simulateOrConfirmQrLogin: vi.fn().mockReturnValue({ sessionId: 'session-1', status: 'SUCCESS' }),
    };

    controller = new ChannelConnectorController(
      mockOAuthService,
      mockChannelManager,
      mockZcaService,
    );
  });

  describe('Zalo Temporary Exception for STAFF', () => {
    it('allows STAFF to get authorize URL for Zalo', () => {
      const req = {
        workspace: { id: 'ws-1', role: WorkspaceRole.STAFF },
      };
      const res = controller.getAuthorizeUrl(
        'zalo',
        { redirectUri: 'https://crm.local/oauth/callback', state: 'test-state' },
        req,
      );
      expect(res.authorizeUrl).toContain('https://oauth.zalo.me');
      expect(mockOAuthService.generateAuthorizeUrl).toHaveBeenCalled();
    });

    it('blocks STAFF from getting authorize URL for FACEBOOK', () => {
      const req = {
        workspace: { id: 'ws-1', role: WorkspaceRole.STAFF },
      };
      expect(() =>
        controller.getAuthorizeUrl(
          'facebook',
          { redirectUri: 'https://crm.local/oauth/callback', state: 'test-state' },
          req,
        ),
      ).toThrow(ForbiddenException);
    });

    it('allows STAFF to exchange token for Zalo', async () => {
      const req = {
        workspace: { id: 'ws-1', role: WorkspaceRole.STAFF },
      };
      const res = await controller.exchangeToken(
        'zalo',
        { code: 'test-code', redirectUri: 'https://crm.local/oauth/callback', state: 'test-state' },
        req,
      );
      expect(res.pages).toBeDefined();
      expect(mockOAuthService.exchangeToken).toHaveBeenCalled();
    });

    it('blocks STAFF from exchanging token for FACEBOOK', async () => {
      const req = {
        workspace: { id: 'ws-1', role: WorkspaceRole.STAFF },
      };
      await expect(
        controller.exchangeToken(
          'facebook',
          { code: 'test-code', redirectUri: 'https://crm.local/oauth/callback', state: 'test-state' },
          req,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
    it('allows STAFF to initialize Zalo personal QR session', async () => {
      const res = await controller.initZaloPersonalQr();
      expect(res.sessionId).toBe('session-1');
      expect(mockZcaService.createQrSession).toHaveBeenCalled();
    });

    it('allows STAFF to check QR status and confirm QR login', async () => {
      const status = await controller.getZaloPersonalQrStatus('session-1');
      expect(status.status).toBe('PENDING');

      const confirm = await controller.confirmZaloPersonalQr({ sessionId: 'session-1' });
      expect(confirm.status).toBe('SUCCESS');
    });

    it('allows STAFF to activate Zalo channels', async () => {
      const req = {
        workspace: { id: 'ws-1', role: WorkspaceRole.STAFF },
      };

      const res = await controller.activateChannels(
        {
          workspaceId: 'ws-1',
          pages: [
            {
              channel: 'ZALO',
              externalAccountId: 'zalo-1',
              displayName: 'Zalo Personal',
            },
          ],
        },
        'ws-1',
        undefined,
        req,
      );

      expect(res.activatedCount).toBe(1);
      expect(mockChannelManager.activateChannels).toHaveBeenCalled();
    });

    it('blocks STAFF from activating non-Zalo channels (e.g. FACEBOOK)', async () => {
      const req = {
        workspace: { id: 'ws-1', role: WorkspaceRole.STAFF },
      };

      await expect(
        controller.activateChannels(
          {
            workspaceId: 'ws-1',
            pages: [
              {
                channel: 'FACEBOOK',
                externalAccountId: 'page-1',
                displayName: 'Facebook Page',
              },
            ],
          },
          'ws-1',
          undefined,
          req,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows STAFF to sync Zalo channel', async () => {
      const req = {
        workspace: { id: 'ws-1', role: WorkspaceRole.STAFF },
      };
      mockChannelManager.getChannelById.mockResolvedValue({
        id: 'zalo-ch-1',
        channel: Channel.ZALO,
        workspaceId: 'ws-1',
      });

      const res = await controller.syncChannel('zalo-ch-1', 'ws-1', undefined, req);
      expect(res.syncedCount).toBe(5);
      expect(mockChannelManager.getChannelById).toHaveBeenCalledWith('zalo-ch-1', 'ws-1');
      expect(mockChannelManager.syncChannel).toHaveBeenCalledWith('zalo-ch-1', 'ws-1');
    });

    it('blocks STAFF from syncing non-Zalo channel (e.g. FACEBOOK)', async () => {
      const req = {
        workspace: { id: 'ws-1', role: WorkspaceRole.STAFF },
      };
      mockChannelManager.getChannelById.mockResolvedValue({
        id: 'fb-ch-1',
        channel: Channel.FACEBOOK,
        workspaceId: 'ws-1',
      });

      await expect(
        controller.syncChannel('fb-ch-1', 'ws-1', undefined, req),
      ).rejects.toThrow(ForbiddenException);
      expect(mockChannelManager.syncChannel).not.toHaveBeenCalled();
    });
  });

  describe('Handover Security for STAFF', () => {
    it('allows STAFF to handover their own assigned conversation', async () => {
      const mockPrisma = {
        conversation: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'conv-1',
            workspaceId: 'ws-1',
            assignedMemberId: 'member-staff-1',
            assignedMember: { userId: 'staff-user-1' },
          }),
        },
        workspaceMember: {
          findFirst: vi.fn().mockResolvedValue({ id: 'target-member-2' }),
        },
        leadQueueEntry: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        $transaction: vi.fn().mockImplementation(async (cb) => {
          return cb({
            conversation: {
              findFirst: vi.fn().mockResolvedValue({
                id: 'conv-1',
                workspaceId: 'ws-1',
                assignedMemberId: 'member-staff-1',
              }),
              update: vi.fn().mockResolvedValue({}),
            },
            workspaceMember: {
              findFirst: vi.fn().mockResolvedValue({ id: 'target-member-2' }),
            },
            leadQueueEntry: {
              updateMany: vi.fn().mockResolvedValue({ count: 1 }),
            },
          });
        }),
      } as any;

      const mockSupport = {
        hasWorkspaceManagementPermission: vi.fn().mockResolvedValue(false),
        isOverCapacity: vi.fn().mockResolvedValue(false),
      } as any;

      const mockShiftService = {
        markCurrentShiftUsage: vi.fn().mockResolvedValue(undefined),
      } as any;

      const mockAudit = {
        recordBusinessEvent: vi.fn().mockResolvedValue(undefined),
      } as any;

      const { executeSingleHandover } = await import(
        '../../src/modules/lead-routing/application/handover/operations/handover-single.js'
      );

      const res = await executeSingleHandover(
        mockPrisma,
        mockAudit,
        mockSupport,
        mockShiftService,
        {} as any,
        undefined,
        'ws-1',
        'staff-user-1', // actorId is the assigned user
        'conv-1',
        'target-member-2',
      );

      expect(res.success).toBe(true);
    });

    it('blocks STAFF from handing over a conversation assigned to someone else', async () => {
      const mockPrisma = {
        conversation: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'conv-1',
            workspaceId: 'ws-1',
            assignedMemberId: 'other-member',
            assignedMember: { userId: 'other-user' },
          }),
        },
        workspaceMember: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      } as any;

      const mockSupport = {
        hasWorkspaceManagementPermission: vi.fn().mockResolvedValue(false),
        assertMemberManager: vi.fn().mockRejectedValue(new ForbiddenException()),
      } as any;

      const { executeSingleHandover } = await import(
        '../../src/modules/lead-routing/application/handover/operations/handover-single.js'
      );

      await expect(
        executeSingleHandover(
          mockPrisma,
          {} as any,
          mockSupport,
          {} as any,
          {} as any,
          undefined,
          'ws-1',
          'staff-attacker-user', // actorId is NOT the assigned user
          'conv-1',
          'target-member-2',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
