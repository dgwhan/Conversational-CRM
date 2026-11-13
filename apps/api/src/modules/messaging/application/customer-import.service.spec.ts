import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CustomerImportService, parseImportDate, type CustomerImportContext } from './customer-import.service.js';
import { WorkspaceRole } from '../../../contracts/roles.js';
import type { CustomerImportRequest } from '../../../contracts/customer-import.js';

const WS = '11111111-1111-1111-1111-111111111111';
const OWNER_ID = '22222222-2222-2222-2222-222222222222';
const STAFF_ID = '33333333-3333-3333-3333-333333333333';
const STAFF_MEMBER_ID = '44444444-4444-4444-4444-444444444444';
const JOB_ID = '55555555-5555-5555-5555-555555555555';

const ownerCtx: CustomerImportContext = { workspaceId: WS, userId: OWNER_ID, role: WorkspaceRole.OWNER };
const staffCtx: CustomerImportContext = { workspaceId: WS, userId: STAFF_ID, role: WorkspaceRole.STAFF };

function request(rows: CustomerImportRequest['rows'], extra: Partial<CustomerImportRequest> = {}): CustomerImportRequest {
  return { fileName: 'hoi-cho.csv', rows, duplicateStrategy: 'SKIP', defaults: {}, ...extra };
}

