import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, AppRole } from '../decorators/roles.decorator.js';
import {
  WORKSPACE_PERMISSIONS_KEY,
  type WorkspacePermission,
} from '../decorators/workspace-permissions.decorator.js';
import { WORKSPACE_ROLES, WorkspaceRole } from '../../contracts/roles.js';
import { PrismaService } from '../../platform/database/prisma.service.js';
import { extractUserFromAuthHeader } from '../../modules/workspace-config/application/workspace-resolver.js';
import { resolveDefaultMembership, resolveWorkspaceMembership } from '../auth/workspace-membership.js';
import { STAFF_STATUS } from '../../modules/auth/domain/staff-status.constants.js';

/** Các route liên quan lời mời: người được mời (PENDING) phải truy cập được workspace mời họ */
const INVITATION_FLOW_REGEX = /\/workspaces\/(?:invitations\/|[^/]+\/members\/(?:accept|decline)(?:\/|\?|$))/;

/**
 * Kiểm tra vai trò (OWNER / STAFF) theo tư cách thành viên THỰC TẾ trong workspace.
 *
 * - Danh tính: lấy từ request.user (JwtAuthGuard toàn cục). Nếu chưa có thì tự xác minh chữ ký
 *   Access Token; tuyệt đối không tin x-user-role / x-staff-id và KHÔNG còn mặc định OWNER.
 * - Workspace: ưu tiên workspace nằm trong URL (wsId / workspaceId, hoặc :id của /workspaces/:id),
 *   nếu không có thì dùng request.workspace do WorkspaceContextGuard đã kiểm tra.
 */
