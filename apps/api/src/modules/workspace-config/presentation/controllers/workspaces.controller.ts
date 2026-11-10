import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { WorkspaceConfigService } from '../../application/workspace-config/index.js';
import { WorkspaceRolesGuard } from '../../../../common/guards/workspace-roles.guard.js';
import { Roles } from '../../../../common/decorators/roles.decorator.js';
import { WorkspaceRole } from '../../domain/index.js';
import type { WorkspaceConfig } from '../../../../contracts/workspace-config.js';
import type {
  CreateWorkspaceRequestDto,
  UpdateWorkspaceRequestDto,
  UpdateWorkspaceConfigRequestDto,
  CreateHotlineRequestDto,
  UpdateHotlineRequestDto,
  WorkspaceItemResponseDto,
  WorkspaceHotlineResponseDto,
  DeleteWorkspaceResponseDto,
  DeleteHotlineResponseDto,
} from '../dto/index.js';

@Controller('workspaces')
@UseGuards(WorkspaceRolesGuard)
export class WorkspacesController {
  constructor(private readonly configService: WorkspaceConfigService) {}

  /**
   * Lấy danh sách tất cả Workspace mà tài khoản hiện tại sở hữu hoặc là thành viên
   */
  @Get('my-workspaces')
  async getMyWorkspaces(
    @Headers('x-staff-id') staffId?: string,
    @Headers('x-owner-id') ownerId?: string,
  ): Promise<WorkspaceItemResponseDto[]> {
    return this.configService.getMyWorkspaces(staffId, ownerId);
  }

  /**
   * Tạo mới Không gian làm việc (Workspace) kèm thiết lập doanh nghiệp
   * Người tạo trực tiếp làm Chủ sở hữu (Owner) của Workspace vừa tạo
   */
  @Post()
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.STAFF)
  async createWorkspace(
    @Body() body: CreateWorkspaceRequestDto,
    @Headers('x-staff-id') staffId?: string,
    @Headers('x-owner-id') ownerId?: string,
  ): Promise<WorkspaceItemResponseDto> {
    return this.configService.createWorkspace(body, staffId, ownerId);
  }

  /**
   * Cập nhật thông tin Không gian làm việc (Tên, Ngành nghề)
   */
  @Patch(':id')
  @Roles(WorkspaceRole.OWNER)
  async updateWorkspace(
    @Param('id') workspaceId: string,
    @Body() body: UpdateWorkspaceRequestDto,
    @Headers('x-staff-id') staffId?: string,
    @Headers('x-owner-id') ownerId?: string,
  ): Promise<WorkspaceItemResponseDto> {
    const callerId = ownerId || staffId;
    return this.configService.updateWorkspace(workspaceId, body, callerId);
  }

  /**
   * Xóa Không gian làm việc
   */
  @Delete(':id')
  @Roles(WorkspaceRole.OWNER)
  async deleteWorkspace(
    @Param('id') workspaceId: string,
    @Headers('x-staff-id') staffId?: string,
    @Headers('x-owner-id') ownerId?: string,
  ): Promise<DeleteWorkspaceResponseDto> {
    const callerId = ownerId || staffId;
    return this.configService.deleteWorkspace(workspaceId, callerId);
  }

  /**
   * Lấy cấu hình của một Workspace cụ thể theo ID
   */
  @Get(':id/config')
  async getWorkspaceConfig(
    @Param('id') workspaceId: string,
    @Headers('x-owner-id') ownerId?: string,
    @Headers('x-staff-id') staffId?: string,
  ): Promise<WorkspaceConfig> {
    return this.configService.getConfig(workspaceId, ownerId, staffId);
  }

  /**
   * Cập nhật cấu hình của một Workspace cụ thể theo ID
   */
  @Put(':id/config')
  @Roles(WorkspaceRole.OWNER)
  async updateWorkspaceConfig(
    @Param('id') workspaceId: string,
    @Body() body: UpdateWorkspaceConfigRequestDto,
    @Headers('x-owner-id') ownerId?: string,
    @Headers('x-staff-id') staffId?: string,
  ): Promise<WorkspaceConfig> {
    return this.configService.updateConfig(workspaceId, body, ownerId, staffId);
  }

  /**
   * Lấy danh sách số Hotline của Không gian làm việc
   */
  @Get(':id/hotlines')
  async getHotlines(@Param('id') workspaceId: string): Promise<WorkspaceHotlineResponseDto[]> {
    return this.configService.getHotlines(workspaceId);
  }

  /**
   * Thêm số Hotline mới cho Không gian làm việc
   */
  @Post(':id/hotlines')
  @Roles(WorkspaceRole.OWNER)
  async createHotline(
    @Param('id') workspaceId: string,
    @Body() body: CreateHotlineRequestDto,
    @Headers('x-staff-id') staffId?: string,
    @Headers('x-owner-id') ownerId?: string,
  ): Promise<WorkspaceHotlineResponseDto> {
    return this.configService.createHotline(workspaceId, body, staffId, ownerId);
  }

  /**
   * Cập nhật thông tin hoặc trạng thái số Hotline
   */
  @Patch(':id/hotlines/:hotlineId')
  @Roles(WorkspaceRole.OWNER)
  async updateHotline(
    @Param('id') workspaceId: string,
    @Param('hotlineId') hotlineId: string,
    @Body() body: UpdateHotlineRequestDto,
    @Headers('x-staff-id') staffId?: string,
    @Headers('x-owner-id') ownerId?: string,
  ): Promise<WorkspaceHotlineResponseDto> {
    return this.configService.updateHotline(workspaceId, hotlineId, body, staffId, ownerId);
  }

  /**
   * Xóa số Hotline khỏi Không gian làm việc
   */
  @Delete(':id/hotlines/:hotlineId')
  @Roles(WorkspaceRole.OWNER)
  async deleteHotline(
    @Param('id') workspaceId: string,
    @Param('hotlineId') hotlineId: string,
    @Headers('x-staff-id') staffId?: string,
    @Headers('x-owner-id') ownerId?: string,
  ): Promise<DeleteHotlineResponseDto> {
    return this.configService.deleteHotline(workspaceId, hotlineId, staffId, ownerId);
  }
}
