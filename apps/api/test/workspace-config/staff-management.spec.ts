import { describe, it, expect, beforeEach } from 'vitest';
import { StaffManagementService } from '../../src/modules/workspace-config/index.js';

function createMockPrisma() {
  const users = new Map<string, any>();
  const workspaces = new Map<string, any>();
  const members = new Map<string, any>();
  const notifications = new Map<string, any>();

  return {
    user: {
      findUnique: async ({ where, include }: any) => {
        let u: any = null;
        if (where.id) u = users.get(where.id) || null;
        else if (where.email) {
          for (const user of users.values()) {
            if (user.email === where.email) {
              u = user;
              break;
            }
          }
        } else if (where.phoneNumber) {
          for (const user of users.values()) {
            if (user.phoneNumber === where.phoneNumber) {
              u = user;
              break;
            }
          }
        }
        if (u && include?.memberships) {
          const uMembers = Array.from(members.values()).filter((m) => m.userId === u.id);
          return { ...u, memberships: uMembers };
        }
        return u;
      },
      findFirst: async ({ where }: any) => {
        const all = Array.from(users.values());
        if (!where) return all[0] || null;
        if (where.email) {
          return all.find((u) => u.email === where.email) || null;
        }
        if (where.phoneNumber) {
          return all.find((u) => u.phoneNumber === where.phoneNumber) || null;
        }
        if (where.OR) {
          return all.find((u) => {
            for (const cond of where.OR) {
              if (cond.email && u.email === cond.email) return true;
              if (cond.phoneNumber && u.phoneNumber === cond.phoneNumber) return true;
            }
            return false;
          }) || null;
        }
        return null;
      },
      findMany: async ({ where }: any) => {
        const all = Array.from(users.values());
        if (!where) return all;
        if (where.OR) {
          return all.filter((u) => {
            for (const cond of where.OR) {
              if (cond.id && u.id === cond.id) return true;
              if (cond.memberships?.some) {
                const wsId = cond.memberships.some.workspaceId;
                const hasMember = Array.from(members.values()).some(
                  (m) => m.workspaceId === wsId && m.userId === u.id && m.isActive
                );
                if (hasMember) return true;
              }
            }
            return false;
          });
        }
        return all;
      },
      create: async ({ data }: any) => {
        const id = data.id || `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const user = {
          id,
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
          memberships: [],
          ...data,
        };
        users.set(id, user);
        return user;
      },
      update: async ({ where, data }: any) => {
        const existing = users.get(where.id);
        if (!existing) throw new Error('Not found');
        const updated = { ...existing, ...data, updatedAt: new Date() };
        users.set(where.id, updated);
        return updated;
      },
      delete: async ({ where }: any) => {
        users.delete(where.id);
        return {};
      },
    },
    workspace: {
      findFirst: async ({ where }: any) => {
        for (const ws of workspaces.values()) {
          if (where.ownerId && ws.ownerId === where.ownerId) return ws;
        }
        return null;
      },
      findUnique: async ({ where }: any) => workspaces.get(where.id) || null,
      create: async ({ data }: any) => {
        const id = data.id || `ws-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const ws = { id, createdAt: new Date(), ...data };
        workspaces.set(id, ws);
        return ws;
      },
      update: async ({ where, data }: any) => {
        const ws = workspaces.get(where.id);
        const updated = { ...ws, ...data };
        workspaces.set(where.id, updated);
        return updated;
      },
    },
    workspaceMember: {
      create: async ({ data }: any) => {
        const key = `${data.workspaceId}_${data.userId}`;
        const member = { id: `wm-${Date.now()}`, ...data };
        members.set(key, member);
        return member;
      },
      findUnique: async ({ where }: any) => {
        const key = `${where.workspaceId_userId.workspaceId}_${where.workspaceId_userId.userId}`;
        return members.get(key) || null;
      },
      findFirst: async ({ where }: any) => {
        for (const m of members.values()) {
          if (where.workspaceId && m.workspaceId !== where.workspaceId) continue;
          if (where.userId && m.userId !== where.userId) continue;
          if (where.role && m.role !== where.role) continue;
          if (where.status && m.status !== where.status) continue;
          if (where.isActive !== undefined && m.isActive !== where.isActive) continue;
          if (where.OR) {
            const matchesOR = where.OR.some((cond: any) => {
              if (cond.id && m.id === cond.id) return true;
              if (cond.userId && m.userId === cond.userId) return true;
              return false;
            });
            if (!matchesOR) continue;
          }
          return m;
        }
        return null;
      },
      findMany: async ({ where }: any) => {
        return Array.from(members.values()).filter((m) => m.workspaceId === where.workspaceId && m.isActive);
      },
      upsert: async ({ where, create, update }: any) => {
        const key = `${where.workspaceId_userId.workspaceId}_${where.workspaceId_userId.userId}`;
        const existing = members.get(key);
        const saved = existing ? { ...existing, ...update } : { id: `wm-${Date.now()}`, ...create };
        members.set(key, saved);
        return saved;
      },
      update: async ({ where, data }: any) => {
        for (const [k, m] of members.entries()) {
          if (m.id === where.id) {
            const updated = { ...m, ...data };
            members.set(k, updated);
            return updated;
          }
        }
        return null;
      },
      delete: async ({ where }: any) => {
        if (where?.workspaceId_userId) {
          const key = `${where.workspaceId_userId.workspaceId}_${where.workspaceId_userId.userId}`;
          const m = members.get(key);
          members.delete(key);
          return m || null;
        }
        for (const [k, m] of members.entries()) {
          if (m.id === where.id) {
            members.delete(k);
            return m;
          }
        }
        return null;
      },
      updateMany: async ({ where, data }: any) => {
        for (const [k, m] of members.entries()) {
          if (m.workspaceId === where.workspaceId && m.userId === where.userId) {
            members.set(k, { ...m, ...data });
          }
        }
        return { count: 1 };
      },
      deleteMany: async ({ where }: any) => {
        for (const [k, m] of members.entries()) {
          if (m.workspaceId === where.workspaceId && m.userId === where.userId) {
            members.delete(k);
          }
        }
        return { count: 1 };
      },
      count: async ({ where }: any) => {
        return Array.from(members.values()).filter((m) => m.userId === where.userId).length;
      },
    },
    notification: {
      create: async ({ data }: any) => {
        const id = `notif-${Date.now()}`;
        const notif = { id, isRead: false, createdAt: new Date(), ...data };
        notifications.set(id, notif);
        return notif;
      },
      findMany: async ({ where }: any) => {
        return Array.from(notifications.values()).filter((n) => {
          if (where?.userId && n.userId !== where.userId) return false;
          if (where?.workspaceId && n.workspaceId !== where.workspaceId) return false;
          return true;
        });
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const [k, n] of notifications.entries()) {
          if (where.workspaceId && n.workspaceId !== where.workspaceId) continue;
          if (where.userId && n.userId !== where.userId) continue;
          if (where.type && n.type !== where.type) continue;
          notifications.set(k, { ...n, ...data });
          count++;
        }
        return { count };
      },
      deleteMany: async ({ where }: any) => {
        let count = 0;
        for (const [k, n] of notifications.entries()) {
          if (where.workspaceId && n.workspaceId !== where.workspaceId) continue;
          if (where.userId && n.userId !== where.userId) continue;
          if (where.type && n.type !== where.type) continue;
          notifications.delete(k);
          count++;
        }
        return { count };
      },
    },
    refreshToken: {
      deleteMany: async () => ({ count: 0 }),
    },
  };
}

