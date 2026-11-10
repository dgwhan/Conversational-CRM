import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { StaffManagementService } from '../../application/staff-management/index.js';
import { WorkspaceRole } from '../../domain/index.js';
import type {
  CreateStaffRequestDto,
  StaffItemResponseDto,
} from '../dto/index.js';
import { Roles } from '../../../../common/decorators/roles.decorator.js';
import { WorkspaceRolesGuard } from '../../../../common/guards/workspace-roles.guard.js';

@Controller('workspaces/current/staff')
@UseGuards(WorkspaceRolesGuard)
export class StaffManagementController {
  constructor(private readonly staffService: StaffManagementService) {}

  /**
   * 1. XEM: Lấy danh sách nhân viên thuộc Workspace (Cả Owner và Staff đều có quyền xem)
   */
  @Get()
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.STAFF)
  async getStaffList(
    @Headers('x-owner-id') ownerId?: string,
    @Headers('x-staff-id') staffId?: string,
    @Headers('x-workspace-id') workspaceId?: string,
  ): Promise<StaffItemResponseDto[]> {
    return this.staffService.getStaffList(ownerId || staffId || '', workspaceId);
  }

  /**
   * 2. MỜI: Mời nhân viên đã có tài khoản trên IAM vào Workspace
   */
  @Post()
  @Roles(WorkspaceRole.OWNER)
  async createStaff(
    @Body() dto: CreateStaffRequestDto,
    @Headers('x-owner-id') ownerId?: string,
    @Headers('x-staff-id') staffId?: string,
    @Headers('x-workspace-id') workspaceId?: string,
  ): Promise<StaffItemResponseDto> {
    return this.staffService.createStaff(ownerId || staffId || '', dto, workspaceId);
  }

  /**
   * 3. XÓA: Xóa nhân viên khỏi Không gian làm việc hoặc Rời khỏi Không gian làm việc
   */
  @Delete(':id')
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.STAFF)
  async deleteStaff(
    @Param('id') targetStaffId: string,
    @Headers('x-owner-id') ownerId?: string,
    @Headers('x-staff-id') staffId?: string,
    @Headers('x-workspace-id') workspaceId?: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.staffService.removeStaff(ownerId || staffId || '', targetStaffId, workspaceId);
  }
}
