import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WORKSPACE_ROLES, type WorkspaceRole } from '../../../../contracts/roles.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<WorkspaceRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (roles === undefined) return true;

    const request = context.switchToHttp().getRequest<{ user?: { id: string }; workspace?: { role?: string } }>();
    if (!request.user?.id) throw new UnauthorizedException();
    const role = request.workspace?.role;
    if (!role || !WORKSPACE_ROLES.includes(role as WorkspaceRole)) {
      throw new UnauthorizedException('Không tìm thấy role trong workspace hiện tại.');
    }

    if (!roles.includes(role as WorkspaceRole)) {
      throw new NotFoundException();
    }

    return true;
  }
}