describe('StaffManagementService (Owner-Staff Relationship & RBAC Management)', () => {
  let service: StaffManagementService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new StaffManagementService(mockPrisma);
  });

  it('should allow Owner to create staff belonging to ownerId', async () => {
    const ownerId = 'c0000000-0000-0000-0000-000000000001';
    await mockPrisma.user.create({
      data: { id: ownerId, email: 'owner1@cusc.com', fullName: 'Chủ sở hữu 1' },
    });
    await mockPrisma.workspace.create({
      data: { id: 'ws-owner-1', ownerId, name: 'Workspace 1', isActive: true },
    });
    await mockPrisma.user.create({
      data: { email: 'tuvan1@cusc.com', fullName: 'Trần Văn Tư Vấn' },
    });

    const newStaff = await service.createStaff(ownerId, {
      email: 'tuvan1@cusc.com',
      fullName: 'Trần Văn Tư Vấn',
      password: 'Password123!',
      role: 'STAFF',
    });

    expect(newStaff.email).toBe('tuvan1@cusc.com');
    expect(newStaff.fullName).toBe('Trần Văn Tư Vấn');
    expect(newStaff.status).toBe('ACTIVE');
    expect(newStaff.ownerId).toBe(ownerId);
  });

  it('should list all staff belonging to the owner', async () => {
    const ownerId = 'c0000000-0000-0000-0000-000000000002';
    await mockPrisma.user.create({
      data: { id: ownerId, email: 'owner2@cusc.com', fullName: 'Chủ sở hữu 2' },
    });
    await mockPrisma.workspace.create({
      data: { id: 'ws-owner-2', ownerId, name: 'Workspace 2', isActive: true },
    });
    await mockPrisma.user.create({
      data: { email: 'staffa@cusc.com', fullName: 'Nhân viên A' },
    });
    await mockPrisma.user.create({
      data: { email: 'staffb@cusc.com', fullName: 'Nhân viên B' },
    });

    await service.createStaff(ownerId, {
      email: 'staffa@cusc.com',
      fullName: 'Nhân viên A',
      role: 'STAFF',
    });
    await service.createStaff(ownerId, {
      email: 'staffb@cusc.com',
      fullName: 'Nhân viên B',
      role: 'STAFF',
    });

    const list = await service.getStaffList(ownerId);
    expect(list.length).toBe(3); // Owner + 2 staff
    expect(list.some((s) => s.email === 'staffa@cusc.com')).toBe(true);
    expect(list.some((s) => s.email === 'staffb@cusc.com')).toBe(true);
  });

  it('should allow Owner to remove staff from workspace without touching user in User table', async () => {
    const ownerId = 'c0000000-0000-0000-0000-000000000005';
    await mockPrisma.user.create({
      data: { id: ownerId, email: 'owner5@cusc.com', fullName: 'Chủ sở hữu 5' },
    });
    await mockPrisma.workspace.create({
      data: { id: 'ws-owner-5', ownerId, name: 'Workspace 5', isActive: true },
    });
    const staffUser = await mockPrisma.user.create({
      data: { email: 'staff_del@cusc.com', fullName: 'Nhân viên cần xóa' },
    });

    const created = await service.createStaff(ownerId, {
      email: 'staff_del@cusc.com',
      fullName: 'Nhân viên cần xóa',
      role: 'STAFF',
    });

    const res = await service.removeStaff(ownerId, created.id);
    expect(res.success).toBe(true);

    // Thành viên bị xóa khỏi danh sách Workspace
    const list = await service.getStaffList(ownerId);
    expect(list.some((s) => s.id === created.id)).toBe(false);

    // BẢO MẬT: Tài khoản User vẫn tồn tại và không bị xóa hay khóa trong bảng User
    const userInDb = await mockPrisma.user.findUnique({ where: { id: staffUser.id } });
    expect(userInDb).not.toBeNull();
    expect(userInDb.status).toBe('ACTIVE');
  });

  it('should not allow removing the last Owner of a workspace', async () => {
    const ownerId = 'c0000000-0000-0000-0000-000000000006';
    await mockPrisma.user.create({
      data: { id: ownerId, email: 'sole_owner@cusc.com', fullName: 'Chủ sở hữu duy nhất' },
    });

    // Tạo workspace cho owner
    await mockPrisma.workspace.create({
      data: { id: 'ws-owner-6', ownerId, name: 'WS 6' },
    });

    await expect(service.removeStaff(ownerId, ownerId, 'ws-owner-6')).rejects.toThrow(
      'Không thể rời hoặc xóa Chủ sở hữu. Không gian làm việc phải có ít nhất 1 Chủ sở hữu'
    );
  });

  it('should reject invitation if email does not exist in DB', async () => {
    const mockPrisma = {
      user: {
        findUnique: async () => null,
      },
      workspace: {
        findFirst: async () => ({ id: 'ws-123', ownerId: 'c0000000-0000-0000-0000-000000000123' }),
      },
    } as any;

    const prismaService = new StaffManagementService(mockPrisma);
    await expect(
      prismaService.createStaff('c0000000-0000-0000-0000-000000000123', {
        email: 'not_exist@gmail.com',
        fullName: 'Unknown User',
        role: 'STAFF',
      })
    ).rejects.toThrow('chưa tồn tại trong hệ thống');
  });

  it('should link member if email already exists in DB', async () => {
    const mockExisting = {
      id: 'c0000000-0000-0000-0000-000000000999',
      email: 'exist@gmail.com',
      fullName: 'User Da Co',
      role: 'OWNER',
      status: 'ACTIVE',
      ownerId: null,
      lockedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let upsertMemberCalled = false;
    const mockPrisma = {
      user: {
        findUnique: async (args: any) => {
          if (args.where.id === 'c0000000-0000-0000-0000-000000000123') {
            return { id: 'c0000000-0000-0000-0000-000000000123', role: 'OWNER', fullName: 'Chủ Doanh Nghiệp' };
          }
          if (args.where.email === 'exist@gmail.com') {
            return mockExisting;
          }
          return null;
        },
        update: async (args: any) => ({ ...mockExisting, ...args.data }),
      },
      workspace: {
        findFirst: async () => ({ id: 'ws-123', ownerId: 'c0000000-0000-0000-0000-000000000123' }),
      },
      workspaceMember: {
        findUnique: async () => null,
        upsert: async () => {
          upsertMemberCalled = true;
          return {};
        },
      },
    } as any;

    const prismaService = new StaffManagementService(mockPrisma);
    const result = await prismaService.createStaff('c0000000-0000-0000-0000-000000000123', {
      email: 'exist@gmail.com',
      fullName: 'User Da Co',
      role: 'STAFF',
    });

    expect(result.email).toBe('exist@gmail.com');
    expect(upsertMemberCalled).toBe(true);
    expect(result.role).toBe('STAFF');
  });

  it('should allow Owner to invite staff using only email (without fullName)', async () => {
    const ownerId = 'c0000000-0000-0000-0000-000000000001';
    await mockPrisma.user.create({
      data: { id: ownerId, email: 'owner-email-only@cusc.com', fullName: 'Chủ sở hữu' },
    });
    await mockPrisma.workspace.create({
      data: { id: 'ws-owner-email', ownerId, name: 'Workspace Email Test', isActive: true },
    });
    await mockPrisma.user.create({
      data: { email: 'staff-only-email@cusc.com', fullName: 'Nhân Viên Sẵn Có' },
    });

    const invited = await service.createStaff(ownerId, {
      identifier: 'staff-only-email@cusc.com',
      role: 'STAFF',
    });

    expect(invited.email).toBe('staff-only-email@cusc.com');
    expect(invited.fullName).toBe('Nhân Viên Sẵn Có');
    expect(invited.role).toBe('STAFF');
  });

  it('should allow Owner to invite staff using only phone number', async () => {
    const ownerId = 'c0000000-0000-0000-0000-000000000001';
    await mockPrisma.user.create({
      data: { id: ownerId, email: 'owner-phone@cusc.com', fullName: 'Chủ sở hữu Phone' },
    });
    await mockPrisma.workspace.create({
      data: { id: 'ws-owner-phone', ownerId, name: 'Workspace Phone Test', isActive: true },
    });
    await mockPrisma.user.create({
      data: { email: 'staff-phone@cusc.com', phoneNumber: '0901234567', fullName: 'Nhân Viên Số ĐT' },
    });

    // Mời qua SĐT có định dạng dấu chấm
    const invited = await service.createStaff(ownerId, {
      identifier: '0901.234.567',
      role: 'STAFF',
    });

    expect(invited.email).toBe('staff-phone@cusc.com');
    expect(invited.phoneNumber).toBe('0901234567');
    expect(invited.fullName).toBe('Nhân Viên Số ĐT');
    expect(invited.role).toBe('STAFF');
  });

  it('should reject invite when role is OWNER or MANAGER', async () => {
    const ownerId = 'c0000000-0000-0000-0000-000000000001';
    await expect(
      service.createStaff(ownerId, { identifier: 'member@cusc.com', role: 'OWNER' } as any)
    ).rejects.toThrow('Chỉ được mời thành viên mới với vai trò Nhân viên tư vấn (STAFF)');
  });

  it('should reject invite when neither email nor phone is provided', async () => {
    const ownerId = 'c0000000-0000-0000-0000-000000000001';
    await expect(service.createStaff(ownerId, { role: 'STAFF' } as any)).rejects.toThrow(
      'Vui lòng nhập Email hoặc Số điện thoại của nhân viên cần mời.'
    );
  });

  it('cho phép nhân viên (STAFF) xem danh sách nhân sự của Workspace nhưng chặn người ngoài', async () => {
    const ownerId = 'c0000000-0000-0000-0000-000000000001';
    const staffId = 'c0000000-0000-0000-0000-000000000009';
    const outsiderId = 'c0000000-0000-0000-0000-000000000088';

    await mockPrisma.user.create({ data: { id: ownerId, email: 'owner_sec@cusc.com' } });
    await mockPrisma.user.create({ data: { id: staffId, email: 'staff_sec@cusc.com' } });
    await mockPrisma.user.create({ data: { id: outsiderId, email: 'outsider@cusc.com' } });

    const ws = await mockPrisma.workspace.create({
      data: { id: 'ws-security-1', ownerId, name: 'Workspace Security', isActive: true },
    });

    await mockPrisma.workspaceMember.create({
      data: { workspaceId: ws.id, userId: staffId, role: 'STAFF', isActive: true },
    });

    // 1. Staff xem danh sách bình thường
    const list = await service.getStaffList(staffId, ws.id);
    expect(list.length).toBeGreaterThan(0);

    // 2. Người ngoài không thuộc Workspace không xem được
    await expect(service.getStaffList(outsiderId, ws.id)).rejects.toThrow(
      'Bạn không thuộc Không gian làm việc này.'
    );
  });

  it('không cho phép tự thêm chính mình vào Workspace', async () => {
    const ownerId = 'c0000000-0000-0000-0000-000000000001';
    await mockPrisma.user.create({
      data: { id: ownerId, email: 'self_owner@cusc.com', fullName: 'Chủ WS Self' },
    });
    await mockPrisma.workspace.create({
      data: { id: 'ws-self', ownerId, name: 'Workspace Self Test', isActive: true },
    });

    await expect(
      service.createStaff(ownerId, { identifier: 'self_owner@cusc.com', role: 'STAFF' })
    ).rejects.toThrow('Không thể tự thêm chính mình vào Không gian làm việc.');
  });

  it('lấy đúng current user và role trong Workspace thông qua getCurrentUserAndRole', async () => {
    const ownerId = 'c0000000-0000-0000-0000-000000000001';
    const staffId = 'c0000000-0000-0000-0000-000000000002';

    await mockPrisma.user.create({ data: { id: ownerId, email: 'cur_owner@cusc.com', fullName: 'Chủ WS Current' } });
    await mockPrisma.user.create({ data: { id: staffId, email: 'cur_staff@cusc.com', fullName: 'Nhân viên Current' } });

    const ws = await mockPrisma.workspace.create({
      data: { id: 'ws-cur-test', ownerId, name: 'Workspace Current Test', isActive: true },
    });

    await mockPrisma.workspaceMember.create({
      data: { workspaceId: ws.id, userId: staffId, role: 'STAFF', isActive: true },
    });

    const ownerInfo = await service.getCurrentUserAndRole(ownerId, ws);
    expect(ownerInfo.currentUser.id).toBe(ownerId);
    expect(ownerInfo.role).toBe('OWNER');

    const staffInfo = await service.getCurrentUserAndRole(staffId, ws);
    expect(staffInfo.currentUser.id).toBe(staffId);
    expect(staffInfo.role).toBe('STAFF');
  });

  it('không cho phép nhân viên (STAFF) mời thành viên khác vào Workspace', async () => {
    const ownerId = 'c0000000-0000-0000-0000-000000000001';
    const staffId = 'c0000000-0000-0000-0000-000000000002';

    await mockPrisma.user.create({ data: { id: ownerId, email: 'owner_sec2@cusc.com' } });
    await mockPrisma.user.create({ data: { id: staffId, email: 'staff_sec2@cusc.com' } });
    await mockPrisma.user.create({ data: { email: 'new_member@cusc.com' } });

    const ws = await mockPrisma.workspace.create({
      data: { id: 'ws-security-invite', ownerId, name: 'WS Security Invite', isActive: true },
    });

    await mockPrisma.workspaceMember.create({
      data: { workspaceId: ws.id, userId: staffId, role: 'STAFF', isActive: true },
    });

    await expect(
      service.createStaff(staffId, { identifier: 'new_member@cusc.com', role: 'STAFF' }, ws.id)
    ).rejects.toThrow(/quyền mời thành viên|Chỉ Chủ sở hữu/);
  });

  describe('Quy trình Mời Nhân Sự & Thông Báo (Invitation & Notification Lifecycle)', () => {
    it('lưu bản ghi WorkspaceMember ở trạng thái PENDING và tạo Notification khi mời thành viên', async () => {
      const ownerId = 'c0000000-0000-0000-0000-000000000001';
      const inviteeId = 'c0000000-0000-0000-0000-000000000010';

      await mockPrisma.user.create({
        data: { id: ownerId, email: 'owner_inv@cusc.com', fullName: 'Chủ sở hữu Test' },
      });
      await mockPrisma.user.create({
        data: { id: inviteeId, email: 'invitee@cusc.com', fullName: 'Nhân viên Được Mời' },
      });

      const ws = await mockPrisma.workspace.create({
        data: { id: 'ws-inv-01', ownerId, name: 'Workspace Mời' },
      });

      const res = await service.createStaff(ownerId, {
        identifier: 'invitee@cusc.com',
        role: 'STAFF',
      }, ws.id);

      expect(res.email).toBe('invitee@cusc.com');
      expect(res.memberStatus).toBe('PENDING');

      // Kiểm tra notification đã được tạo
      const notifs = await mockPrisma.notification.findMany({ where: { userId: inviteeId } });
      expect(notifs.length).toBe(1);
      expect(notifs[0].type).toBe('WORKSPACE_INVITATION');
      expect(notifs[0].actionUrl).toContain('/workspace/invited/');
    });

    it('cho phép nhân viên được mời chấp nhận lời mời (Accept) để chuyển sang ACTIVE', async () => {
      const ownerId = 'c0000000-0000-0000-0000-000000000001';
      const inviteeId = 'c0000000-0000-0000-0000-000000000011';

      await mockPrisma.user.create({
        data: { id: ownerId, email: 'owner_acc@cusc.com', fullName: 'Chủ sở hữu' },
      });
      await mockPrisma.user.create({
        data: { id: inviteeId, email: 'acc_staff@cusc.com', fullName: 'Nhân viên Accept' },
      });

      const ws = await mockPrisma.workspace.create({
        data: { id: 'ws-acc-01', ownerId, name: 'Workspace Accept' },
      });

      // Mời
      await service.createStaff(ownerId, {
        identifier: 'acc_staff@cusc.com',
        role: 'STAFF',
      }, ws.id);

      // Chấp nhận lời mời
      const acceptRes = await service.acceptInvitation(inviteeId, ws.id);
      expect(acceptRes.success).toBe(true);

      // Kiểm tra thành viên đã chuyển sang ACTIVE
      const member = await mockPrisma.workspaceMember.findFirst({
        where: { workspaceId: ws.id, userId: inviteeId, isActive: true },
      });
      expect(member.status).toBe('ACTIVE');
      expect(member.isActive).toBe(true);
      expect(member.joinedAt).toBeDefined();

      // Notification được cập nhật isRead
      const notifs = await mockPrisma.notification.findMany({ where: { userId: inviteeId } });
      expect(notifs[0].isRead).toBe(true);
    });

    it('cho phép nhân viên từ chối lời mời (Decline) để chuyển sang DECLINED', async () => {
      const ownerId = 'c0000000-0000-0000-0000-000000000001';
      const inviteeId = 'c0000000-0000-0000-0000-000000000012';

      await mockPrisma.user.create({
        data: { id: ownerId, email: 'owner_dec@cusc.com' },
      });
      await mockPrisma.user.create({
        data: { id: inviteeId, email: 'dec_staff@cusc.com' },
      });

      const ws = await mockPrisma.workspace.create({
        data: { id: 'ws-dec-01', ownerId, name: 'Workspace Decline' },
      });

      await service.createStaff(ownerId, {
        identifier: 'dec_staff@cusc.com',
        role: 'STAFF',
      }, ws.id);

      const declineRes = await service.declineInvitation(inviteeId, ws.id);
      expect(declineRes.success).toBe(true);

      const member = await mockPrisma.workspaceMember.findFirst({
        where: { workspaceId: ws.id, userId: inviteeId },
      });
      expect(member.status).toBe('DECLINED');
      expect(member.isActive).toBe(false);
    });

    it('cho phép Chủ sở hữu hủy lời mời đã gửi (Cancel Invitation)', async () => {
      const ownerId = 'c0000000-0000-0000-0000-000000000001';
      const inviteeId = 'c0000000-0000-0000-0000-000000000013';

      await mockPrisma.user.create({
        data: { id: ownerId, email: 'owner_can@cusc.com' },
      });
      await mockPrisma.user.create({
        data: { id: inviteeId, email: 'can_staff@cusc.com' },
      });

      const ws = await mockPrisma.workspace.create({
        data: { id: 'ws-can-01', ownerId, name: 'Workspace Cancel' },
      });

      await service.createStaff(ownerId, {
        identifier: 'can_staff@cusc.com',
        role: 'STAFF',
      }, ws.id);

      const cancelRes = await service.cancelInvitation(ownerId, inviteeId, ws.id);
      expect(cancelRes.success).toBe(true);

      const member = await mockPrisma.workspaceMember.findFirst({
        where: { workspaceId: ws.id, userId: inviteeId, isActive: true },
      });
      expect(member).toBeNull();
    });
  });
});
