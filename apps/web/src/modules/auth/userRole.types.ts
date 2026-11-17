import type { LoginResponse, AuthUser } from '../../features/auth/types/auth.types.js';
import type { WorkspaceRole } from '../workspace/types/workspace-role.js';

export interface UserRoleContextValue {
  role: WorkspaceRole | null;
  isOwner: boolean;
  isStaff: boolean;
  isManager: boolean;
  canManageWorkspace: boolean;
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
  setRole: (newRole: WorkspaceRole | null, ownerId?: string) => void;
  toggleRole: () => void;
}
