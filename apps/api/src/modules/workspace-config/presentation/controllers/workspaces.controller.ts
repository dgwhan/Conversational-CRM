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
  Req,
} from '@nestjs/common';
import { WorkspaceConfigService } from '../../application/workspace-config/index.js';
import { WorkspaceRolesGuard } from '../../../../common/guards/workspace-roles.guard.js';
import { Roles } from '../../../../common/decorators/roles.decorator.js';
import { WorkspaceRole } from '../../domain/index.js';
import { resolveCallerId } from '../../application/workspace-resolver.js';
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
  constructor(private readonly configService: WorkspaceConfigService) { }

  /**
   * Lấy danh sách tất cả Workspace mà tài khoản hiện tại sở hữu hoặc là thành viên
   */
  @Get('my-workspaces')
  async getMyWorkspaces(
    @Req() req: any,
    @Headers('x-staff-id') staffId?: string,
    @Headers('x-owner-id') ownerId?: string,
  ): Promise<WorkspaceItemResponseDto[]> {
    const callerId = resolveCallerId(req, ownerId, staffId);
    return this.configService.getMyWorkspaces(callerId);
  }

  /**
   * Tạo mới Không gian làm việc (Workspace) kèm thiết lập doanh nghiệp
   * Người tạo trực tiếp làm Chủ sở hữu (Owner) của Workspace vừa tạo
   */
  @Post()
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.STAFF)
  async createWorkspace(
    @Req() req: any,
    @Body() body: CreateWorkspaceRequestDto,
    @Headers('x-staff-id') staffId?: string,
    @Headers('x-owner-id') ownerId?: string,
  ): Promise<WorkspaceItemResponseDto> {
    const callerId = resolveCallerId(req, ownerId, staffId);
    return this.configService.createWorkspace(body, callerId);
  }

  /**
   * Cập nhật thông tin Không gian làm việc (Tên, Ngành nghề)
   */
  @Patch(':id')
  @Roles(WorkspaceRole.OWNER)
  async updateWorkspace(
    @Req() req: any,
    @Param('id') workspaceId: string,
    @Body() body: UpdateWorkspaceRequestDto,
    @Headers('x-staff-id') staffId?: string,
    @Headers('x-owner-id') ownerId?: string,
  ): Promise<WorkspaceItemResponseDto> {
    const callerId = resolveCallerId(req, ownerId, staffId);
    return this.configService.updateWorkspace(workspaceId, body, callerId);
  }

  /**
   * Xóa Không gian làm việc
   */
  @Delete(':id')
  @Roles(WorkspaceRole.OWNER)
  async deleteWorkspace(
    @Req() req: any,
    @Param('id') workspaceId: string,
    @Headers('x-staff-id') staffId?: string,
    @Headers('x-owner-id') ownerId?: string,
  ): Promise<DeleteWorkspaceResponseDto> {
    const callerId = resolveCallerId(req, ownerId, staffId);
    return this.configService.deleteWorkspace(workspaceId, callerId);
  }

  /**
   * Lấy cấu hình của một Workspace cụ thể theo ID
   */
  @Get(':id/config')
  async getWorkspaceConfig(
    @Req() req: any,
    @Param('id') workspaceId: string,
    @Headers('x-owner-id') ownerId?: string,
    @Headers('x-staff-id') staffId?: string,
  ): Promise<WorkspaceConfig> {
    const callerId = resolveCallerId(req, ownerId, staffId);
    return this.configService.getConfig(workspaceId, callerId);
  }

  /**
   * Cập nhật cấu hình của một Workspace cụ thể theo ID
   */
  @Put(':id/config')
  @Roles(WorkspaceRole.OWNER)
  async updateWorkspaceConfig(
    @Req() req: any,
    @Param('id') workspaceId: string,
    @Body() body: UpdateWorkspaceConfigRequestDto,
    @Headers('x-owner-id') ownerId?: string,
    @Headers('x-staff-id') staffId?: string,
  ): Promise<WorkspaceConfig> {
    const callerId = resolveCallerId(req, ownerId, staffId);
    return this.configService.updateConfig(workspaceId, body, callerId);
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
    @Req() req: any,
    @Param('id') workspaceId: string,
    @Body() body: CreateHotlineRequestDto,
    @Headers('x-staff-id') staffId?: string,
    @Headers('x-owner-id') ownerId?: string,
  ): Promise<WorkspaceHotlineResponseDto> {
    const callerId = resolveCallerId(req, ownerId, staffId);
    return this.configService.createHotline(workspaceId, body, callerId);
  }

  /**
   * Cập nhật thông tin hoặc trạng thái số Hotline
   */
  @Patch(':id/hotlines/:hotlineId')
  @Roles(WorkspaceRole.OWNER)
  async updateHotline(
    @Req() req: any,
    @Param('id') workspaceId: string,
    @Param('hotlineId') hotlineId: string,
    @Body() body: UpdateHotlineRequestDto,
    @Headers('x-staff-id') staffId?: string,
    @Headers('x-owner-id') ownerId?: string,
  ): Promise<WorkspaceHotlineResponseDto> {
    const callerId = resolveCallerId(req, ownerId, staffId);
    return this.configService.updateHotline(workspaceId, hotlineId, body, callerId);
  }

  /**
   * Xóa số Hotline khỏi Không gian làm việc
   */
  @Delete(':id/hotlines/:hotlineId')
  @Roles(WorkspaceRole.OWNER)
  async deleteHotline(
    @Req() req: any,
    @Param('id') workspaceId: string,
    @Param('hotlineId') hotlineId: string,
    @Headers('x-staff-id') staffId?: string,
    @Headers('x-owner-id') ownerId?: string,
  ): Promise<DeleteHotlineResponseDto> {
    const callerId = resolveCallerId(req, ownerId, staffId);
    return this.configService.deleteHotline(workspaceId, hotlineId, callerId);
  }
}
