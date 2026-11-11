import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, AppRole } from '../decorators/roles.decorator.js';
import { extractUserFromAuthHeader } from '../../modules/workspace-config/application/workspace-resolver.js';

@Injectable()
export class WorkspaceRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // 1. Tự động xác thực và nhận diện người dùng từ Access Token nếu có trong Authorization header
    if (!request.user && request.headers?.authorization) {
      const tokenUser = extractUserFromAuthHeader(request.headers.authorization);
      if (tokenUser) {
        request.user = tokenUser;
      }
    }

    // Nếu tài khoản đang ở trạng thái PENDING đối với workspace, chặn truy cập
    if (
      request.user?.memberStatus === 'PENDING' ||
      request.headers?.['x-member-status'] === 'PENDING'
    ) {
      throw new ForbiddenException(
        'Bạn chưa chấp nhận lời mời tham gia Không gian làm việc này.',
      );
    }

    const requiredRoles = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Nếu endpoint không yêu cầu role cụ thể, cho phép truy cập
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Lấy role từ JWT user context hoặc header 'x-user-role' (phục vụ mô phỏng / kiểm thử)
    const rawRole =
      request.user?.role ||
      request.headers?.['x-user-role'] ||
      'OWNER'; // Mặc định OWNER nếu chưa gắn header

    const userRole = String(rawRole).toUpperCase() as AppRole;

    const hasRole = requiredRoles.includes(userRole);
    if (!hasRole) {
      throw new ForbiddenException(
        `Bạn không có quyền thực hiện thao tác này. Chức năng này chỉ dành cho: ${requiredRoles.join(', ')} (Hiện tại bạn là: ${userRole}).`,
      );
    }

    return true;
  }
}