describe('CustomerImportService', () => {
  let prisma: any;
  let tx: any;
  let config: any;
  let service: CustomerImportService;

  beforeEach(() => {
    tx = {
      customerImportJob: {
        create: vi.fn().mockImplementation(async ({ data }) => ({
          id: JOB_ID,
          status: 'COMPLETED',
          undoneCount: 0,
          undoneAt: null,
          createdAt: new Date(),
          ...data,
        })),
        update: vi.fn().mockImplementation(async ({ data }) => ({
          id: JOB_ID,
          fileName: 'hoi-cho.csv',
          duplicateStrategy: 'SKIP',
          source: null,
          totalRows: 3,
          createdCount: 3,
          updatedCount: 0,
          skippedCount: 0,
          errorCount: 0,
          createdById: OWNER_ID,
          createdByName: 'Chủ workspace',
          createdAt: new Date(),
          ...data,
        })),
      },
      customer: {
        createMany: vi.fn().mockResolvedValue({ count: 0 }),
        update: vi.fn().mockResolvedValue({}),
        findMany: vi.fn().mockResolvedValue([]),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        count: vi.fn().mockResolvedValue(0),
      },
    };
    prisma = {
      workspace: {
        findUnique: vi.fn().mockResolvedValue({
          ownerId: OWNER_ID,
          owner: { id: OWNER_ID, email: 'owner@cusc.vn', fullName: 'Chủ workspace' },
          members: [{ id: STAFF_MEMBER_ID, userId: STAFF_ID, user: { email: 'tuvan@cusc.vn', fullName: 'Tư vấn viên A' } }],
        }),
      },
      customer: { findMany: vi.fn().mockResolvedValue([]) },
      user: { findUnique: vi.fn().mockResolvedValue({ fullName: 'Chủ workspace' }) },
      customerImportJob: { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
      $transaction: vi.fn().mockImplementation(async (fn: (t: any) => unknown) => fn(tx)),
    };
    config = {
      getConfig: vi.fn().mockResolvedValue({
        pipelineStages: [
          { id: 'STAGE_NEW', name: 'Mới tiếp nhận', order: 0 },
          { id: 'STAGE_CONTACTED', name: 'Đã liên hệ', order: 1 },
        ],
        productCatalog: [{ id: 'p-it', name: 'Công nghệ thông tin', code: 'CNTT' }],
      }),
    };
    service = new CustomerImportService(prisma, config);
  });

  describe('preview', () => {
    it('phân loại dòng hợp lệ, dòng lỗi và dòng trùng trong file', async () => {
      const res = await service.preview(
        request([
          { fullName: 'Nguyễn Văn A', phone: '0912 345 678', email: 'A@Gmail.com', leadStage: 'đã liên hệ' },
          { fullName: '', phone: '0987654321' },
          { fullName: 'Trần B', phone: 'abc' },
          { fullName: 'Lê C' },
          { fullName: 'Nguyễn Văn A (lặp)', phone: '+84912345678' },
          { fullName: 'Phạm D', email: 'd@cusc.vn', dateOfBirth: '31/02/2008' },
        ]),
        ownerCtx,
      );

      expect(res.summary).toEqual({ totalRows: 6, createCount: 1, updateCount: 0, skipCount: 0, errorCount: 5 });
      expect(res.rows[0]).toMatchObject({ row: 1, action: 'CREATE', email: 'a@gmail.com' });
      expect(res.rows[1].messages).toContain('Thiếu họ tên.');
      expect(res.rows[2].messages[0]).toMatch(/Số điện thoại không hợp lệ/);
      expect(res.rows[3].messages).toContain('Cần ít nhất số điện thoại hoặc email.');
      expect(res.rows[4].messages[0]).toMatch(/Trùng SĐT\/email với dòng 1/);
      expect(res.rows[5].messages[0]).toMatch(/Ngày sinh không hợp lệ/);
    });

    it('báo lỗi giai đoạn, trạng thái và người phụ trách không tồn tại', async () => {
      const res = await service.preview(
        request([{ fullName: 'A', phone: '0912345678', leadStage: 'Không có', leadStatus: 'xyz', assigneeEmail: 'ai@x.vn' }]),
        ownerCtx,
      );
      const msgs = res.rows[0].messages.join(' | ');
      expect(res.rows[0].action).toBe('ERROR');
      expect(msgs).toMatch(/Giai đoạn "Không có"/);
      expect(msgs).toMatch(/Trạng thái "xyz"/);
      expect(msgs).toMatch(/ai@x.vn/);
    });

    it('bỏ qua khách đã có khi chọn SKIP', async () => {
      prisma.customer.findMany.mockResolvedValue([
        { id: 'c-1', fullName: 'Khách cũ', phoneNormalized: '0912345678', email: null, channelIdentities: {} },
      ]);
      const res = await service.preview(request([{ fullName: 'A', phone: '0912345678' }]), ownerCtx);
      expect(res.rows[0]).toMatchObject({ action: 'SKIP', existingCustomerId: 'c-1', existingCustomerName: 'Khách cũ' });
    });

    it('từ chối giai đoạn mặc định không có trong pipeline', async () => {
      await expect(
        service.preview(request([{ fullName: 'A', phone: '0912345678' }], { defaults: { leadStage: 'abc' } }), ownerCtx),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('commit', () => {
    it('tạo khách mới gắn lô import, chuẩn hóa giai đoạn / ngành / người phụ trách', async () => {
      const res = await service.commit(
        request(
          [
            {
              fullName: '  Nguyễn   Văn A ',
              phone: '0912345678',
              leadStage: 'Đã liên hệ',
              leadStatus: 'Tiềm năng',
              interestCourses: 'cntt; Kế toán',
              tags: 'Hội chợ, VIP',
              assigneeEmail: 'TUVAN@cusc.vn',
              dateOfBirth: '05/09/2008',
            },
          ],
          { defaults: { source: 'Ngày hội tư vấn 2026' } },
        ),
        ownerCtx,
      );

      expect(res.summary.createCount).toBe(1);
      expect(res.job).toMatchObject({ id: JOB_ID, createdCount: 1, canUndo: true, createdByName: 'Chủ workspace' });
      const created = tx.customer.createMany.mock.calls[0][0].data[0];
      expect(created).toMatchObject({
        workspaceId: WS,
        fullName: 'Nguyễn Văn A',
        leadStage: 'STAGE_CONTACTED',
        leadStatus: 'POTENTIAL',
        source: 'Ngày hội tư vấn 2026',
        importJobId: JOB_ID,
      });
      expect(created.dateOfBirth.toISOString()).toBe('2008-09-05T00:00:00.000Z');
      expect(created.channelIdentities).toMatchObject({
        interestCourses: ['Công nghệ thông tin', 'Kế toán'],
        tags: ['Hội chợ', 'VIP'],
        assignedStaffId: STAFF_ID,
        assignedMemberId: STAFF_MEMBER_ID,
      });
    });

    it('FILL_EMPTY chỉ điền trường trống, gộp tag và không dùng giá trị mặc định đè giai đoạn cũ', async () => {
      prisma.customer.findMany.mockResolvedValue([
        {
          id: 'c-1',
          fullName: 'Khách cũ',
          phone: '0912345678',
          phoneNormalized: '0912345678',
          email: null,
          school: 'THPT Cũ',
          address: null,
          leadStage: 'STAGE_CONTACTED',
          leadStatus: 'POTENTIAL',
          source: null,
          notes: null,
          channelIdentities: { tags: ['Cũ'] },
        },
      ]);
      const res = await service.commit(
        request(
          [{ fullName: 'Tên mới', phone: '0912345678', email: 'moi@x.vn', school: 'THPT Mới', tags: 'Mới' }],
          { duplicateStrategy: 'FILL_EMPTY', defaults: { leadStage: 'STAGE_NEW', source: 'Form' } },
        ),
        ownerCtx,
      );

      expect(res.summary.updateCount).toBe(1);
      const { where, data } = tx.customer.update.mock.calls[0][0];
      expect(where).toEqual({ id: 'c-1' });
      expect(data).toMatchObject({ email: 'moi@x.vn', source: 'Form', channelIdentities: { tags: ['Cũ', 'Mới'] } });
      expect(data).not.toHaveProperty('fullName');
      expect(data).not.toHaveProperty('school');
      expect(data).not.toHaveProperty('leadStage');
    });

    it('STAFF: khách import luôn thuộc về chính họ và không cập nhật khách của người khác', async () => {
      prisma.customer.findMany.mockResolvedValue([
        { id: 'c-9', fullName: 'Khách người khác', phoneNormalized: '0987654321', channelIdentities: { assignedStaffId: OWNER_ID } },
      ]);
      const res = await service.commit(
        request(
          [
            { fullName: 'Mới', phone: '0912345678', assigneeEmail: 'owner@cusc.vn' },
            { fullName: 'Trùng', phone: '0987654321', email: 'x@y.vn' },
          ],
          { duplicateStrategy: 'OVERWRITE' },
        ),
        staffCtx,
      );

      expect(res.rows[1]).toMatchObject({ action: 'SKIP' });
      expect(res.rows[1].messages[0]).toMatch(/người khác phụ trách/);
      expect(tx.customer.update).not.toHaveBeenCalled();
      expect(tx.customer.createMany.mock.calls[0][0].data[0].channelIdentities).toMatchObject({
        assignedStaffId: STAFF_ID,
        assignedMemberId: STAFF_MEMBER_ID,
      });
    });
  });

  describe('undo', () => {
    const job = (overrides: Record<string, unknown> = {}) => ({
      id: JOB_ID,
      workspaceId: WS,
      status: 'COMPLETED',
      createdById: OWNER_ID,
      createdAt: new Date(),
      ...overrides,
    });

    it('xóa khách do lô tạo và chưa phát sinh dữ liệu, giữ lại phần còn lại', async () => {
      prisma.customerImportJob.findFirst.mockResolvedValue(job());
      tx.customer.findMany.mockResolvedValue([{ id: 'c-1' }, { id: 'c-2' }]);
      tx.customer.count.mockResolvedValue(1);

      const res = await service.undo(JOB_ID, ownerCtx);

      expect(tx.customer.findMany.mock.calls[0][0].where).toMatchObject({
        importJobId: JOB_ID,
        conversations: { none: {} },
        deals: { none: {} },
        activities: { none: {} },
      });
      expect(tx.customer.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['c-1', 'c-2'] } } });
      expect(res).toMatchObject({ deletedCount: 2, keptCount: 1, job: { status: 'UNDONE', canUndo: false } });
    });

    it('từ chối hoàn tác sau 24 giờ hoặc khi đã hoàn tác', async () => {
      prisma.customerImportJob.findFirst.mockResolvedValue(job({ createdAt: new Date(Date.now() - 25 * 3600_000) }));
      await expect(service.undo(JOB_ID, ownerCtx)).rejects.toThrow(/24 giờ/);

      prisma.customerImportJob.findFirst.mockResolvedValue(job({ status: 'UNDONE' }));
      await expect(service.undo(JOB_ID, ownerCtx)).rejects.toThrow(/đã được hoàn tác/);
    });

    it('STAFF không được hoàn tác lô của người khác', async () => {
      prisma.customerImportJob.findFirst.mockResolvedValue(job());
      await expect(service.undo(JOB_ID, staffCtx)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('parseImportDate', () => {
    it.each([
      ['05/09/2008', '2008-09-05'],
      ['5-9-2008', '2008-09-05'],
      ['2008-09-05', '2008-09-05'],
      ['39696', '2008-09-05'],
    ])('đọc "%s"', (raw, iso) => {
      expect(parseImportDate(raw)?.toISOString().slice(0, 10)).toBe(iso);
    });

    it.each(['31/02/2008', 'hôm qua', '2008/13/01'])('từ chối "%s"', (raw) => {
      expect(parseImportDate(raw)).toBeNull();
    });
  });
});
