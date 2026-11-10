import {
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import type {
  WorkspaceConfig,
  BusinessDomain,
} from '../../../../../contracts/workspace-config.js';
import { getDefaultWorkingHoursConfig } from '../../../../../contracts/workspace-config.js';
import { INDUSTRY_PRESETS } from '../../../domain/workspace-config.presets.js';
import { PrismaService } from '../../../../../platform/database/prisma.service.js';
import { isUuid } from '../../../../../utils/uuid.util.js';
import type { WorkspaceLifecycleService } from '../../workspace-lifecycle/index.js';
import { resolveBusinessDomain } from '../../../domain/business-domain.js';

const logger = new Logger('ConfigQuery');

/**
 * Lấy cấu hình của workspace hiện tại theo workspaceId hoặc ownerId lưu trong Database.
 */
export async function getConfig(
  prisma: PrismaService | undefined,
  workspaceId?: string,
  ownerId?: string,
  currentStaffId?: string,
  lifecycle?: WorkspaceLifecycleService
): Promise<WorkspaceConfig> {
  if (!prisma) {
    throw new BadRequestException('Database service is unavailable');
  }

  const cleanWsId = workspaceId?.trim() || undefined;
  let dbConfig: any = null;

  // 1. Nếu có workspaceId truyền lên, tìm cấu hình trực tiếp theo workspaceId
  if (cleanWsId) {
    dbConfig = await prisma.workspaceConfiguration.findFirst({
      where: isUuid(cleanWsId)
        ? { workspaceId: cleanWsId }
        : { OR: [{ workspaceId: cleanWsId }, { workspace: { slug: cleanWsId } }] },
    });
  }

  // 2. Tìm theo ownerId / staffId
  const resolvedOwner = lifecycle
    ? await lifecycle.resolveOwnerId(ownerId, cleanWsId, currentStaffId)
    : ownerId || currentStaffId || null;

  const actualWsId = lifecycle && resolvedOwner
    ? await lifecycle.resolveWorkspaceForOwner(resolvedOwner, cleanWsId)
    : null;

  if (!dbConfig) {
    if (cleanWsId) {
      // Khi đã truyền cleanWsId, chỉ fallback sang bản ghi của owner nếu workspaceId đang là NULL (chưa liên kết)
      if (resolvedOwner) {
        dbConfig = await prisma.workspaceConfiguration.findFirst({
          where: { ownerId: resolvedOwner, workspaceId: null },
        });
      }
    } else if (actualWsId || resolvedOwner) {
      const whereCond: any = {};
      if (actualWsId) {
        whereCond.workspaceId = actualWsId;
      } else if (resolvedOwner) {
        whereCond.ownerId = resolvedOwner;
        whereCond.workspaceId = null;
      }
      dbConfig = await prisma.workspaceConfiguration.findFirst({
        where: whereCond,
      });
    }
  }

  if (!dbConfig) {
    throw new NotFoundException('Không tìm thấy cấu hình Không gian làm việc.');
  }

  // Tự động chữa lành nối workspaceId nếu trước đó đang null
  if (!dbConfig.workspaceId && actualWsId) {
    dbConfig = await prisma.workspaceConfiguration.update({
      where: { id: dbConfig.id },
      data: { workspaceId: actualWsId },
    });
    logger.log(`Linked existing workspace configuration to workspace ${actualWsId} for owner ${resolvedOwner}`);
  }

  const finalWsId = dbConfig.workspaceId || actualWsId || cleanWsId || '';
  const term = (dbConfig.terminology as any) || {};
  const config: WorkspaceConfig = {
    workspaceId: finalWsId,
    workspaceName: dbConfig.workspaceName || '',
    domain: resolveBusinessDomain(dbConfig.domain),
    terminology: term,
    pipelineStages: ((dbConfig.pipelineStages as any[]) || []).map((s) => ({ ...s })),
    productCatalog: ((dbConfig.productCatalog as any[]) || []).map((p) => ({ ...p })),
    criteria: ((dbConfig.criteria as any[]) || []).map((c) => ({ ...c })),
    unresponsiveAlertMinutes:
      typeof (dbConfig as any).unresponsiveAlertMinutes === 'number'
        ? (dbConfig as any).unresponsiveAlertMinutes
        : typeof term.unresponsiveAlertMinutes === 'number'
          ? term.unresponsiveAlertMinutes
          : 15,
    workingHours: (dbConfig as any).workingHours || term.workingHours || getDefaultWorkingHoursConfig(),
  };

  return config;
}

/**
 * Lấy danh sách các mẫu ngành nghề định sẵn để hiển thị cho Admin chọn
 */
export function getPresetsList() {
  return Object.entries(INDUSTRY_PRESETS).map(([key, value]) => ({
    key,
    name: value.workspaceName,
    domain: value.domain,
    terminology: value.terminology,
    stagesCount: value.pipelineStages.length,
    sampleStages: value.pipelineStages.map((s) => s.name),
    productsCount: value.productCatalog.length,
    sampleProducts: value.productCatalog.map((p) => p.name),
  }));
}
