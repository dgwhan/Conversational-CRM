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
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.STAFF)
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
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.STAFF)
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
    @Body() dto: UpdateStaffPermissionsRequestDto,
    @Query('workspaceId') queryWsId?: string,
    @Headers('x-workspace-id') headerWsId?: string,
  ) {
    if (typeof dto?.isWorkspaceManager !== 'boolean') {
      throw new BadRequestException('isWorkspaceManager phải là boolean.');
    }
    const callerId = resolveCallerId(req);
    return this.staffService.setWorkspaceManagerPermission(
      callerId,
      targetUserId,
      dto.isWorkspaceManager,
      queryWsId || headerWsId,
    );
  }

  /**
   * Mời nhân viên đã có tài khoản vào Workspace
   */
  @Post()
  @WorkspacePermissions(WorkspacePermission.MANAGE_WORKSPACE)
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
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.STAFF)
  async deleteStaff(
    @Req() req: any,
    @Param('id') targetStaffId: string,
    @Query('workspaceId') queryWsId?: string,
    @Headers('x-workspace-id') headerWsId?: string,
    @Headers('x-owner-id') ownerId?: string,
    @Headers('x-staff-id') staffId?: string,
  ): Promise<{ success: boolean; message: string }> {
    const callerId = req.user?.id || resolveCallerId(req, ownerId, staffId);
    const targetWsId = queryWsId || headerWsId;
    return this.staffService.removeStaff(callerId, targetStaffId, targetWsId);
  }

  /**
   * Chủ sở hữu hủy lời mời đã gửi (chưa được chấp nhận)
   */
  @Delete('invitations/:id')
  @WorkspacePermissions(WorkspacePermission.MANAGE_WORKSPACE)
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
