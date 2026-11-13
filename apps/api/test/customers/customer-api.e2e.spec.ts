import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { CustomerController } from '../../src/modules/messaging/presentation/customer.controller.js';

describe('CUS-05: Customer API Real PostgreSQL E2E Test', () => {
  let pool: pg.Pool;
  let prisma: PrismaClient;
  let controller: CustomerController;
  let createdCustomerId: string;
  let ownerUserId: string;
  let workspaceId: string;
  // Request giả lập sau khi JwtAuthGuard + WorkspaceContextGuard đã xác minh (OWNER của workspace kiểm thử)
  const req = () => ({ user: { id: ownerUserId }, workspace: { id: workspaceId, role: 'OWNER' } });

  beforeAll(async () => {
    const connectionString =
      process.env.DATABASE_URL ||
      'postgresql://postgres:han%40ct205@localhost:5432/recruitment_crm?schema=public';
    pool = new pg.Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });

    await prisma.$connect();
    // Đảm bảo extension unaccent tồn tại
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS unaccent;');

    controller = new CustomerController(prisma as any);

    const suffix = Date.now().toString(36);
    const owner = await prisma.user.create({
      data: { email: `owner.e2e.${suffix}@example.com`, fullName: 'Chủ workspace E2E', passwordHash: 'not-used' },
    });
    ownerUserId = owner.id;
    const workspace = await prisma.workspace.create({
      data: { name: 'Workspace E2E CUS-05', slug: `ws-e2e-${suffix}`, ownerId: owner.id },
    });
    workspaceId = workspace.id;

    // Khởi tạo Customer test
    const cust = await prisma.customer.create({
      data: {
        workspaceId,
        fullName: 'Nguyễn Văn A',
        phone: '0912345678',
        email: 'vana.test.e2e@cusc.ctu.edu.vn',
        notes: 'Học viên tiềm năng khóa Lập trình Web Fullstack',
        leadStatus: 'POTENTIAL',
        leadStage: 'STAGE_NEW',
      },
    });
    createdCustomerId = cust.id;
  });

  afterAll(async () => {
    if (createdCustomerId) {
      await prisma.customer.delete({ where: { id: createdCustomerId } }).catch(() => {});
    }
    if (workspaceId) await prisma.workspace.delete({ where: { id: workspaceId } }).catch(() => {});
    if (ownerUserId) await prisma.user.delete({ where: { id: ownerUserId } }).catch(() => {});
    await prisma.$disconnect();
    await pool.end();
  });

  it('1. Tìm "nguyen van a" trên PostgreSQL thật ra "Nguyễn Văn A" (unaccent test)', async () => {
    const res = await controller.getCustomers(req(), 'nguyen van a');

    expect(res.items.length).toBeGreaterThanOrEqual(1);
    const found = res.items.find((c: any) => c.id === createdCustomerId);
    expect(found).toBeDefined();
    expect(found?.fullName).toBe('Nguyễn Văn A');
    expect(found?.phone).toBe('0912345678');
  });

  it('2. Tìm "Nguyen Van A" viết hoa chữ cái đầu trên PostgreSQL thật ra "Nguyễn Văn A"', async () => {
    const res = await controller.getCustomers(req(), 'Nguyen Van A');

    const found = res.items.find((c: any) => c.id === createdCustomerId);
    expect(found).toBeDefined();
    expect(found?.fullName).toBe('Nguyễn Văn A');
  });

  it('3. Tìm theo SĐT định dạng có dấu chấm "0912.345.678" ra đúng khách hàng', async () => {
    const res = await controller.getCustomers(req(), '0912.345.678');

    const found = res.items.find((c: any) => c.id === createdCustomerId);
    expect(found).toBeDefined();
    expect(found?.fullName).toBe('Nguyễn Văn A');
  });

  it('4. GET /customers/:id: Xem chi tiết khách hàng trên PostgreSQL thật', async () => {
    const details = await controller.getCustomerById(req(), createdCustomerId);

    expect(details.id).toBe(createdCustomerId);
    expect(details.fullName).toBe('Nguyễn Văn A');
    expect(details.notes).toBe('Học viên tiềm năng khóa Lập trình Web Fullstack');
    expect(details.leadStatus).toBe('POTENTIAL');
  });

  it('5. PATCH /customers/:id: Cập nhật tên và ghi chú trên PostgreSQL thật', async () => {
    const updated = await controller.updateCustomer(req(), createdCustomerId, {
      fullName: 'Nguyễn Văn An',
      notes: 'Đã hoàn tất đóng học phí đợt 1',
    });

    expect(updated.fullName).toBe('Nguyễn Văn An');
    expect(updated.notes).toBe('Đã hoàn tất đóng học phí đợt 1');

    // Xác thực lại trong CSDL
    const inDb = await prisma.customer.findUnique({ where: { id: createdCustomerId } });
    expect(inDb?.fullName).toBe('Nguyễn Văn An');
    expect(inDb?.notes).toBe('Đã hoàn tất đóng học phí đợt 1');
  });
});

