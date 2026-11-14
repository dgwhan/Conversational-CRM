import type { USER_ROLES } from '../../auth/userRole.types.js';
import type { BusinessDomain } from './domain.types.js';
import type { WorkspaceTerminology } from './terminology.types.js';
import type { PipelineStageConfig } from './pipeline.types.js';
import type { ProductItemConfig } from './product.types.js';
import type { LeadQualificationCriteria } from './criteria.types.js';
import type { WorkingHoursConfig } from './working-hours.types.js';
import type { ManagedStaffItem } from './staff.types.js';

export interface WorkspaceConfig {
  workspaceId: string;
  workspaceName: string;
  domain: BusinessDomain;
  terminology: WorkspaceTerminology;
  pipelineStages: PipelineStageConfig[];
  productCatalog: ProductItemConfig[];
  criteria: LeadQualificationCriteria[];
  unresponsiveAlertMinutes?: number;
  workingHours?: WorkingHoursConfig;
}

export interface WorkspaceItem {
  id: string;
  name: string;
  slug: string;
  role: typeof USER_ROLES.OWNER | typeof USER_ROLES.STAFF;
  isOwner: boolean;
  domain: string;
  ownerId?: string;
  ownerName?: string;
  createdAt?: string;
}

export interface WorkspaceConfigContextType {
  config: WorkspaceConfig;
  isLoading: boolean;
  isWorkspaceListLoading: boolean;
  applyPreset: (domain: BusinessDomain, customName?: string) => Promise<void>;
  updateConfig: (patch: Partial<WorkspaceConfig>) => Promise<void>;
  addStage: (stage: Omit<PipelineStageConfig, 'id' | 'order'>) => Promise<void>;
  updateStage: (stageId: string, patch: Partial<PipelineStageConfig>) => Promise<void>;
  deleteStage: (stageId: string) => Promise<void>;
  reorderStages: (sourceIndex: number, destIndex: number) => Promise<void>;
  addProduct: (product: Omit<ProductItemConfig, 'id'>) => Promise<void>;
  updateProduct: (productId: string, patch: Partial<ProductItemConfig>) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  addCriteria: (criteria: Omit<LeadQualificationCriteria, 'id'>) => Promise<void>;
  updateCriteria: (criteriaId: string, patch: Partial<LeadQualificationCriteria>) => Promise<void>;
  deleteCriteria: (criteriaId: string) => Promise<void>;
  // Quản lý nhân sự Staff theo workspace (Xem, Mời, Xóa, Lời mời)
  staffMembers: ManagedStaffItem[];
  fetchStaffList: (targetWsId?: string) => Promise<ManagedStaffItem[]>;
  createStaffMember: (data: { identifier?: string; email?: string; fullName?: string; phoneNumber?: string; password?: string; role?: typeof USER_ROLES.STAFF | typeof USER_ROLES.OWNER }, targetWsId?: string) => Promise<void>;
  deleteStaffMember: (staffId: string, targetWsId?: string, targetNewOwnerId?: string) => Promise<void>;
  transferOwnership?: (targetMemberId: string, leaveWorkspace?: boolean, targetWsId?: string) => Promise<any>;
  toggleStaffLock?: (targetId: string, lock: boolean, targetWsId?: string) => Promise<any>;
  setWorkspaceManagerPermission: (staffId: string, enabled: boolean, targetWsId?: string) => Promise<void>;
  cancelInvitation?: (targetId: string, targetWsId?: string) => Promise<void>;
  acceptInvitation?: (targetWsId: string) => Promise<any>;
  declineInvitation?: (targetWsId: string) => Promise<any>;
  resetToDefault: () => void;
  // Multi-Workspace & Switcher
  myWorkspaces: WorkspaceItem[];
  activeWorkspaceId: string;
  activeWorkspace: WorkspaceItem | null;
  isCurrentWorkspaceOwner: boolean;
  canManageWorkspace: boolean;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  fetchMyWorkspaces: () => Promise<WorkspaceItem[]>;
  createWorkspace: (data: {
    name: string;
    domain?: BusinessDomain | string;
  }) => Promise<WorkspaceItem | null>;
  updateWorkspaceInfo: (
    workspaceId: string,
    data: { name?: string; domain?: string },
  ) => Promise<WorkspaceItem>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
}

