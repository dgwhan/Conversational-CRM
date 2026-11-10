import { WorkspaceRole } from "../../../domain/index.js";

export interface CreateStaffRequestDto {
  identifier?: string;
  email?: string;
  phoneNumber?: string;
  fullName?: string;
  password?: string;
  role: WorkspaceRole;
}

export interface UpdateStaffRequestDto {
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  password?: string;
  role?: WorkspaceRole;
}

export interface ToggleStaffLockRequestDto {
  lock: boolean;
}

// Aliases for compatibility
export type CreateStaffDto = CreateStaffRequestDto;
export type UpdateStaffDto = UpdateStaffRequestDto;
export type LockStaffDto = ToggleStaffLockRequestDto;
