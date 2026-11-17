export const WORKSPACE_ROLES = {
  OWNER: 'OWNER',
  MANAGER: 'MANAGER',
  STAFF: 'STAFF',
} as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[keyof typeof WORKSPACE_ROLES];
