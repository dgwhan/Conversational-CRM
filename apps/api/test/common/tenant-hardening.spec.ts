import { describe, it, expect, vi } from 'vitest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { assertStaffCanModify, staffAssignmentFilter } from '../../src/common/auth/staff-scope.js';
import { resolveActiveMemberId } from '../../src/common/auth/workspace-membership.js';
import { parsePhoneInput, parseEmailInput } from '../../src/modules/customers/domain/phone-standardizer.js';
import { vnDate, vnToday } from '../../src/utils/vn-time.util.js';
import { ContactController } from '../../src/modules/messaging/presentation/contact.controller.js';
import { WorkspaceRole } from '../../src/contracts/roles.js';

const WS = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';
const MEMBER = '33333333-3333-4333-8333-333333333333';
const OTHER_MEMBER = '44444444-4444-4444-8444-444444444444';

const staff = { userId: USER, workspaceId: WS, role: WorkspaceRole.STAFF };
const owner = { userId: USER, workspaceId: WS, role: WorkspaceRole.OWNER };

function prismaWith(customer: unknown = null) {
  return {
    workspaceMember: { findFirst: vi.fn().mockResolvedValue({ id: MEMBER }) },
    customer: { findFirst: vi.fn().mockResolvedValue(customer) },
  } as any;
}

describe('Phạm vi dữ liệu của STAFF (staff-scope)', () => {
  it('OWNER không bị giới hạn', async () => {
    const prisma = prismaWith();
    expect(await staffAssignmentFilter(prisma, owner)).toEqual({});
    await expect(assertStaffCanModify(prisma, owner, { assignedMemberId: OTHER_MEMBER })).resolves.toBeUndefined();
  });

  it('STAFF chỉ thấy bản ghi giao cho mình hoặc chưa giao', async () => {
    expect(await staffAssignmentFilter(prismaWith(), staff)).toEqual({
      OR: [{ assignedMemberId: null }, { assignedMemberId: MEMBER }],
    });
  });

  it('STAFF sửa được bản ghi của mình và bản ghi chưa giao cho ai', async () => {
    await expect(assertStaffCanModify(prismaWith(), staff, { assignedMemberId: MEMBER })).resolves.toBeUndefined();
    await expect(assertStaffCanModify(prismaWith(), staff, {})).resolves.toBeUndefined();
  });

  it('STAFF không sửa được bản ghi giao cho người khác', async () => {
    await expect(
      assertStaffCanModify(prismaWith(), staff, { assignedMemberId: OTHER_MEMBER }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('STAFF không sửa được dữ liệu của khách hàng do người khác phụ trách', async () => {
    const prisma = prismaWith({ channelIdentities: {}, conversations: [{ assignedMemberId: OTHER_MEMBER }] });
    await expect(assertStaffCanModify(prisma, staff, { customerId: 'c-1' })).rejects.toThrow(ForbiddenException);
  });
});

describe('resolveActiveMemberId', () => {
  it('chỉ tìm thành viên đang hoạt động trong đúng workspace', async () => {
    const prisma = { workspaceMember: { findFirst: vi.fn().mockResolvedValue({ id: MEMBER }) } } as any;
    expect(await resolveActiveMemberId(prisma, WS, `user-${USER}`)).toBe(MEMBER);
    expect(prisma.workspaceMember.findFirst).toHaveBeenCalledWith({
      where: { workspaceId: WS, isActive: true, status: 'ACTIVE', OR: [{ id: USER }, { userId: USER }] },
      select: { id: true },
    });
  });

  it('bỏ qua tham chiếu không hợp lệ hoặc thiếu workspace', async () => {
    const prisma = { workspaceMember: { findFirst: vi.fn() } } as any;
    expect(await resolveActiveMemberId(prisma, WS, 'staff-me')).toBeNull();
    expect(await resolveActiveMemberId(prisma, undefined, USER)).toBeNull();
    expect(prisma.workspaceMember.findFirst).not.toHaveBeenCalled();
  });
});

describe('Chuẩn hóa SĐT / email do client gửi', () => {
  it('chuẩn hóa SĐT Việt Nam và giữ định dạng hiển thị', () => {
    expect(parsePhoneInput('+84 912 345 678')).toEqual({ phone: '+84 912 345 678', phoneNormalized: '0912345678' });
    expect(parsePhoneInput('0912.345.678')?.phoneNormalized).toBe('0912345678');
  });

  it('phân biệt "không gửi" với "xóa"', () => {
    expect(parsePhoneInput(undefined)).toBeUndefined();
    expect(parsePhoneInput('')).toEqual({ phone: null, phoneNormalized: null });
  });

  it('từ chối nhãn hiển thị như "Chưa có SĐT" thay vì ghi vào DB', () => {
    expect(() => parsePhoneInput('Chưa có SĐT')).toThrow(BadRequestException);
    expect(() => parsePhoneInput('No phone')).toThrow(BadRequestException);
    expect(() => parseEmailInput('Chưa có Email')).toThrow(BadRequestException);
    expect(parseEmailInput(' An@Example.com ')).toBe('an@example.com');
  });
});

describe('Mốc thời gian theo giờ Việt Nam', () => {
  it('00:00 giờ Việt Nam = 17:00 UTC ngày hôm trước', () => {
    expect(vnDate(2026, 10, 13).toISOString()).toBe('2026-11-12T17:00:00.000Z');
  });

  it('23:30 UTC đã là ngày hôm sau ở Việt Nam', () => {
    expect(vnToday(new Date('2026-11-12T23:30:00Z'))).toEqual({ year: 2026, month: 10, day: 13 });
  });
});

describe('ContactController chỉ trả dữ liệu của workspace đã xác minh', () => {
  const req = { user: { id: USER }, workspace: { id: WS, role: 'STAFF' } };

  it('GET /contacts lọc theo workspace', async () => {
    const prisma = { contact: { findMany: vi.fn().mockResolvedValue([]) } } as any;
    await new ContactController(prisma, {} as any).getContacts(req);
    expect(prisma.contact.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspaceId: WS, isMerged: false } }),
    );
  });

  it('tra cứu theo kênh / SĐT không vượt ra ngoài workspace', async () => {
    const prisma = { contact: { findFirst: vi.fn().mockResolvedValue(null) } } as any;
    await new ContactController(prisma, {} as any).lookupContact(req, 'zalo', 'zalo-uid', '+84912345678');
    for (const [call] of prisma.contact.findFirst.mock.calls) {
      expect(call.where).toMatchObject({ workspaceId: WS, isMerged: false });
    }
    expect(prisma.contact.findFirst.mock.calls[1][0].where.phoneNormalized).toBe('0912345678');
  });

  it('không có workspace -> 403', async () => {
    const prisma = { contact: { findMany: vi.fn() } } as any;
    await expect(new ContactController(prisma, {} as any).getContacts({ user: { id: USER } })).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.contact.findMany).not.toHaveBeenCalled();
  });
});
