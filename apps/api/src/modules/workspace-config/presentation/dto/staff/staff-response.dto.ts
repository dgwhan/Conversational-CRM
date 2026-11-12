import { UserStatus, WorkspaceMemberStatus } from "@prisma/client";
import { WorkspaceRole } from "../../../domain/index.js";

export interface StaffItemResponseDto {
  id: string;
  email: string;
  phoneNumber?: string | null;
  fullName: string;
  role: WorkspaceRole;
  status: UserStatus;
  memberStatus?: WorkspaceMemberStatus;
  memberId?: string;
  assignmentLocked?: boolean;
  isWorkspaceManager?: boolean;
  invitedAt?: Date | null;
  joinedAt?: Date | null;
  invitedBy?: { id: string; fullName: string; email: string } | null;
  ownerId: string | null;
  lockedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Aliases for compatibility
export type StaffItemResponse = StaffItemResponseDto;
export type StaffListResponseDto = StaffItemResponseDto[];
