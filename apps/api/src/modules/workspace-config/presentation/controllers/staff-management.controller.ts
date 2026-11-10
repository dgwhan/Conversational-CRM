import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
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
} from '../dto/index.js';
import { Roles } from '../../../../common/decorators/roles.decorator.js';
import { WorkspaceRolesGuard } from '../../../../common/guards/workspace-roles.guard.js';

@Controller('workspaces/current/staff')
@UseGuards(WorkspaceRolesGuard)
export class StaffManagementController {
  constructor(private readonly staffService: StaffManagementService) { }

  /**
   * 1. XEM: Lấy danh sách nhân viên thuộc Workspace (Cả Owner và Staff đều có quyền xem)
   */
  @Get()
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.STAFF)
  async getStaffList(
    @Req() req: any,
    @Headers('x-owner-id') ownerId?: string,
    @Headers('x-staff-id') staffId?: string,
    @Headers('x-workspace-id') workspaceId?: string,
  ): Promise<StaffItemResponseDto[]> {
    const callerId = resolveCallerId(req, ownerId, staffId);
    return this.staffService.getStaffList(callerId, workspaceId);
  }

  /**
   * 2. MỜI: Mời nhân viên đã có tài khoản trên IAM vào Workspace
   */
  @Post()
  @Roles(WorkspaceRole.OWNER)
  async createStaff(
    @Req() req: any,
    @Body() dto: CreateStaffRequestDto,
    @Headers('x-owner-id') ownerId?: string,
    @Headers('x-staff-id') staffId?: string,
    @Headers('x-workspace-id') workspaceId?: string,
  ): Promise<StaffItemResponseDto> {
    const callerId = resolveCallerId(req, ownerId, staffId);
    return this.staffService.createStaff(callerId, dto, workspaceId);
  }

  /**
   * 3. XÓA: Xóa nhân viên khỏi Không gian làm việc hoặc Rời khỏi Không gian làm việc
   */
  @Delete(':id')
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.STAFF)
  async deleteStaff(
    @Req() req: any,
    @Param('id') targetStaffId: string,
    @Headers('x-owner-id') ownerId?: string,
    @Headers('x-staff-id') staffId?: string,
    @Headers('x-workspace-id') workspaceId?: string,
  ): Promise<{ success: boolean; message: string }> {
    const callerId = resolveCallerId(req, ownerId, staffId);
    return this.staffService.removeStaff(callerId, targetStaffId, workspaceId);
  }
}
