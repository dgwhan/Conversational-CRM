import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Headers,
  Req,
} from '@nestjs/common';
import { StaffManagementService } from '../../application/staff-management/index.js';
import { WorkspaceRole } from '../../domain/index.js';
import { resolveCallerId } from '../../application/workspace-resolver.js';
import type {
  CreateStaffRequestDto,
  StaffItemResponseDto,
  UpdateStaffPermissionsRequestDto,
  ToggleStaffLockRequestDto,
} from '../dto/index.js';
import { Roles } from '../../../../common/decorators/roles.decorator.js';
import { WorkspacePermission, WorkspacePermissions } from '../../../../common/decorators/workspace-permissions.decorator.js';
import { WorkspaceRolesGuard } from '../../../../common/guards/workspace-roles.guard.js';

@Controller('workspaces/current/staff')
@UseGuards(WorkspaceRolesGuard)
export class StaffManagementController {
  constructor(private readonly staffService: StaffManagementService) { }

  /**
   * Danh sách nhân viên thuộc Workspace
   * Ưu tiên callerId từ JWT Token (req.user.id) và workspaceId từ Query param
   */
  @Get()
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.MANAGER, WorkspaceRole.STAFF)
  async getStaffList(
    @Req() req: any,
    @Query('workspaceId') queryWsId?: string,
    @Headers('x-workspace-id') headerWsId?: string,
    @Headers('x-owner-id') ownerId?: string,
    @Headers('x-staff-id') staffId?: string,
  ): Promise<StaffItemResponseDto[]> {
    const callerId = req.user?.id || resolveCallerId(req, ownerId, staffId);
    const targetWsId = queryWsId || headerWsId;
    return this.staffService.getStaffList(callerId, targetWsId);
  }

  @Get('permissions')
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.MANAGER, WorkspaceRole.STAFF)
  async getPermissions(
    @Req() req: any,
    @Query('workspaceId') queryWsId?: string,
    @Headers('x-workspace-id') headerWsId?: string,
  ) {
    const callerId = resolveCallerId(req);
    return this.staffService.getWorkspacePermissions(callerId, queryWsId || headerWsId);
  }

  @Patch(':id/permissions')
  @Roles(WorkspaceRole.OWNER)
  async updateMemberPermissions(
    @Req() req: any,
    @Param('id') targetUserId: string,
    @Body() dto: UpdateStaffPermissionsRequestDto & { role?: WorkspaceRole },
    @Query('workspaceId') queryWsId?: string,
    @Headers('x-workspace-id') headerWsId?: string,
  ) {
    let isManager = dto?.isWorkspaceManager;
    if (dto?.role) {
      isManager = dto.role === WorkspaceRole.MANAGER;
    }
    if (typeof isManager !== 'boolean') {
      throw new BadRequestException('isWorkspaceManager hoặc role không hợp lệ.');
    }
    const callerId = resolveCallerId(req);
    return this.staffService.setWorkspaceManagerPermission(
      callerId,
      targetUserId,
      isManager,
      queryWsId || headerWsId,
    );
  }

  @Patch(':id/role')
  @Roles(WorkspaceRole.OWNER)
  async updateMemberRole(
    @Req() req: any,
    @Param('id') targetUserId: string,
    @Body() dto: { role: WorkspaceRole },
    @Query('workspaceId') queryWsId?: string,
    @Headers('x-workspace-id') headerWsId?: string,
  ) {
    if (dto?.role !== WorkspaceRole.MANAGER && dto?.role !== WorkspaceRole.STAFF) {
      throw new BadRequestException('Role phải là MANAGER hoặc STAFF.');
    }
    const callerId = resolveCallerId(req);
    return this.staffService.setWorkspaceManagerPermission(
      callerId,
      targetUserId,
      dto.role === WorkspaceRole.MANAGER,
      queryWsId || headerWsId,
    );
  }

  /**
   * Khóa hoặc Mở khóa tài khoản thành viên trong Workspace (OWNER hoặc MANAGER)
   */
  @Patch(':id/lock')
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.MANAGER)
  async toggleStaffLock(
    @Req() req: any,
    @Param('id') targetUserId: string,
    @Body() dto: ToggleStaffLockRequestDto,
    @Query('workspaceId') queryWsId?: string,
    @Headers('x-workspace-id') headerWsId?: string,
  ) {
    if (typeof dto?.lock !== 'boolean') {
      throw new BadRequestException('Trường "lock" (kiểu boolean) là bắt buộc.');
    }
    const callerId = resolveCallerId(req);
    return this.staffService.toggleStaffLock(
      callerId,
      targetUserId,
      dto.lock,
      queryWsId || headerWsId,
    );
  }

  /**
   * Mời nhân viên đã có tài khoản vào Workspace
   */
  @Post()
  @WorkspacePermissions(WorkspacePermission.MANAGE_STAFF)
  async createStaff(
    @Req() req: any,
    @Body() dto: CreateStaffRequestDto,
    @Query('workspaceId') queryWsId?: string,
    @Headers('x-workspace-id') headerWsId?: string,
    @Headers('x-owner-id') ownerId?: string,
    @Headers('x-staff-id') staffId?: string,
  ): Promise<StaffItemResponseDto> {
    const callerId = req.user?.id || resolveCallerId(req, ownerId, staffId);
    const targetWsId = queryWsId || headerWsId;
    return this.staffService.createStaff(callerId, dto, targetWsId);
  }

  /**
   * Xóa nhân viên khỏi Không gian làm việc hoặc Rời khỏi Không gian làm việc
   */
  @Delete(':id')
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.MANAGER, WorkspaceRole.STAFF)
  async deleteStaff(
    @Req() req: any,
    @Param('id') targetStaffId: string,
    @Query('workspaceId') queryWsId?: string,
    @Query('targetNewOwnerId') targetNewOwnerId?: string,
    @Headers('x-workspace-id') headerWsId?: string,
    @Headers('x-owner-id') ownerId?: string,
    @Headers('x-staff-id') staffId?: string,
  ): Promise<{ success: boolean; message: string }> {
    const callerId = req.user?.id || resolveCallerId(req, ownerId, staffId);
    const targetWsId = queryWsId || headerWsId;
    return this.staffService.removeStaff(
      callerId,
      targetStaffId,
      targetWsId,
      targetNewOwnerId,
    );
  }

  /**
   * Chủ sở hữu hủy lời mời đã gửi (chưa được chấp nhận)
   */
  @Delete('invitations/:id')
  @WorkspacePermissions(WorkspacePermission.MANAGE_STAFF)
  async cancelInvitation(
    @Req() req: any,
    @Param('id') targetId: string,
    @Query('workspaceId') queryWsId?: string,
    @Headers('x-workspace-id') headerWsId?: string,
    @Headers('x-owner-id') ownerId?: string,
    @Headers('x-staff-id') staffId?: string,
  ): Promise<{ success: boolean; message: string }> {
    const callerId = req.user?.id || resolveCallerId(req, ownerId, staffId);
    const targetWsId = queryWsId || headerWsId;
    return this.staffService.cancelInvitation(callerId, targetId, targetWsId);
  }
}
