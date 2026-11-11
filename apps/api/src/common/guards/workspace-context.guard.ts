import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../platform/database/prisma.service.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { isUuid } from '../../utils/uuid.util.js';
import {
  resolveDefaultMembership,
  resolveWorkspaceMembership,
  type ResolvedMembership,
} from '../auth/workspace-membership.js';

function stringValues(value: unknown): string[] {
  const list = Array.isArray(value) ? value : [value];
  return list
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean);
}

/**
 * Guard toàn cục chạy SAU JwtAuthGuard. Nhiệm vụ:
 *  1. Xác định workspace đang thao tác và KIỂM TRA người dùng thật sự là thành viên (ACTIVE).
 *     - workspaceId do client chỉ định rõ (param wsId/workspaceId, query/body workspaceId) mà không
 *       thuộc về người dùng -> 403.
 *     - Header x-workspace-id không hợp lệ -> bỏ qua và dùng workspace mặc định của người dùng.
 *  2. Gắn `request.workspace` = { id, ownerId, role, status } (vai trò lấy từ DB).
 *  3. Ghi đè các header danh tính (x-user-role, x-staff-id, x-owner-id, x-actor-id, x-member-status,
 *     x-workspace-id) bằng giá trị đã xác minh, để mã cũ còn đọc header cũng không bị giả mạo.
 */
@Injectable()
export class WorkspaceContextGuard implements CanActivate {
  private readonly logger = new Logger(WorkspaceContextGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  private async slugExists(slug: string): Promise<boolean> {
    const ws = await this.prisma.workspace.findUnique({ where: { slug }, select: { id: true } });
    return Boolean(ws);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const userId: string | undefined = req.user?.id;
    if (!userId) {
      // JwtAuthGuard phải chạy trước; không có người dùng đã xác thực thì không được đi tiếp
      throw new UnauthorizedException();
    }

    // 1. Các workspaceId client chỉ định rõ ràng (nguồn "mạnh")
    const explicitRefs = new Set<string>();
    for (const v of stringValues(req.params?.wsId)) explicitRefs.add(v);
    for (const v of stringValues(req.params?.workspaceId)) explicitRefs.add(v);
    for (const v of stringValues(req.query?.workspaceId)) explicitRefs.add(v);
    const body = req.body;
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      for (const v of stringValues((body as Record<string, unknown>).workspaceId)) explicitRefs.add(v);
    }

    let chosen: ResolvedMembership | null = null;
    for (const ref of explicitRefs) {
      const membership = await resolveWorkspaceMembership(this.prisma, userId, ref);
      if (!membership || membership.status !== 'ACTIVE') {
        // Giá trị giữ chỗ (vd. "ws-default-001" khi người dùng mới chưa có workspace) không trỏ tới
        // workspace thật nào nên không phải rủi ro xuyên tenant: bỏ qua, route tự xử lý (chỉ trả dữ liệu
        // riêng của người dùng như lời mời tham gia).
        if (!membership && !isUuid(ref) && !(await this.slugExists(ref))) {
          continue;
        }
        throw new ForbiddenException('Bạn không phải thành viên của Không gian làm việc này.');
      }
      if (chosen && chosen.workspaceId !== membership.workspaceId) {
        throw new ForbiddenException('Yêu cầu chứa nhiều Không gian làm việc khác nhau.');
      }
      chosen = membership;
    }

    // 2. Header x-workspace-id (nguồn "yếu": client có thể giữ giá trị cũ trong localStorage)
    if (!chosen) {
      const headerRef = stringValues(req.headers?.['x-workspace-id'])[0];
      if (headerRef) {
        const membership = await resolveWorkspaceMembership(this.prisma, userId, headerRef);
        if (membership?.status === 'ACTIVE') {
          chosen = membership;
        } else {
          this.logger.warn(`Bỏ qua x-workspace-id không hợp lệ cho user ${userId}`);
        }
      }
    }

    // 3. Workspace mặc định của người dùng
    if (!chosen) {
      chosen = await resolveDefaultMembership(this.prisma, userId);
    }

    req.workspace = chosen
      ? { id: chosen.workspaceId, ownerId: chosen.ownerId, role: chosen.role, status: chosen.status }
      : undefined;

    // 4. Ghi đè header danh tính bằng giá trị đã xác minh
    const headers = req.headers as Record<string, unknown>;
    delete headers['x-user-role'];
    delete headers['x-member-status'];
    headers['x-staff-id'] = userId;
    headers['x-actor-id'] = userId;
    // Lưu ý: x-owner-id luôn là NGƯỜI GỌI (không phải chủ workspace) để mã cũ không thể
    // "mượn quyền" chủ sở hữu thông qua header này.
    headers['x-owner-id'] = userId;
    if (chosen) {
      headers['x-workspace-id'] = chosen.workspaceId;
      headers['x-user-role'] = chosen.role;
      headers['x-member-status'] = chosen.status;
    } else {
      delete headers['x-workspace-id'];
    }

    return true;
  }
}
