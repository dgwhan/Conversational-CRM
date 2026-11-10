import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type {
  CreateWorkspaceRequestDto,
  UpdateWorkspaceRequestDto,
  WorkspaceItemResponseDto,
} from '../../presentation/dto/index.js';
import {
  getUserDelegate,
  resolveWorkspaceOwnerId,
  resolveWorkspaceForOwner,
} from '../workspace-resolver.js';
import { getMyWorkspaces } from './operations/workspace-query.js';
import { createWorkspace } from './operations/workspace-creation.js';
import { updateWorkspace } from './operations/workspace-update.js';
import { deleteWorkspace } from './operations/workspace-deletion.js';

@Injectable()
export class WorkspaceLifecycleService {
  constructor(private readonly prisma: PrismaService) { }

  getUserDelegate() {
    return getUserDelegate(this.prisma);
  }

  async resolveOwnerId(
    ownerId?: string,
    workspaceId?: string,
    currentStaffId?: string
  ): Promise<string | null> {
    return resolveWorkspaceOwnerId(this.prisma, ownerId, workspaceId, currentStaffId);
  }

  async getMyWorkspaces(
    currentStaffId?: string,
    ownerId?: string
  ): Promise<WorkspaceItemResponseDto[]> {
    return getMyWorkspaces(this.prisma, currentStaffId, ownerId);
  }

  async createWorkspace(
    data: CreateWorkspaceRequestDto,
    staffId?: string,
    ownerId?: string
  ): Promise<WorkspaceItemResponseDto> {
    return createWorkspace(this.prisma, data, staffId, ownerId);
  }

  async updateWorkspace(
    workspaceId: string,
    data: UpdateWorkspaceRequestDto,
    ownerId?: string
  ): Promise<WorkspaceItemResponseDto> {
    const callerId = ownerId;
    return updateWorkspace(this.prisma, workspaceId, data, callerId);
  }

  async deleteWorkspace(
    workspaceId: string,
    ownerId?: string
  ): Promise<{ success: boolean; message: string }> {
    const callerId = ownerId;
    return deleteWorkspace(this.prisma, workspaceId, callerId);
  }

  async resolveWorkspaceForOwner(
    resolvedOwner: string,
    workspaceId?: string
  ): Promise<string | null> {
    return resolveWorkspaceForOwner(this.prisma, resolvedOwner, workspaceId);
  }
}

