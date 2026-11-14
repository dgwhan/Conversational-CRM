export const WORKSPACE_MEMBER_STATUS = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  DECLINED: 'DECLINED',
  CANCELLED: 'CANCELLED',
} as const;

export type WorkspaceMemberStatus =
  (typeof WORKSPACE_MEMBER_STATUS)[keyof typeof WORKSPACE_MEMBER_STATUS];

export const USER_STATUS = {
  ACTIVE: 'ACTIVE',
  LOCKED: 'LOCKED',
} as const;

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];

export interface ManagedStaffItem {
  id: string;
  email: string;
  phoneNumber?: string | null;
  fullName: string;
  role: string;
  status: UserStatus;
  isActive?: boolean;
  memberStatus?: WorkspaceMemberStatus;
  memberId?: string;
  assignmentLocked?: boolean;
  isWorkspaceManager?: boolean;
  invitedAt?: string | null;
  joinedAt?: string | null;
  invitedBy?: { id: string; fullName: string; email: string } | null;
  ownerId: string | null;
  lockedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

