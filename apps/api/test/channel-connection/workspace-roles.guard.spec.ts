import { beforeEach, describe, expect, it } from 'vitest';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { DEFAULT_JWT_AUDIENCE, DEFAULT_JWT_ISSUER } from '../../src/platform/config/jwt.config.js';
import { WorkspaceRolesGuard } from '../../src/common/guards/workspace-roles.guard.js';
import { ROLES_KEY } from '../../src/common/decorators/roles.decorator.js';
import { ForbiddenException, UnauthorizedException, ExecutionContext } from '@nestjs/common';

const SECRET = 'unit-test-jwt-access-secret-0123456789abcdef';
const WS_ID = '11111111-1111-4111-8111-111111111111';
const OWNER_ID = '22222222-2222-4222-8222-222222222222';
const STAFF_ID = '33333333-3333-4333-8333-333333333333';
const OUTSIDER_ID = '44444444-4444-4444-8444-444444444444';

function makeReflector(roles?: string[]) {
  const reflector = new Reflector();
  reflector.getAllAndOverride = (key: unknown) => (key === ROLES_KEY ? (roles as any) : undefined);
  return reflector;
}

function makeContext(request: Record<string, unknown>): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class Dummy {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

/** Prisma giả: workspace WS_ID do OWNER_ID sở hữu, STAFF_ID là thành viên ACTIVE */
function makePrisma() {
  const workspaceFor = (userId: string) => ({
    id: WS_ID,
    ownerId: OWNER_ID,
    members: userId === STAFF_ID ? [{ role: 'STAFF', status: 'ACTIVE', isActive: true }] : [],
  });
  return {
    workspace: {
      findUnique: async ({ where }: any) => (where.id === WS_ID || where.slug === 'demo' ? workspaceFor(currentUser) : null),
      findFirst: async ({ where }: any) => (where.ownerId === OWNER_ID ? { id: WS_ID, ownerId: OWNER_ID } : null),
    },
    workspaceMember: {
      findFirst: async ({ where }: any) =>
        where.userId === STAFF_ID
          ? { role: 'STAFF', status: 'ACTIVE', workspace: { id: WS_ID, ownerId: OWNER_ID } }
          : null,
    },
  } as any;
}

let currentUser = OWNER_ID;

describe('WorkspaceRolesGuard', () => {
  const jwt = new JwtService();
  const tokenFor = (sub: string) => jwt.sign({ sub }, { secret: SECRET, expiresIn: '5m', ...{ issuer: DEFAULT_JWT_ISSUER, audience: DEFAULT_JWT_AUDIENCE } });

  beforeEach(() => {
    process.env.JWT_ACCESS_SECRET = SECRET;
  });

  it('chặn request không có danh tính (401), kể cả khi giả mạo header x-user-role', async () => {
    const guard = new WorkspaceRolesGuard(makeReflector(['OWNER']), makePrisma());
    const ctx = makeContext({ headers: { 'x-user-role': 'OWNER', 'x-staff-id': OWNER_ID }, params: {} });

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('không chấp nhận token tự ký bằng secret khác (không còn decode không kiểm chữ ký)', async () => {
    const forged = new JwtService().sign({ sub: OWNER_ID }, { secret: 'attacker-secret-attacker-secret-1234' });
    const guard = new WorkspaceRolesGuard(makeReflector(['OWNER']), makePrisma());
    const ctx = makeContext({ headers: { authorization: `Bearer ${forged}` }, params: {} });

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('cho phép khi không yêu cầu role nào (chỉ cần đã đăng nhập)', async () => {
    const guard = new WorkspaceRolesGuard(makeReflector(undefined), makePrisma());
    const ctx = makeContext({ user: { id: OWNER_ID }, headers: {}, params: {} });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('cho phép OWNER thật sự (theo CSDL) khi endpoint yêu cầu OWNER', async () => {
    currentUser = OWNER_ID;
    const guard = new WorkspaceRolesGuard(makeReflector(['OWNER']), makePrisma());
    const ctx = makeContext({ headers: { authorization: `Bearer ${tokenFor(OWNER_ID)}` }, params: {} });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('chặn STAFF (403) khi gọi endpoint OWNER, dù header x-user-role tự xưng OWNER', async () => {
    currentUser = STAFF_ID;
    const guard = new WorkspaceRolesGuard(makeReflector(['OWNER']), makePrisma());
    const ctx = makeContext({
      headers: { authorization: `Bearer ${tokenFor(STAFF_ID)}`, 'x-user-role': 'OWNER' },
      params: {},
    });

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('chặn người ngoài workspace (403) khi URL chỉ định wsId không thuộc về họ', async () => {
    currentUser = OUTSIDER_ID;
    const guard = new WorkspaceRolesGuard(makeReflector(['OWNER']), makePrisma());
    const ctx = makeContext({
      user: { id: OUTSIDER_ID },
      headers: {},
      params: { wsId: WS_ID },
    });

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('dùng request.workspace do WorkspaceContextGuard đã xác minh', async () => {
    const guard = new WorkspaceRolesGuard(makeReflector(['OWNER']), makePrisma());
    const staffCtx = makeContext({
      user: { id: STAFF_ID },
      workspace: { id: WS_ID, role: 'STAFF', status: 'ACTIVE' },
      headers: {},
      params: {},
    });
    const ownerCtx = makeContext({
      user: { id: OWNER_ID },
      workspace: { id: WS_ID, role: 'OWNER', status: 'ACTIVE' },
      headers: {},
      params: {},
    });

    await expect(guard.canActivate(staffCtx)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(guard.canActivate(ownerCtx)).resolves.toBe(true);
  });
});
