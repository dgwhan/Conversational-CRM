import type {
  WorkspaceConfig,
  PipelineStageConfig,
  ProductItemConfig,
  LeadQualificationCriteria,
} from '../../../../../contracts/workspace-config.js';
import { PrismaService } from '../../../../../platform/database/prisma.service.js';
import type { WorkspaceLifecycleService } from '../../workspace-lifecycle/index.js';
import { getConfig } from './config-query.js';
import { updateConfig } from './config-update.js';

/**
 * Thêm 1 giai đoạn mới vào phễu
 */
export async function addStage(
  prisma: PrismaService | undefined,
  workspaceId: string,
  stage: Omit<PipelineStageConfig, 'id' | 'order'>,
  ownerId?: string,
  currentStaffId?: string,
  lifecycle?: WorkspaceLifecycleService
): Promise<WorkspaceConfig> {
  const current = await getConfig(prisma, workspaceId, ownerId, currentStaffId, lifecycle);
  const newStage: PipelineStageConfig = {
    ...stage,
    id: `STAGE_${Date.now()}`,
    order: current.pipelineStages.length + 1,
  };

  return updateConfig(
    prisma,
    workspaceId,
    {
      pipelineStages: [...current.pipelineStages, newStage],
    },
    ownerId,
    currentStaffId,
    lifecycle
  );
}

/**
 * Thêm 1 sản phẩm / khóa học / ngành đào tạo mới vào danh mục
 */
export async function addProduct(
  prisma: PrismaService | undefined,
  workspaceId: string,
  product: Omit<ProductItemConfig, 'id'>,
  ownerId?: string,
  currentStaffId?: string,
  lifecycle?: WorkspaceLifecycleService
): Promise<WorkspaceConfig> {
  const current = await getConfig(prisma, workspaceId, ownerId, currentStaffId, lifecycle);
  const newProduct: ProductItemConfig = {
    ...product,
    id: `PROD_${Date.now()}`,
  };

  return updateConfig(
    prisma,
    workspaceId,
    {
      productCatalog: [...current.productCatalog, newProduct],
    },
    ownerId,
    currentStaffId,
    lifecycle
  );
}

/**
 * Thêm tiêu chí đánh giá / phân loại mới
 */
export async function addCriteria(
  prisma: PrismaService | undefined,
  workspaceId: string,
  criteria: Omit<LeadQualificationCriteria, 'id'>,
  ownerId?: string,
  currentStaffId?: string,
  lifecycle?: WorkspaceLifecycleService
): Promise<WorkspaceConfig> {
  const current = await getConfig(prisma, workspaceId, ownerId, currentStaffId, lifecycle);
  const newCriteria: LeadQualificationCriteria = {
    ...criteria,
    id: `CRIT_${Date.now()}`,
  };

  return updateConfig(
    prisma,
    workspaceId,
    {
      criteria: [...current.criteria, newCriteria],
    },
    ownerId,
    currentStaffId,
    lifecycle
  );
}

/**
 * Xóa tiêu chí
 */
export async function deleteCriteria(
  prisma: PrismaService | undefined,
  workspaceId: string,
  criteriaId: string,
  ownerId?: string,
  currentStaffId?: string,
  lifecycle?: WorkspaceLifecycleService
): Promise<WorkspaceConfig> {
  const current = await getConfig(prisma, workspaceId, ownerId, currentStaffId, lifecycle);
  return updateConfig(
    prisma,
    workspaceId,
    {
      criteria: current.criteria.filter((c) => c.id !== criteriaId),
    },
    ownerId,
    currentStaffId,
    lifecycle
  );
}
