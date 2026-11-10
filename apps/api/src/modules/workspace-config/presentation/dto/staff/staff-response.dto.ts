import { UserStatus } from "@prisma/client";
import { WorkspaceRole } from "../../../domain/index.js";

export interface StaffItemResponseDto {
  id: string;
  email: string;
  phoneNumber?: string | null;
  fullName: string;
  role: WorkspaceRole;
  status: UserStatus;
  ownerId: string | null;
  lockedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Aliases for compatibility
export type StaffItemResponse = StaffItemResponseDto;
export type StaffListResponseDto = StaffItemResponseDto[];
