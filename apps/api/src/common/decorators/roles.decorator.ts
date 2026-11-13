import { SetMetadata } from '@nestjs/common';

import type { WorkspaceRole } from '../../contracts/roles.js';

export const ROLES_KEY = 'roles';
export type AppRole = WorkspaceRole;

/**
 * Decorator xác định các vai trò được phép truy cập endpoint
 */
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
