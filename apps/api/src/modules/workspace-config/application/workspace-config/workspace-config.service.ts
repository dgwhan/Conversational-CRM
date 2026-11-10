import { Injectable, Optional } from '@nestjs/common';
import type {
  WorkspaceConfig,
  BusinessDomain,
  PipelineStageConfig,
  ProductItemConfig,
  LeadQualificationCriteria,
} from '../../../../contracts/workspace-config.js';
import { PrismaService } from '../../../../platform/database/prisma.service.js';
import { WorkspaceLifecycleService } from '../workspace-lifecycle/index.js';
import { WorkspaceHotlineService } from '../workspace-hotline.service.js';
import type {
  WorkspaceHotlineResponseDto,
  CreateWorkspaceRequestDto,
  UpdateWorkspaceRequestDto,
  WorkspaceItemResponseDto,
  CreateHotlineRequestDto,
  UpdateHotlineRequestDto,
} from '../../presentation/dto/index.js';

export type {
  WorkspaceHotline,
  WorkspaceHotlineResponseDto,
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  WorkspaceResponseDto,
  CreateHotlineDto,
  UpdateHotlineDto,
} from '../../presentation/dto/index.js';

import { getConfig, getPresetsList } from './operations/config-query.js';
import { updateConfig, applyPreset } from './operations/config-update.js';
import {
  addStage,
  addProduct,
  addCriteria,
  deleteCriteria,
} from './operations/config-items.js';

@Injectable()
export class WorkspaceConfigService {
  private readonly lifecycle: WorkspaceLifecycleService;
  private readonly hotline: WorkspaceHotlineService;

  constructor(
    @Optional() private readonly prisma?: PrismaService,
    @Optional() lifecycle?: WorkspaceLifecycleService,
    @Optional() hotline?: WorkspaceHotlineService,
  ) {
    this.lifecycle = lifecycle || new WorkspaceLifecycleService(prisma);
    this.hotline = hotline || new WorkspaceHotlineService();
  }

  // ================= Workspace Lifecycle Delegations =================

  async resolveOwnerId(
    ownerId?: string,
    workspaceId?: string,
    currentStaffId?: string
  ): Promise<string | null> {
    return this.lifecycle.resolveOwnerId(ownerId, workspaceId, currentStaffId);
  }

  async getMyWorkspaces(
    currentStaffId?: string,
    ownerId?: string
  ): Promise<WorkspaceItemResponseDto[]> {
    return this.lifecycle.getMyWorkspaces(currentStaffId, ownerId);
  }

  async createWorkspace(
    data: CreateWorkspaceRequestDto,
    staffId?: string,
    ownerId?: string
  ): Promise<WorkspaceItemResponseDto> {
    return this.lifecycle.createWorkspace(data, staffId, ownerId);
  }

  async updateWorkspace(
    workspaceId: string,
    data: UpdateWorkspaceRequestDto,
    callerIdOrStaffId?: string,
    ownerId?: string
  ): Promise<WorkspaceItemResponseDto> {
    const callerId = ownerId || callerIdOrStaffId;
    return this.lifecycle.updateWorkspace(workspaceId, data, callerId);
  }

  async deleteWorkspace(
    workspaceId: string,
    callerIdOrStaffId?: string,
    ownerId?: string
  ): Promise<{ success: boolean; message: string }> {
    const callerId = ownerId || callerIdOrStaffId;
    return this.lifecycle.deleteWorkspace(workspaceId, callerId);
  }

  async resolveWorkspaceForOwner(
    resolvedOwner: string,
    workspaceId?: string
  ): Promise<string | null> {
    return this.lifecycle.resolveWorkspaceForOwner(resolvedOwner, workspaceId);
  }

  // ================= Workspace Hotline Delegations =================

  async getHotlines(workspaceId: string): Promise<WorkspaceHotlineResponseDto[]> {
    return this.hotline.getHotlines(workspaceId);
  }

  async createHotline(
    workspaceId: string,
    data: CreateHotlineRequestDto,
    staffId?: string,
    ownerId?: string
  ): Promise<WorkspaceHotlineResponseDto> {
    return this.hotline.createHotline(workspaceId, data, staffId, ownerId);
  }

  async updateHotline(
    workspaceId: string,
    hotlineId: string,
    patch: UpdateHotlineRequestDto,
    staffId?: string,
    ownerId?: string
  ): Promise<WorkspaceHotlineResponseDto> {
    return this.hotline.updateHotline(workspaceId, hotlineId, patch, staffId, ownerId);
  }

  async deleteHotline(
    workspaceId: string,
    hotlineId: string,
    staffId?: string,
    ownerId?: string
  ): Promise<{ success: boolean; message: string }> {
    return this.hotline.deleteHotline(workspaceId, hotlineId, staffId, ownerId);
  }

  // ================= Workspace Configuration & Domain Presets =================

  async getConfig(
    workspaceId?: string,
    ownerId?: string,
    currentStaffId?: string
  ): Promise<WorkspaceConfig> {
    return getConfig(this.prisma, workspaceId, ownerId, currentStaffId, this.lifecycle);
  }

  async updateConfig(
    workspaceId?: string,
    patch: Partial<WorkspaceConfig> = {},
    ownerId?: string,
    currentStaffId?: string
  ): Promise<WorkspaceConfig> {
    return updateConfig(this.prisma, workspaceId, patch, ownerId, currentStaffId, this.lifecycle);
  }

  async applyPreset(
    workspaceId: string,
    presetKey: BusinessDomain,
    customWorkspaceName?: string,
    ownerId?: string,
    currentStaffId?: string
  ): Promise<WorkspaceConfig> {
    return applyPreset(
      this.prisma,
      workspaceId,
      presetKey,
      customWorkspaceName,
      ownerId,
      currentStaffId,
      this.lifecycle
    );
  }

  getPresetsList() {
    return getPresetsList();
  }

  async addStage(
    workspaceId: string,
    stage: Omit<PipelineStageConfig, 'id' | 'order'>,
    ownerId?: string,
    currentStaffId?: string
  ): Promise<WorkspaceConfig> {
    return addStage(this.prisma, workspaceId, stage, ownerId, currentStaffId, this.lifecycle);
  }

  async addProduct(
    workspaceId: string,
    product: Omit<ProductItemConfig, 'id'>,
    ownerId?: string,
    currentStaffId?: string
  ): Promise<WorkspaceConfig> {
    return addProduct(this.prisma, workspaceId, product, ownerId, currentStaffId, this.lifecycle);
  }

  async addCriteria(
    workspaceId: string,
    criteria: Omit<LeadQualificationCriteria, 'id'>,
    ownerId?: string,
    currentStaffId?: string
  ): Promise<WorkspaceConfig> {
    return addCriteria(this.prisma, workspaceId, criteria, ownerId, currentStaffId, this.lifecycle);
  }

  async deleteCriteria(
    workspaceId: string,
    criteriaId: string,
    ownerId?: string,
    currentStaffId?: string
  ): Promise<WorkspaceConfig> {
    return deleteCriteria(this.prisma, workspaceId, criteriaId, ownerId, currentStaffId, this.lifecycle);
  }
}

