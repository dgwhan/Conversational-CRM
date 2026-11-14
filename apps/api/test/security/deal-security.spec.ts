import { describe, it, expect, beforeEach } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DealService } from '../../src/modules/deals/deal.service.js';
import { DealController } from '../../src/modules/deals/deal.controller.js';
import { WorkspaceRole } from '../../src/contracts/roles.js';

describe('DealSecurity & Staff Authorization Boundaries', () => {
  let service: DealService;
  let controller: DealController;
  let deals: any[];
  let mockPrisma: any;

  beforeEach(() => {
    deals = [
      {
        id: 'c0000000-0000-0000-0000-000000000001',
        title: 'Khóa học Web Fullstack - Staff 1',
        workspaceId: 'c0000000-0000-0000-0000-000000000099',
        assignedMemberId: 'mem-staff-1',
        assignedMember: { userId: 'user-staff-1' },
        stage: 'NEW',
        status: 'OPEN',
      },
      {
        id: 'c0000000-0000-0000-0000-000000000002',
        title: 'Khóa học Thiết kế đồ họa - Staff 2',
        workspaceId: 'c0000000-0000-0000-0000-000000000099',
        assignedMemberId: 'mem-staff-2',
        assignedMember: { userId: 'user-staff-2' },
        stage: 'CONSULTING',
        status: 'OPEN',
      },
    ];

    mockPrisma = {
      workspaceMember: {
        findMany: async ({ where }: any) => {
          if (where.userId === 'user-staff-1') {
            return [{ id: 'mem-staff-1' }];
          }
          if (where.userId === 'user-staff-2') {
            return [{ id: 'mem-staff-2' }];
          }
          return [];
        },
      },
      deal: {
        findMany: async ({ where }: any) => {
          return deals.filter((d) => {
            if (where.workspaceId && d.workspaceId !== where.workspaceId) return false;
            if (where.AND) {
              const andCond = where.AND[0];
              if (andCond?.OR) {
                const orMatch = andCond.OR.some((cond: any) => {
                  if (cond.assignedMember?.userId && d.assignedMember?.userId === cond.assignedMember.userId) return true;
                  if (cond.assignedMemberId?.in && cond.assignedMemberId.in.includes(d.assignedMemberId)) return true;
                  return false;
                });
                if (!orMatch) return false;
              }
            }
            return true;
          });
        },
        count: async () => deals.length,
        findUnique: async ({ where }: any) => {
          return deals.find((d) => d.id === where.id) || null;
        },
        delete: async ({ where }: any) => {
          const idx = deals.findIndex((d) => d.id === where.id);
          if (idx !== -1) deals.splice(idx, 1);
          return { success: true };
        },
      },
    };

    service = new DealService(mockPrisma as any);
    controller = new DealController(service);
  });

  it('STAFF chỉ xem được Deal được phân công cho chính mình', async () => {
    const req = {
      user: { id: 'user-staff-1' },
      workspace: { id: 'c0000000-0000-0000-0000-000000000099', role: WorkspaceRole.STAFF },
    };

    const res = await controller.getDeals(undefined, undefined, req);
    expect(res.items.length).toBe(1);
    expect(res.items[0].id).toBe('c0000000-0000-0000-0000-000000000001');
  });

  it('OWNER xem được toàn bộ Deal trong Workspace', async () => {
    const req = {
      user: { id: 'user-owner' },
      workspace: { id: 'c0000000-0000-0000-0000-000000000099', role: WorkspaceRole.OWNER },
    };

    const res = await controller.getDeals(undefined, undefined, req);
    expect(res.items.length).toBe(2);
  });

  it('STAFF bị chặn (403 Forbidden) khi xem chi tiết Deal của nhân viên khác', async () => {
    const req = {
      user: { id: 'user-staff-1' },
      workspace: { id: 'c0000000-0000-0000-0000-000000000099', role: WorkspaceRole.STAFF },
    };

    await expect(
      controller.getDealById('c0000000-0000-0000-0000-000000000002', req),
    ).rejects.toThrow(ForbiddenException);
  });

  it('STAFF bị chặn (403 Forbidden) khi xóa Deal', async () => {
    const req = {
      user: { id: 'user-staff-1' },
      workspace: { id: 'c0000000-0000-0000-0000-000000000099', role: WorkspaceRole.STAFF },
    };

    await expect(
      controller.deleteDeal('c0000000-0000-0000-0000-000000000001', req),
    ).rejects.toThrow(ForbiddenException);
  });

  it('OWNER được phép xóa Deal thành công', async () => {
    const req = {
      user: { id: 'user-owner' },
      workspace: { id: 'c0000000-0000-0000-0000-000000000099', role: WorkspaceRole.OWNER },
    };

    const res = await controller.deleteDeal('c0000000-0000-0000-0000-000000000001', req);
    expect(res.success).toBe(true);
    expect(deals.length).toBe(1);
  });
});

