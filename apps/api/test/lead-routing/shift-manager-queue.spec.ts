import { describe, expect, it, vi } from 'vitest';
import { WorkspaceMemberStatus } from '@prisma/client';
import { executeSingleHandover } from '../../src/modules/lead-routing/application/handover/operations/handover-single.js';
import {
  executeEscalateWaitingLeads,
  notifyQueueRecipients,
} from '../../src/modules/lead-routing/application/queue/operations/queue-escalation.js';

describe('Shift manager lead queue permissions and notifications', () => {
  it('allows a shift manager to assign an unassigned queued conversation', async () => {
    const transaction = {
      conversation: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'conversation-1',
          workspaceId: 'workspace-1',
          assignedMemberId: null,
          customerId: null,
        }),
        update: vi.fn().mockResolvedValue({
          workspaceId: 'workspace-1',
          customerId: null,
        }),
      },
      workspaceMember: {
        findFirst: vi.fn().mockResolvedValue({ id: 'member-target' }),
      },
      leadQueueEntry: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = {
      conversation: {
        findFirst: vi.fn().mockResolvedValue({
          assignedMemberId: null,
          assignedMember: null,
        }),
      },
      workspaceMember: {
        findFirst: vi.fn().mockResolvedValue({ id: 'member-manager' }),
      },
      $transaction: vi.fn(async (callback) => callback(transaction)),
    } as any;
    const support = {
      hasWorkspaceManagementPermission: vi.fn().mockResolvedValue(false),
      isOverCapacity: vi.fn().mockResolvedValue(false),
    } as any;
    const shiftService = {
      markCurrentShiftUsage: vi.fn().mockResolvedValue(undefined),
    } as any;
    const audit = {
      recordBusinessEvent: vi.fn().mockResolvedValue(undefined),
    } as any;
    const queueService = {
      processAndNotifyQueue: vi.fn().mockResolvedValue(undefined),
    } as any;
    const realtime = { emit: vi.fn() } as any;

    const result = await executeSingleHandover(
      prisma,
      audit,
      support,
      shiftService,
      queueService,
      realtime,
      'workspace-1',
      'shift-manager-user',
      'conversation-1',
      'member-target',
    );

    expect(result).toEqual({
      success: true,
      queued: false,
      overCapacity: false,
    });
    expect(prisma.workspaceMember.findFirst).toHaveBeenCalledWith({
      where: {
        workspaceId: 'workspace-1',
        userId: 'shift-manager-user',
        status: WorkspaceMemberStatus.ACTIVE,
        isActive: true,
        shiftAssignments: { some: { isShiftManager: true } },
      },
      select: { id: true },
    });
    expect(transaction.conversation.update).toHaveBeenCalledWith({
      where: { id: 'conversation-1' },
      data: { assignedMemberId: 'member-target' },
      select: { workspaceId: true, customerId: true },
    });
    expect(queueService.processAndNotifyQueue).not.toHaveBeenCalled();
    expect(realtime.emit).toHaveBeenCalledWith(
      'conversation:assigned',
      { conversationId: 'conversation-1', ...result },
      'workspace-1',
    );
  });

  it('notifies shift managers assigned to shifts active at escalation time', async () => {
    const notifications = { create: vi.fn().mockResolvedValue(undefined) } as any;
    const support = {
      shiftIsActive: vi.fn((shift: { activeNow: boolean }) => shift.activeNow),
    } as any;
    const prisma = {
      workspace: {
        findUnique: vi.fn().mockResolvedValue({ ownerId: 'owner-user' }),
      },
      workShiftMember: {
        findMany: vi.fn().mockResolvedValue([
          {
            shift: { activeNow: true },
            workspaceMember: { userId: 'active-shift-manager' },
          },
          {
            shift: { activeNow: false },
            workspaceMember: { userId: 'off-shift-manager' },
          },
        ]),
      },
      leadQueueEntry: {
        findUnique: vi.fn().mockResolvedValue({ priority: 0 }),
      },
    } as any;

    await notifyQueueRecipients(
      prisma,
      notifications,
      support,
      { warn: vi.fn() } as any,
      'workspace-1',
      'conversation-1',
      1,
    );

    expect(notifications.create).toHaveBeenCalledTimes(2);
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'active-shift-manager',
        type: 'CONVERSATION_ALERT',
        metadata: { conversationId: 'conversation-1', queueLevel: 1 },
      }),
    );
    expect(notifications.create).not.toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'off-shift-manager' }),
    );
  });

  it('escalates an aged waiting lead and dispatches its queue alert', async () => {
    const entry = {
      id: 'queue-entry-1',
      workspaceId: 'workspace-1',
      conversationId: 'conversation-1',
      queuedAt: new Date(Date.now() - 6 * 60_000),
      priority: 0,
      escalationLevel: 0,
    };
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      leadQueueEntry: {
        findMany: vi
          .fn()
          .mockResolvedValueOnce([{ workspaceId: 'workspace-1' }])
          .mockResolvedValueOnce([entry]),
      },
      $transaction: vi.fn(async (callback) =>
        callback({ leadQueueEntry: { updateMany } }),
      ),
    } as any;
    const processWaitingQueue = vi.fn().mockResolvedValue(undefined);
    const notifyQueue = vi.fn().mockResolvedValue(undefined);
    const audit = { recordBusinessEvent: vi.fn().mockResolvedValue(undefined) } as any;

    await executeEscalateWaitingLeads(
      prisma,
      audit,
      { error: vi.fn() } as any,
      processWaitingQueue,
      notifyQueue,
    );

    expect(processWaitingQueue).toHaveBeenCalledWith('workspace-1');
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: 'queue-entry-1',
        status: 'WAITING',
        escalationLevel: 0,
      },
      data: expect.objectContaining({ escalationLevel: 1 }),
    });
    expect(notifyQueue).toHaveBeenCalledWith(
      'workspace-1',
      'conversation-1',
      1,
    );
  });
});
