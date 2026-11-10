import { describe, it, expect, beforeEach } from 'vitest';
import { WorkspaceLifecycleService } from '../../src/modules/workspace-config/index.js';

function createMockPrisma() {
  const users = new Map<string, any>();
  const workspaces = new Map<string, any>();
  const configs = new Map<string, any>();
  const members = new Map<string, any>();

  return {
    user: {
      findUnique: async ({ where }: any) => {
        if (where.id) return users.get(where.id) || null;
        if (where.email) {
          for (const u of users.values()) {
            if (u.email === where.email) return u;
          }
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = data.id || `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const user = { id, status: 'ACTIVE', ...data };
        users.set(id, user);
        return user;
      },
    },
    workspace: {
      findUnique: async ({ where, include }: any) => {
        const ws = workspaces.get(where.id);
        if (!ws) return null;
        const res = { ...ws };
        if (include?.owner && ws.ownerId) {
          res.owner = users.get(ws.ownerId) || null;
        }
        if (include?.configuration) {
          for (const cfg of configs.values()) {
            if (cfg.workspaceId === ws.id) {
              res.configuration = cfg;
              break;
            }
          }
        }
        return res;
      },
      findFirst: async ({ where }: any) => {
        for (const ws of workspaces.values()) {
          if (where.ownerId && ws.ownerId === where.ownerId) return ws;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = data.id || `ws-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const ws = { id, createdAt: new Date(), ...data };
        workspaces.set(id, ws);
        return ws;
      },
      update: async ({ where, data, include }: any) => {
        const ws = workspaces.get(where.id);
        if (!ws) throw new Error('Workspace not found');
        const updated = { ...ws, ...data };
        workspaces.set(where.id, updated);
        const res = { ...updated };
        if (include?.owner && updated.ownerId) {
          res.owner = users.get(updated.ownerId) || null;
        }
        if (include?.configuration) {
          for (const cfg of configs.values()) {
            if (cfg.workspaceId === updated.id) {
              res.configuration = cfg;
              break;
            }
          }
        }
        return res;
      },
      delete: async ({ where }: any) => {
        workspaces.delete(where.id);
        return {};
      },
      count: async ({ where }: any) => {
        return Array.from(workspaces.values()).filter((w) => {
          if (where.ownerId && w.ownerId !== where.ownerId) return false;
          if (where.isActive !== undefined && w.isActive !== where.isActive) return false;
          return true;
        }).length;
      },
    },
    workspaceConfiguration: {
      create: async ({ data }: any) => {
        const id = `wc-${Date.now()}`;
        const config = { id, ...data };
        configs.set(id, config);
        return config;
      },
      update: async ({ where, data }: any) => {
        const cfg = configs.get(where.id);
        const updated = { ...cfg, ...data };
        configs.set(where.id, updated);
        return updated;
      },
    },
    workspaceMember: {
      create: async ({ data }: any) => {
        const id = `wm-${Date.now()}`;
        const member = { id, ...data };
        members.set(id, member);
        return member;
      },
      findFirst: async ({ where }: any) => {
        for (const m of members.values()) {
          if (where.workspaceId && m.workspaceId !== where.workspaceId) continue;
          if (where.userId && m.userId !== where.userId) continue;
          if (where.role && m.role !== where.role) continue;
          return m;
        }
        return null;
      },
    },
  };
}

describe('WorkspaceLifecycleService (Creator Ownership & Access Control)', () => {
  let service: WorkspaceLifecycleService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new WorkspaceLifecycleService(mockPrisma as any);
  });

  it('người nào tạo thì người đó trực tiếp làm OWNER của Workspace', async () => {
    const creatorId = 'c0000000-0000-0000-0000-000000000099';
    await mockPrisma.user.create({
      data: {
        id: creatorId,
        email: 'creator@cusc.com',
        fullName: 'Nguyễn Văn Tạo',
      },
    });

    const newWs = await service.createWorkspace(
      {
        name: 'Công ty Cổ phần Mới',
        domain: 'EDUCATION',
      },
      creatorId
    );

    // Bắt buộc người tạo phải là Owner
    expect(newWs.ownerId).toBe(creatorId);
    expect(newWs.role).toBe('OWNER');
    expect(newWs.isOwner).toBe(true);
    expect(newWs.name).toBe('Công ty Cổ phần Mới');

    // Kiểm tra trong DB: workspace.ownerId phải chính là creatorId
    const wsInDb = await mockPrisma.workspace.findUnique({ where: { id: newWs.id } });
    expect(wsInDb.ownerId).toBe(creatorId);

    // Kiểm tra trong DB: workspaceMember phải có role OWNER cho creatorId
    const memberInDb = await mockPrisma.workspaceMember.findFirst({
      where: { workspaceId: newWs.id, userId: creatorId },
    });
    expect(memberInDb).not.toBeNull();
    expect(memberInDb.role).toBe('OWNER');
  });

  it('không cho phép người không phải Owner chỉnh sửa Workspace', async () => {
    const ownerId = 'c0000000-0000-0000-0000-000000000001';
    const strangerId = 'c0000000-0000-0000-0000-000000000002';

    await mockPrisma.user.create({ data: { id: ownerId, email: 'owner@cusc.com' } });
    await mockPrisma.user.create({ data: { id: strangerId, email: 'stranger@cusc.com' } });

    const ws = await mockPrisma.workspace.create({
      data: { id: 'ws-test-1', name: 'WS Test', ownerId, isActive: true },
    });

    await expect(
      service.updateWorkspace(ws.id, { name: 'Hack Name' }, strangerId)
    ).rejects.toThrow('Chỉ Chủ sở hữu mới có quyền chỉnh sửa Không gian làm việc này');
  });

  it('cho phép Owner chỉnh sửa thông tin Workspace của mình', async () => {
    const ownerId = 'c0000000-0000-0000-0000-000000000001';
    await mockPrisma.user.create({ data: { id: ownerId, email: 'owner@cusc.com', fullName: 'Chủ WS' } });

    const ws = await mockPrisma.workspace.create({
      data: { id: 'ws-test-2', name: 'WS Ban Đầu', ownerId, isActive: true },
    });

    const updated = await service.updateWorkspace(ws.id, { name: 'WS Tên Mới' }, ownerId);
    expect(updated.name).toBe('WS Tên Mới');
    expect(updated.isOwner).toBe(true);
  });

  it('không cho phép người không phải Owner xóa Workspace', async () => {
    const ownerId = 'c0000000-0000-0000-0000-000000000001';
    const strangerId = 'c0000000-0000-0000-0000-000000000002';

    await mockPrisma.workspace.create({
      data: { id: 'ws-test-3', name: 'WS Xóa', ownerId, isActive: true },
    });

    await expect(service.deleteWorkspace('ws-test-3', strangerId)).rejects.toThrow(
      'Chỉ Chủ sở hữu mới có quyền xóa Không gian làm việc này'
    );
  });

  it('không cho phép xóa nếu là Workspace duy nhất của Owner', async () => {
    const ownerId = 'c0000000-0000-0000-0000-000000000001';
    await mockPrisma.workspace.create({
      data: { id: 'ws-only-one', name: 'WS Duy Nhất', ownerId, isActive: true },
    });

    await expect(service.deleteWorkspace('ws-only-one', ownerId)).rejects.toThrow(
      'Không thể xóa Không gian làm việc duy nhất của bạn'
    );
  });
});

