import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../platform/database/prisma.service.js';
import {
  findUserByIdentifier as commonFindUser,
  USER_IDENTIFIER_CONFIG,
  type UserIdentifierLabel,
} from '../../../../common/configs/index.js';
import { WorkspaceRole } from '../../domain/index.js';
import type { StaffItemResponse, CreateStaffDto } from '../../presentation/dto/index.js';
import {
  findTargetWorkspace,
  resolveOwnerId,
  getCurrentUserAndRole,
} from '../workspace-resolver.js';
import { getStaffList } from './operations/staff-query.js';
import { createStaff } from './operations/staff-invite.js';
import { removeStaff } from './operations/staff-removal.js';
import { getWorkspacePermissions, setWorkspaceManagerPermission } from './operations/staff-permissions.js';
import { toggleStaffLock } from './operations/staff-lock.js';
import {
  getInvitationDetails,
  acceptInvitation,
  declineInvitation,
  cancelInvitation,
} from './operations/invitations/index.js';

export type { CreateStaffDto, StaffItemResponse } from '../../presentation/dto/index.js';

/**
 * Service quản lý nhân sự (Staff Management Service)
 *
 * Cung cấp API quản lý thành viên cho Không gian làm việc.
 * Logic chi tiết được tách nhỏ trong thư mục `operations/`.
 */
@Injectable()
export class StaffManagementService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Tìm workspace mục tiêu theo workspaceId hoặc ownerId
   */
  findTargetWorkspace(workspaceId?: string, ownerId?: string) {
    return findTargetWorkspace(this.prisma, workspaceId, ownerId);
  }

  /**
   * Xác định ID của Chủ sở hữu của workspace hiện tại
   */
  resolveOwnerId(ownerId?: string, currentStaffId?: string): Promise<string> {
    return resolveOwnerId(this.prisma, ownerId, currentStaffId);
  }

  /**
   * Tìm kiếm người dùng dựa trên Email hoặc Số điện thoại (sử dụng cấu hình chung hệ thống)
   */
  findUserByIdentifier(
    rawInput: string
  ): Promise<{ user: any; identifierType: UserIdentifierLabel }> {
    return commonFindUser(this.prisma, rawInput);
  }

  /**
   * Lấy thông tin tài khoản người gọi và vai trò tương ứng trong workspace
   */
  getCurrentUserAndRole(
    callerId: string,
    workspaceOrId?: any
  ): Promise<{ currentUser: any; role: WorkspaceRole }> {
    return getCurrentUserAndRole(this.prisma, callerId, workspaceOrId);
  }

  /**
   * Lấy danh sách thành viên trong workspace
   */
  getStaffList(
    callerId: string,
    workspaceId?: string
  ): Promise<StaffItemResponse[]> {
    return getStaffList(this.prisma, callerId, workspaceId);
  }

  getWorkspacePermissions(callerId: string, workspaceId?: string) {
    return getWorkspacePermissions(this.prisma, callerId, workspaceId);
  }

  setWorkspaceManagerPermission(
    callerId: string,
    targetUserId: string,
    isWorkspaceManager: boolean,
    workspaceId?: string,
  ) {
    return setWorkspaceManagerPermission(this.prisma, callerId, targetUserId, isWorkspaceManager, workspaceId);
  }

  /**
   * Mời / thêm thành viên mới vào workspace (chỉ OWNER có quyền)
   */
  createStaff(
    ownerId: string,
    dto: CreateStaffDto,
    workspaceId?: string
  ): Promise<StaffItemResponse> {
    return createStaff(this.prisma, ownerId, dto, workspaceId);
  }

  /**
   * Gỡ thành viên ra khỏi workspace hoặc tự rời (nếu Owner rời thì có thể chuyển nhượng targetNewOwnerId)
   */
  removeStaff(
    ownerId: string,
    targetStaffId: string,
    workspaceId?: string,
    targetNewOwnerId?: string,
  ): Promise<{ success: boolean; message: string }> {
    return removeStaff(this.prisma, ownerId, targetStaffId, workspaceId, targetNewOwnerId);
  }

  /**
   * Lấy chi tiết lời mời theo invitationId (Chống Broken Access Control)
   */
  getInvitationDetails(callerId: string, invitationId: string) {
    return getInvitationDetails(this.prisma, callerId, invitationId);
  }

  /**
   * Chấp nhận lời mời tham gia workspace (dành cho người được mời)
   */
  acceptInvitation(
    callerId: string,
    workspaceId: string
  ): Promise<{ success: boolean; message: string; workspace: any }> {
    return acceptInvitation(this.prisma, callerId, workspaceId);
  }

  /**
   * Từ chối lời mời tham gia workspace
   */
  declineInvitation(
    callerId: string,
    workspaceId: string
  ): Promise<{ success: boolean; message: string }> {
    return declineInvitation(this.prisma, callerId, workspaceId);
  }

  /**
   * Hủy lời mời tham gia workspace (chỉ OWNER có quyền)
   */
  cancelInvitation(
    ownerId: string,
    targetStaffIdOrMemberId: string,
    workspaceId?: string
  ): Promise<{ success: boolean; message: string }> {
    return cancelInvitation(this.prisma, ownerId, targetStaffIdOrMemberId, workspaceId);
  }

  /**
   * Khóa hoặc Mở khóa tài khoản thành viên trong workspace (Chỉ OWNER có quyền)
   */
  toggleStaffLock(
    callerId: string,
    targetUserId: string,
    lock: boolean,
    workspaceId?: string,
  ): Promise<{ success: boolean; userId: string; locked: boolean; message: string }> {
    return toggleStaffLock(this.prisma, callerId, targetUserId, lock, workspaceId);
  }
}

