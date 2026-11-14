import { describe, it, expect, beforeEach } from 'vitest';
import { WorkspaceLifecycleService } from '../../src/modules/workspace-config/index.js';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('Workspace Ownership Transfer (transferOwnership)', () => {
  let service: WorkspaceLifecycleService;
  let mockPrisma: any;

  beforeEach(() => {
    const users = new Map<string, any>();
    const workspaces = new Map<string, any>();
    const members = new Map<string, any>();
    const auditLogs: any[] = [];

    mockPrisma = {
      workspace: {
        findUnique: async ({ where }: any) => workspaces.get(where.id) || null,
        update: async ({ where, data }: any) => {
          const ws = workspaces.get(where.id);
          if (!ws) throw new Error('Workspace not found');
          Object.assign(ws, data);
          return ws;
        },
      },
      workspaceConfiguration: {
        updateMany: async ({ where, data }: any) => {
          return { count: 1 };
        },
      },
      workspaceMember: {
        findUnique: async ({ where }: any) => {
          const key = `${where.workspaceId_userId.workspaceId}:${where.workspaceId_userId.userId}`;
          const m = members.get(key);
          if (!m) return null;
          return {
            ...m,
            user: users.get(m.userId) || { id: m.userId, fullName: 'Test User', email: 'test@cusc.vn' },
          };
        },
        update: async ({ where, data }: any) => {
          const key = `${where.workspaceId_userId.workspaceId}:${where.workspaceId_userId.userId}`;
          const m = members.get(key);
          if (!m) throw new Error('Member not found');
          Object.assign(m, data);
          return m;
        },
        upsert: async ({ where, update, create }: any) => {
          const key = `${where.workspaceId_userId.workspaceId}:${where.workspaceId_userId.userId}`;
          let m = members.get(key);
          if (m) {
            Object.assign(m, update);
          } else {
            m = { ...create };
            members.set(key, m);
          }
          return m;
        },
      },
      auditLog: {
        create: async ({ data }: any) => {
          auditLogs.push(data);
          return { id: 'audit-1', ...data };
        },
      },
      $transaction: async (fn: any) => fn(mockPrisma),
      _data: { users, workspaces, members, auditLogs },
    };

    // Pre-populate data
    mockPrisma._data.users.set('owner-1', { id: 'owner-1', fullName: 'Current Owner', email: 'owner@cusc.vn' });
    mockPrisma._data.users.set('staff-1', { id: 'staff-1', fullName: 'Staff One', email: 'staff1@cusc.vn' });
    mockPrisma._data.users.set('staff-2', { id: 'staff-2', fullName: 'Staff Two', email: 'staff2@cusc.vn' });

    mockPrisma._data.workspaces.set('ws-1', {
      id: 'ws-1',
      name: 'Workspace Alpha',
      ownerId: 'owner-1',
      isActive: true,
    });

    mockPrisma._data.members.set('ws-1:owner-1', {
      id: 'mem-0',
      workspaceId: 'ws-1',
      userId: 'owner-1',
      role: 'OWNER',
      status: 'ACTIVE',
      isActive: true,
    });

    mockPrisma._data.members.set('ws-1:staff-1', {
      id: 'mem-1',
      workspaceId: 'ws-1',
      userId: 'staff-1',
      role: 'STAFF',
      status: 'ACTIVE',
      isActive: true,
    });

    mockPrisma._data.members.set('ws-1:staff-2', {
      id: 'mem-2',
      workspaceId: 'ws-1',
      userId: 'staff-2',
      role: 'STAFF',
      status: 'PENDING',
      isActive: true,
    });

    service = new WorkspaceLifecycleService(mockPrisma);
  });

  it('chuyển quyền sở hữu thành công từ Owner sang thành viên ACTIVE', async () => {
    const res = await service.transferOwnership('ws-1', 'owner-1', 'staff-1');

    expect(res.success).toBe(true);
    expect(res.newOwnerId).toBe('staff-1');

    const ws = mockPrisma._data.workspaces.get('ws-1');
    expect(ws.ownerId).toBe('staff-1');

    const newOwnerMember = mockPrisma._data.members.get('ws-1:staff-1');
    expect(newOwnerMember.role).toBe('OWNER');

    const oldOwnerMember = mockPrisma._data.members.get('ws-1:owner-1');
    expect(oldOwnerMember.role).toBe('MANAGER');
    expect(oldOwnerMember.isWorkspaceManager).toBe(true);

    expect(mockPrisma._data.auditLogs.length).toBe(1);
    expect(mockPrisma._data.auditLogs[0].action).toBe('WORKSPACE_TRANSFERRED');
  });

  it('chặn người không phải Owner gọi chuyển quyền (ForbiddenException)', async () => {
    await expect(service.transferOwnership('ws-1', 'staff-1', 'owner-1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('chặn chuyển quyền cho chính mình (BadRequestException)', async () => {
    await expect(service.transferOwnership('ws-1', 'owner-1', 'owner-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('chặn chuyển quyền cho thành viên chưa kích hoạt / PENDING (BadRequestException)', async () => {
    await expect(service.transferOwnership('ws-1', 'owner-1', 'staff-2')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('báo lỗi khi workspace không tồn tại (NotFoundException)', async () => {
    await expect(service.transferOwnership('ws-non-existent', 'owner-1', 'staff-1')).rejects.toThrow(
      NotFoundException,
    );
  });
});

