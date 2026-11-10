import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Headers,
  Req,
} from '@nestjs/common';
import { WorkspaceConfigService } from '../../application/workspace-config/index.js';
import { Roles } from '../../../../common/decorators/roles.decorator.js';
import { WorkspaceRolesGuard } from '../../../../common/guards/workspace-roles.guard.js';
import { WorkspaceRole } from '../../domain/index.js';
import { resolveCallerId } from '../../application/workspace-resolver.js';
import type { WorkspaceConfig } from '../../../../contracts/workspace-config.js';
import type {
  UpdateWorkspaceConfigRequestDto,
  ApplyPresetRequestDto,
  AddPipelineStageRequestDto,
  AddProductItemRequestDto,
  AddCriteriaRequestDto,
  PresetListResponseDto,
  WorkspaceItemResponseDto,
} from '../dto/index.js';

@Controller('workspaces/current')
@UseGuards(WorkspaceRolesGuard)
export class WorkspaceConfigController {
  constructor(private readonly configService: WorkspaceConfigService) { }

  /**
   * Lấy danh sách các workspace của người dùng hiện tại
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
   * Lấy cấu hình của workspace hiện tại theo ownerId (mở cho cả Owner, Admin và Agent để đồng bộ UI)
   */
  @Get('config')
  async getConfig(
    @Req() req: any,
    @Headers('x-workspace-id') workspaceId?: string,
    @Headers('x-owner-id') ownerId?: string,
    @Headers('x-staff-id') staffId?: string,
  ): Promise<WorkspaceConfig> {
    const callerId = resolveCallerId(req, ownerId, staffId);
    return this.configService.getConfig(workspaceId || '', callerId);
  }

  /**
   * Lấy danh sách các mẫu ngành nghề định sẵn (Education, Real Estate, Spa, SaaS, Retail)
   */
  @Get('presets')
  getPresets(): PresetListResponseDto {
    return this.configService.getPresetsList();
  }

  /**
   * Cập nhật cấu hình workspace theo ownerId (Chỉ Chủ Doanh Nghiệp hoặc Admin)
   */
  @Put('config')
  @Roles(WorkspaceRole.OWNER)
  async updateConfig(
    @Req() req: any,
    @Body() payload: UpdateWorkspaceConfigRequestDto,
    @Headers('x-workspace-id') workspaceId?: string,
    @Headers('x-owner-id') ownerId?: string,
    @Headers('x-staff-id') staffId?: string,
  ): Promise<WorkspaceConfig> {
    const callerId = resolveCallerId(req, ownerId, staffId);
    return this.configService.updateConfig(workspaceId || '', payload, callerId);
  }

  /**
   * Áp dụng mẫu ngành nghề 1-click (Chỉ Chủ Doanh Nghiệp hoặc Admin)
   */
  @Post('config/apply-preset')
  @Roles(WorkspaceRole.OWNER)
  async applyPreset(
    @Req() req: any,
    @Body() body: ApplyPresetRequestDto,
    @Headers('x-workspace-id') workspaceId?: string,
    @Headers('x-owner-id') ownerId?: string,
    @Headers('x-staff-id') staffId?: string,
  ): Promise<WorkspaceConfig> {
    const callerId = resolveCallerId(req, ownerId, staffId);
    return this.configService.applyPreset(
      workspaceId || '',
      body.presetKey,
      body.workspaceName,
      callerId,
    );
  }

  /**
   * Thêm giai đoạn mới vào phễu (Chỉ Chủ Doanh Nghiệp hoặc Admin)
   */
  @Post('config/stages')
  @Roles(WorkspaceRole.OWNER)
  async addStage(
    @Req() req: any,
    @Body() stage: AddPipelineStageRequestDto,
    @Headers('x-workspace-id') workspaceId?: string,
    @Headers('x-owner-id') ownerId?: string,
    @Headers('x-staff-id') staffId?: string,
  ): Promise<WorkspaceConfig> {
    const callerId = resolveCallerId(req, ownerId, staffId);
    return this.configService.addStage(workspaceId || '', stage, callerId);
  }

  /**
   * Thêm sản phẩm / khóa học / ngành đào tạo mới (Chỉ Chủ Doanh Nghiệp hoặc Admin)
   */
  @Post('config/products')
  @Roles(WorkspaceRole.OWNER)
  async addProduct(
    @Req() req: any,
    @Body() product: AddProductItemRequestDto,
    @Headers('x-workspace-id') workspaceId?: string,
    @Headers('x-owner-id') ownerId?: string,
    @Headers('x-staff-id') staffId?: string,
  ): Promise<WorkspaceConfig> {
    const callerId = resolveCallerId(req, ownerId, staffId);
    return this.configService.addProduct(workspaceId || '', product, callerId);
  }

  /**
   * Thêm tiêu chí đánh giá / phân loại mới (Chỉ Chủ Doanh Nghiệp hoặc Admin)
   */
  @Post('config/criteria')
  @Roles(WorkspaceRole.OWNER)
  async addCriteria(
    @Req() req: any,
    @Body() criteria: AddCriteriaRequestDto,
    @Headers('x-workspace-id') workspaceId?: string,
    @Headers('x-owner-id') ownerId?: string,
    @Headers('x-staff-id') staffId?: string,
  ): Promise<WorkspaceConfig> {
    const callerId = resolveCallerId(req, ownerId, staffId);
    return this.configService.addCriteria(workspaceId || '', criteria, callerId);
  }

  /**
   * Xóa tiêu chí (Chỉ Chủ Doanh Nghiệp hoặc Admin)
   */
  @Delete('config/criteria/:criteriaId')
  @Roles(WorkspaceRole.OWNER)
  async deleteCriteria(
    @Req() req: any,
    @Param('criteriaId') criteriaId: string,
    @Headers('x-workspace-id') workspaceId?: string,
    @Headers('x-owner-id') ownerId?: string,
    @Headers('x-staff-id') staffId?: string,
  ): Promise<WorkspaceConfig> {
    const callerId = resolveCallerId(req, ownerId, staffId);
    return this.configService.deleteCriteria(workspaceId || '', criteriaId, callerId);
  }
}
