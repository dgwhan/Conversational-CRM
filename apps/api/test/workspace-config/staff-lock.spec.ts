import { describe, it, expect, beforeEach } from 'vitest';
import { StaffManagementService } from '../../src/modules/workspace-config/index.js';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('Staff Lock/Unlock Management (toggleStaffLock)', () => {
  let service: StaffManagementService;
  let mockPrisma: any;

  beforeEach(() => {
    const users = new Map<string, any>();
    const workspaces = new Map<string, any>();
    const members = new Map<string, any>();
    const auditLogs: any[] = [];

    mockPrisma = {
      workspace: {
        findUnique: async ({ where }: any) => workspaces.get(where.id) || null,
        findFirst: async ({ where }: any) => {
          for (const ws of workspaces.values()) {
            if (where.id && ws.id === where.id) return ws;
            if (where.ownerId && ws.ownerId === where.ownerId) return ws;
          }
          return null;
        },
      },
      user: {
        findUnique: async ({ where }: any) => users.get(where.id) || null,
      },
      workspaceMember: {
        findUnique: async ({ where }: any) => {
          const key = `${where.workspaceId_userId.workspaceId}:${where.workspaceId_userId.userId}`;
          const m = members.get(key);
          if (!m) return null;
          return {
            ...m,
            user: users.get(m.userId) || { id: m.userId, fullName: 'Staff User', email: 'staff@cusc.vn' },
          };
        },
        findFirst: async ({ where }: any) => {
          for (const m of members.values()) {
            if (where.workspaceId === m.workspaceId && where.userId === m.userId) {
              return {
                ...m,
                user: users.get(m.userId) || { id: m.userId, fullName: 'Staff User', email: 'staff@cusc.vn' },
              };
            }
          }
          return null;
        },
        update: async ({ where, data }: any) => {
          for (const [k, m] of members.entries()) {
            if (m.id === where.id) {
              Object.assign(m, data);
              return m;
            }
          }
          throw new Error('Member not found');
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

    mockPrisma._data.users.set('owner-1', { id: 'owner-1', fullName: 'Owner User', email: 'owner@cusc.vn' });
    mockPrisma._data.users.set('manager-1', { id: 'manager-1', fullName: 'Manager User', email: 'manager@cusc.vn' });
    mockPrisma._data.users.set('staff-1', { id: 'staff-1', fullName: 'Staff One', email: 'staff1@cusc.vn' });

    mockPrisma._data.workspaces.set('ws-1', {
      id: 'ws-1',
      name: 'Workspace One',
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
      assignmentLocked: false,
    });

    mockPrisma._data.members.set('ws-1:manager-1', {
      id: 'mem-1',
      workspaceId: 'ws-1',
      userId: 'manager-1',
      role: 'MANAGER',
      isWorkspaceManager: true,
      status: 'ACTIVE',
      isActive: true,
      assignmentLocked: false,
    });

    mockPrisma._data.members.set('ws-1:staff-1', {
      id: 'mem-2',
      workspaceId: 'ws-1',
      userId: 'staff-1',
      role: 'STAFF',
      isWorkspaceManager: false,
      status: 'ACTIVE',
      isActive: true,
      assignmentLocked: false,
    });

    service = new StaffManagementService(mockPrisma);
  });

  it('Owner khóa tài khoản thành viên thành công (isActive = false, assignmentLocked = true)', async () => {
    const res = await service.toggleStaffLock('owner-1', 'staff-1', true, 'ws-1');

    expect(res.success).toBe(true);
    expect(res.locked).toBe(true);

    const mem = mockPrisma._data.members.get('ws-1:staff-1');
    expect(mem.isActive).toBe(false);
    expect(mem.assignmentLocked).toBe(true);

    expect(mockPrisma._data.auditLogs.length).toBe(1);
    expect(mockPrisma._data.auditLogs[0].action).toBe('STAFF_LOCKED');
  });

  it('Owner mở khóa tài khoản thành viên thành công (isActive = true)', async () => {
    // Khóa trước
    await service.toggleStaffLock('owner-1', 'staff-1', true, 'ws-1');
    // Mở khóa
    const res = await service.toggleStaffLock('owner-1', 'staff-1', false, 'ws-1');

    expect(res.success).toBe(true);
    expect(res.locked).toBe(false);

    const mem = mockPrisma._data.members.get('ws-1:staff-1');
    expect(mem.isActive).toBe(true);

    expect(mockPrisma._data.auditLogs.length).toBe(2);
    expect(mockPrisma._data.auditLogs[1].action).toBe('STAFF_UNLOCKED');
  });

  it('cho phép Manager khóa tài khoản nhân viên tư vấn (STAFF)', async () => {
    const res = await service.toggleStaffLock('manager-1', 'staff-1', true, 'ws-1');
    expect(res.success).toBe(true);
    expect(res.locked).toBe(true);
  });

  it('chặn Staff gọi khóa thành viên (ForbiddenException)', async () => {
    await expect(service.toggleStaffLock('staff-1', 'staff-1', true, 'ws-1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('chặn Manager khóa tài khoản của Manager khác (ForbiddenException)', async () => {
    mockPrisma._data.members.set('ws-1:manager-2', {
      id: 'm-2',
      workspaceId: 'ws-1',
      userId: 'manager-2',
      role: 'MANAGER',
      isWorkspaceManager: true,
      status: 'ACTIVE',
      isActive: true,
      assignmentLocked: false,
      user: { id: 'manager-2', fullName: 'Manager Two', email: 'm2@cusc.com' },
    });
    await expect(service.toggleStaffLock('manager-1', 'manager-2', true, 'ws-1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('chặn khóa tài khoản của chính Chủ sở hữu (BadRequestException)', async () => {
    await expect(service.toggleStaffLock('owner-1', 'owner-1', true, 'ws-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('báo lỗi khi thành viên không tồn tại trong workspace (NotFoundException)', async () => {
    await expect(service.toggleStaffLock('owner-1', 'unknown-user', true, 'ws-1')).rejects.toThrow(
      NotFoundException,
    );
  });
});

