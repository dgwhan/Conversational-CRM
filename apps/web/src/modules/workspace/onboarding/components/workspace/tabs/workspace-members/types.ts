import type { StaffRole } from "../../../../../../../features/auth/constants/auth.constants.js";
import type { ManagedStaffItem } from "../../../../../WorkspaceConfigContext.js";

export interface WorkspaceMembersTabProps {
  workspaceId: string;
  workspaceName: string;
  isOwner: boolean;
  canManageMembers?: boolean;
  currentStaffId: string;
  currentStaffEmail: string;
  staffMembers: ManagedStaffItem[];
  onRemoveMember: (
    memberId: string,
    memberName: string,
    memberRole?: string,
  ) => Promise<void>;
  onLeaveWorkspace: () => Promise<void>;
  onInviteMember: (identifier: string, role: StaffRole) => Promise<void>;
  onCancelInvitation?: (memberId: string, memberName: string) => Promise<void>;
  onSetWorkspaceManagerPermission?: (
    memberId: string,
    enabled: boolean,
  ) => Promise<void>;
  onTransferOwnership?: (
    targetMemberId: string,
    leaveWorkspace?: boolean,
  ) => void | Promise<any>;
  onToggleStaffLock?: (
    targetId: string,
    lock: boolean,
  ) => Promise<any>;
}

export interface CopyValueButtonProps {
  value: string;
  label: string;
}

export type MemberHandoverMode = "QUEUE" | "TRANSFER";

export interface HandoverCandidate {
  workspaceMemberId: string;
  isEligible: boolean;
  fullName: string;
  openConversations: number;
  effectiveCapacity: number;
}

export interface MemberHandoverDialogProps {
  member: ManagedStaffItem;
  roster: HandoverCandidate[];
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (mode: MemberHandoverMode, targetId?: string) => void;
}

export interface WorkspaceMemberRoutingStatus {
  assignmentLocked?: boolean;
  activeLeaveExceptionId?: string | null;
  isOnShift?: boolean;
  shifts?: string[];
  openConversations?: number;
  effectiveCapacity?: number;
}

export interface WorkspaceMembersTableProps {
  members: ManagedStaffItem[];
  effectiveSubTab: "members" | "invitations";
  memberSearch: string;
  isOwner: boolean;
  canManageMembers: boolean;
  currentStaffId: string;
  currentStaffEmail: string;
  canOwnerLeave: boolean;
  routingByMemberId: ReadonlyMap<string, WorkspaceMemberRoutingStatus>;
  onConfigureShift: (workspaceMemberId: string) => void;
  onToggleLeadLock: (
    member: ManagedStaffItem,
    isLocked: boolean,
  ) => void;
  onCancelInvitation: (
    memberId: string,
    displayName: string,
    role: string,
  ) => void;
  onLeaveWorkspace: () => void;
  onRemoveMember: (member: ManagedStaffItem) => void;
  onSetWorkspaceManagerPermission?: (
    memberId: string,
    enabled: boolean,
  ) => Promise<void>;
  onTransferOwnership?: (
    targetMemberId: string,
    leaveWorkspace?: boolean,
  ) => void | Promise<any>;
  onToggleStaffLock?: (
    targetId: string,
    lock: boolean,
  ) => Promise<any>;
}