@Injectable()
export class WorkspaceRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Optional() private readonly prisma?: PrismaService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Xác định Danh tính
    if (!request.user?.id) {
      const tokenUser = extractUserFromAuthHeader(request.headers?.authorization);
      if (!tokenUser) {
        throw new UnauthorizedException();
      }
      request.user = {
        id: tokenUser.id
      };
    }
    const userId: string = request.user.id;

    const requiredRoles = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const hasRoleRequirement = Array.isArray(requiredRoles) && requiredRoles.length > 0;
    const requiredPermissions = this.reflector.getAllAndOverride<WorkspacePermission[]>(
      WORKSPACE_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    const hasPermissionRequirement = Array.isArray(requiredPermissions) && requiredPermissions.length > 0;

    /**
     * Kiểm tra vai trò OWNER / MANAGER / STAFF trong workspace.
     */
    let workspace: {
      id?: string;
      role?: AppRole;
      status?: string
    } | undefined = request.workspace;

    // Nếu WorkspaceContextGuard toàn cục chưa chạy,
    // tự xác định workspace từ tư cách thành viên thực tế thay vì tin bất kỳ header nào của client.
    if (!workspace && this.prisma) {
      const headerRef = request.headers?.['x-workspace-id'];
      let membership = null;
      if (typeof headerRef === 'string' && headerRef) {
        const m = await resolveWorkspaceMembership(this.prisma, userId, headerRef);
        if (m?.status === STAFF_STATUS.ACTIVE) membership = m;
      }
      membership = membership ?? (await resolveDefaultMembership(this.prisma, userId));
      if (membership) {
        workspace = {
          id: membership.workspaceId,
          role: membership.role,
          status: membership.status
        };
        request.workspace = {
          id: membership.workspaceId,
          ownerId: membership.ownerId,
          role: membership.role,
          status: membership.status,
        };
      }
    }
    const targetRef = this.getTargetWorkspaceRef(context, request);
    const url: string = request.url || request.raw?.url || '';
    const isInvitationFlow = INVITATION_FLOW_REGEX.test(url);

    if (targetRef && targetRef !== workspace?.id) {
      const membership = this.prisma
        ? await resolveWorkspaceMembership(this.prisma, userId, targetRef)
        : null;

      if (!membership) {
        throw new ForbiddenException(
          'Bạn không có quyền truy cập Không gian làm việc này.',
        );
      }

      workspace = {
        id: membership.workspaceId,
        role: membership.role,
        status: membership.status,
      };

      request.workspace = {
        ...(request.workspace ?? {}),
        ...workspace,
      };
    }

    // Nếu tài khoản đang ở trạng thái PENDING đối với workspace, chặn truy cập
    if (
      workspace?.status &&
      workspace.status !== STAFF_STATUS.ACTIVE &&
      !isInvitationFlow
    ) {
      throw new ForbiddenException(
        'Bạn chưa chấp nhận lời mời tham gia Không gian làm việc này.',
      );
    }

    //chỉ cần đã đăng nhập và là thành viên của workspace
    if (!hasRoleRequirement && !hasPermissionRequirement) {
      return true;
    }

    const userRole = workspace?.role;

    if (hasRoleRequirement &&
      (!userRole || !requiredRoles?.includes(userRole))) {
      throw new ForbiddenException(
        `Bạn không có quyền thực hiện thao tác này. Chức năng này chỉ dành cho: ${requiredRoles!.join(', ')} (Hiện tại bạn là: ${userRole ?? 'không thuộc không gian làm việc nào'}).`,
      );
    }

    if (hasPermissionRequirement) {
      if (!workspace?.id || !this.prisma) {
        throw new ForbiddenException('Không thể xác định quyền trong workspace hiện tại.');
      }
      const target = await this.prisma.workspace.findUnique({
        where: { id: workspace.id },
        select: {
          ownerId: true,
          members: {
            where: { userId, isActive: true, status: STAFF_STATUS.ACTIVE },
            select: { role: true, isWorkspaceManager: true },
            take: 1,
          },
        },
      });

      const member = target?.members?.[0];
      const isOwner = target?.ownerId === userId || member?.role === WorkspaceRole.OWNER;
      const isManager = isOwner || member?.role === WorkspaceRole.MANAGER || member?.isWorkspaceManager === true;

      const allowed = requiredPermissions!.every((permission) => {
        switch (permission) {
          // Quyền chỉ dành riêng cho Chủ sở hữu (Owner)
          case 'DELETE_WORKSPACE':
          case 'TRANSFER_OWNERSHIP':
          case 'MANAGE_WORKSPACE_CONFIG':
          case 'MANAGE_CHANNELS':
          case 'MANAGE_WORKSPACE':
            return isOwner;

          // Quyền quản trị vận hành (Owner và Manager)
          case 'MANAGE_STAFF':
          case 'MANAGE_SHIFTS':
          case 'MANAGE_ROUTING':
          case 'VIEW_AUDIT_LOGS':
            return isManager;

          default:
            return false;
        }
      });

      if (!allowed) {
        throw new ForbiddenException('Bạn không có đủ quyền để thực hiện thao tác này.');
      }
    }

    return true;
  }

  /** workspace được chỉ định trong URL của route hiện tại (nếu có) */
  private getTargetWorkspaceRef(
    context: ExecutionContext,
    request: any): string | undefined {
    const params = request.params ?? {};
    const explicit = params.wsId ?? params.workspaceId;
    if (typeof explicit === 'string' && explicit) return explicit;

    const query = request.query ?? {};
    const queryWs = query.wsId ?? query.workspaceId;
    if (typeof queryWs === 'string' && queryWs) return queryWs;

    const headerWs = request.headers?.['x-workspace-id'];
    if (typeof headerWs === 'string' && headerWs) return headerWs;

    // @Controller('workspaces') + @Get(':id/...') -> :id là workspaceId
    // (riêng các route /workspaces/invitations/:id thì :id là invitationId nên đã loại ở INVITATION_FLOW_REGEX)
    const controllerPath = Reflect.getMetadata('path', context.getClass() ?? {}) as string | undefined;
    if (controllerPath === 'workspaces' && typeof params.id === 'string' && params.id) {
      const url: string = request.url || request.raw?.url || '';
      if (/\/workspaces\/invitations\//.test(url)) return undefined;
      return params.id;
    }
    return undefined;
  }
}
