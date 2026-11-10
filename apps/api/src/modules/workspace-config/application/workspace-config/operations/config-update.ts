import {
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type {
  WorkspaceConfig,
  BusinessDomain,
} from '../../../../../contracts/workspace-config.js';
import {
  WorkspaceConfigSchema,
  getDefaultWorkingHoursConfig,
} from '../../../../../contracts/workspace-config.js';
import { INDUSTRY_PRESETS } from '../../../domain/workspace-config.presets.js';
import { PrismaService } from '../../../../../platform/database/prisma.service.js';
import { isUuid } from '../../../../../utils/uuid.util.js';
import type { WorkspaceLifecycleService } from '../../workspace-lifecycle/index.js';
import { getConfig } from './config-query.js';

const logger = new Logger('ConfigUpdate');

/**
 * Cập nhật toàn diện hoặc từng phần cấu hình workspace và LƯU TRỰC TIẾP VÀO DB theo ownerId.
 */
export async function updateConfig(
  prisma: PrismaService | undefined,
  workspaceId?: string,
  patch: Partial<WorkspaceConfig> = {},
  ownerId?: string,
  currentStaffId?: string,
  lifecycle?: WorkspaceLifecycleService
): Promise<WorkspaceConfig> {
  if (!prisma) {
    throw new BadRequestException('Database service is unavailable');
  }

  const cleanWsId = workspaceId?.trim() || undefined;
  let current: Partial<WorkspaceConfig> = {};
  try {
    current = await getConfig(prisma, cleanWsId, ownerId, currentStaffId, lifecycle);
  } catch {
    // Nếu chưa có cấu hình trước đó, sử dụng cấu hình preset Education làm khung cơ bản
    const eduPreset = INDUSTRY_PRESETS.EDUCATION;
    current = {
      domain: 'EDUCATION',
      workspaceName: eduPreset.workspaceName,
      terminology: { ...eduPreset.terminology },
      pipelineStages: eduPreset.pipelineStages.map((s) => ({ ...s })),
      productCatalog: eduPreset.productCatalog.map((p) => ({ ...p })),
      criteria: eduPreset.criteria.map((c) => ({ ...c })),
    };
  }

  const defaultTerm = INDUSTRY_PRESETS.EDUCATION.terminology;
  const merged: WorkspaceConfig = {
    workspaceId: cleanWsId || current.workspaceId || '',
    workspaceName: patch.workspaceName || current.workspaceName || '',
    domain: patch.domain || current.domain || 'EDUCATION',
    terminology: {
      ...defaultTerm,
      ...(current.terminology || {}),
      ...(patch.terminology || {}),
    },
    pipelineStages: patch.pipelineStages || current.pipelineStages || [],
    productCatalog: patch.productCatalog || current.productCatalog || [],
    criteria: patch.criteria || current.criteria || [],
    unresponsiveAlertMinutes:
      patch.unresponsiveAlertMinutes !== undefined
        ? patch.unresponsiveAlertMinutes
        : current.unresponsiveAlertMinutes ?? 15,
    workingHours: patch.workingHours
      ? { ...(current.workingHours || getDefaultWorkingHoursConfig()), ...patch.workingHours }
      : current.workingHours || getDefaultWorkingHoursConfig(),
  };

  // Kiểm tra tính hợp lệ qua Zod
  const validation = WorkspaceConfigSchema.safeParse(merged);
  if (!validation.success) {
    const errorMsg = validation.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    logger.warn(`Invalid workspace configuration update: ${errorMsg}`);
    throw new BadRequestException(`Cấu hình không hợp lệ: ${errorMsg}`);
  }

  // Đảm bảo pipeline có ít nhất 2 stage
  const stages = validation.data.pipelineStages;
  if (stages.length < 2) {
    throw new BadRequestException('Phễu bán hàng / tuyển sinh phải có ít nhất 2 giai đoạn.');
  }

  // 1. Tìm bản ghi cấu hình hiện có
  let existing: any = null;
  if (cleanWsId) {
    existing = await prisma.workspaceConfiguration.findFirst({
      where: isUuid(cleanWsId)
        ? { workspaceId: cleanWsId }
        : { OR: [{ workspaceId: cleanWsId }, { workspace: { slug: cleanWsId } }] },
    });
  }

  const resolvedOwner = lifecycle
    ? await lifecycle.resolveOwnerId(ownerId, cleanWsId, currentStaffId)
    : ownerId || currentStaffId || null;

  const actualWsId = lifecycle && resolvedOwner
    ? await lifecycle.resolveWorkspaceForOwner(resolvedOwner, cleanWsId)
    : null;

  if (!existing && (actualWsId || resolvedOwner)) {
    const whereCond: any = {};
    if (actualWsId) {
      whereCond.workspaceId = actualWsId;
    } else if (resolvedOwner) {
      whereCond.ownerId = resolvedOwner;
      whereCond.workspaceId = null;
    }
    existing = await prisma.workspaceConfiguration.findFirst({
      where: whereCond,
    });
  }

  const wsToLink = actualWsId || existing?.workspaceId || (cleanWsId && isUuid(cleanWsId) ? cleanWsId : null);
  const ownerToLink = resolvedOwner || existing?.ownerId;

  if (!ownerToLink && !existing) {
    throw new BadRequestException('Không thể xác định chủ sở hữu Không gian làm việc');
  }

  const termPayload = {
    ...validation.data.terminology,
    unresponsiveAlertMinutes: validation.data.unresponsiveAlertMinutes,
    workingHours: validation.data.workingHours,
  };

  if (existing) {
    await prisma.workspaceConfiguration.update({
      where: { id: existing.id },
      data: {
        workspaceId: wsToLink || existing.workspaceId,
        domain: validation.data.domain,
        workspaceName: validation.data.workspaceName,
        terminology: termPayload as any,
        pipelineStages: validation.data.pipelineStages as any,
        productCatalog: validation.data.productCatalog as any,
        criteria: validation.data.criteria as any,
        updatedAt: new Date(),
      },
    });
    logger.log(`[SUCCESS] Updated workspace configuration in DB for workspace ${existing.workspaceId || wsToLink}`);
  } else {
    await prisma.workspaceConfiguration.create({
      data: {
        ownerId: ownerToLink,
        workspaceId: wsToLink,
        domain: validation.data.domain,
        workspaceName: validation.data.workspaceName,
        terminology: termPayload as any,
        pipelineStages: validation.data.pipelineStages as any,
        productCatalog: validation.data.productCatalog as any,
        criteria: validation.data.criteria as any,
      },
    });
    logger.log(`[SUCCESS] Created new workspace configuration in DB for owner ${ownerToLink} linked to workspace ${wsToLink}`);
  }

  if (wsToLink) {
    validation.data.workspaceId = wsToLink;
  }

  logger.log(`Updated workspace config for ${cleanWsId || wsToLink} [Domain: ${validation.data.domain}]`);
  return validation.data;
}

/**
 * Áp dụng 1 mẫu cấu hình ngành nghề định sẵn (1-click preset)
 */
export async function applyPreset(
  prisma: PrismaService | undefined,
  workspaceId: string,
  presetKey: BusinessDomain,
  customWorkspaceName?: string,
  ownerId?: string,
  currentStaffId?: string,
  lifecycle?: WorkspaceLifecycleService
): Promise<WorkspaceConfig> {
  const preset = INDUSTRY_PRESETS[presetKey];
  if (!preset) {
    throw new BadRequestException(`Ngành nghề "${presetKey}" không tồn tại.`);
  }

  const newConfig: WorkspaceConfig = {
    workspaceId,
    workspaceName: customWorkspaceName?.trim() || preset.workspaceName,
    domain: preset.domain,
    terminology: { ...preset.terminology },
    pipelineStages: preset.pipelineStages.map((s) => ({ ...s })),
    productCatalog: preset.productCatalog.map((p) => ({ ...p })),
    criteria: preset.criteria.map((c) => ({ ...c })),
  };

  return updateConfig(prisma, workspaceId, newConfig, ownerId, currentStaffId, lifecycle);
}
