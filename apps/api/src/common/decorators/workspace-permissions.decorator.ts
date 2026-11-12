import { SetMetadata } from '@nestjs/common';

export const WORKSPACE_PERMISSIONS_KEY = 'workspace-permissions';

export const WorkspacePermission = {
  MANAGE_WORKSPACE: 'MANAGE_WORKSPACE',
} as const;

export type WorkspacePermission =
  (typeof WorkspacePermission)[keyof typeof WorkspacePermission];

/**
 * Requires a workspace-scoped permission. Workspace Owner always has all permissions;
 * additional profiles are resolved from persisted workspace membership data.
 */
export const WorkspacePermissions = (...permissions: WorkspacePermission[]) =>
  SetMetadata(WORKSPACE_PERMISSIONS_KEY, permissions);
