import type { LoginResponse, AuthUser } from '../../features/auth/types/auth.types.js';

export const USER_ROLES = {
  OWNER: 'OWNER',
  STAFF: 'STAFF',
  EMPTY: '',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export interface UserRoleContextValue {
  role: UserRole;
  isOwner: boolean;
  isStaff: boolean;
  isAgent: boolean;
  isRoleLocked: boolean;
  user: AuthUser | null;
  userId: string;
  userName: string;
  userEmail: string;
  staffId: string;
  staffName: string;
  staffEmail: string;
  ownerId: string;
  session: LoginResponse | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (newSession: LoginResponse, rememberMe?: boolean) => void;
  logout: () => void;
  setRole: (newRole: UserRole, ownerId?: string) => void;
  toggleRole: () => void;
}
