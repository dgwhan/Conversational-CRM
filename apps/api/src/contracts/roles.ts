export const WorkspaceRole = {
  OWNER: 'OWNER',
  STAFF: 'STAFF',
} as const;

export type WorkspaceRole = (typeof WorkspaceRole)[keyof typeof WorkspaceRole];

export const WORKSPACE_ROLES = [WorkspaceRole.OWNER, WorkspaceRole.STAFF] as const;

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  LOCKED: 'LOCKED',
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

