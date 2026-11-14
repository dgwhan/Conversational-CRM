import { SetMetadata } from '@nestjs/common';

export const WORKSPACE_PERMISSIONS_KEY = 'workspace-permissions';

export const WorkspacePermission = {
  // Owner only (Quyền nhạy cảm & Vòng đời Workspace):
  DELETE_WORKSPACE: 'DELETE_WORKSPACE',
  TRANSFER_OWNERSHIP: 'TRANSFER_OWNERSHIP',
  MANAGE_WORKSPACE_CONFIG: 'MANAGE_WORKSPACE_CONFIG',
  MANAGE_CHANNELS: 'MANAGE_CHANNELS',

  // Owner & Manager (Quyền quản trị vận hành):
  MANAGE_STAFF: 'MANAGE_STAFF',
  MANAGE_SHIFTS: 'MANAGE_SHIFTS',
  MANAGE_ROUTING: 'MANAGE_ROUTING',
  VIEW_AUDIT_LOGS: 'VIEW_AUDIT_LOGS',

  // Legacy fallback alias
  MANAGE_WORKSPACE: 'MANAGE_WORKSPACE',
} as const;

export type WorkspacePermission =
  (typeof WorkspacePermission)[keyof typeof WorkspacePermission];

/**
 * Requires workspace-scoped permission(s). Workspace Owner always has all permissions;
 * Manager has operational permissions (MANAGE_STAFF, MANAGE_SHIFTS, MANAGE_ROUTING, VIEW_AUDIT_LOGS);
 * Staff has standard CRM access.
 */
export const WorkspacePermissions = (...permissions: WorkspacePermission[]) =>
  SetMetadata(WORKSPACE_PERMISSIONS_KEY, permissions);

