import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../platform/database/prisma.service.js';
import {
  KeywordRuleItem,
  evaluateKeywordRules,
  KeywordEvaluationResult,
} from './keyword-scoring.js';
import { extractEntities, ExtractedEntitiesResult, CatalogProductItem } from './entity-extractor.js';
import type { ScoringThresholdConfig } from './domain/conversation-scoring.js';
import { DEFAULT_SCORING_THRESHOLDS } from './domain/conversation-scoring.js';

@Injectable()
export class KeywordRulesService {
  private inMemoryRules: KeywordRuleItem[] = [];
  private readonly inMemoryScoringConfigs = new Map<string, ScoringThresholdConfig>();

  constructor(@Optional() private readonly prisma?: PrismaService) {}

  /**
   * Lấy danh sách luật từ khóa theo workspace.
   */
  async getRules(workspaceId?: string): Promise<KeywordRuleItem[]> {
    if (!this.prisma) {
      return this.inMemoryRules.filter((rule) => rule.workspaceId === workspaceId);
    }

    const where = { workspaceId: workspaceId || null };
    const dbRules = await this.prisma.keywordRule.findMany({
      where,
      orderBy: [{ group: 'asc' }, { weight: 'desc' }],
    });

    return dbRules.map((rule) => this.mapRule(rule));
  }

  /**
   * Tạo luật từ khóa mới
   */
  async createRule(data: Omit<KeywordRuleItem, 'id'>): Promise<KeywordRuleItem> {
    if (
      !data.group?.trim() ||
      data.group.trim().length > 50 ||
      !data.keyword?.trim() ||
      data.keyword.trim().length > 200 ||
      !Number.isInteger(data.weight) ||
      typeof data.isActive !== 'boolean' ||
      (data.description?.length ?? 0) > 500
    ) {
      throw new BadRequestException('Thông tin tiêu chí chấm điểm không hợp lệ.');
    }

    if (this.prisma) {
      const created = await this.prisma.keywordRule.create({
        data: {
          workspaceId: data.workspaceId || null,
          group: data.group.trim(),
          keyword: data.keyword.trim(),
          weight: data.weight,
          isActive: data.isActive,
          description: data.description || null,
        },
      });
      return this.mapRule(created);
    }

    const newRule: KeywordRuleItem = {
      id: `rule-${Date.now()}`,
      ...data,
      group: data.group.trim(),
      keyword: data.keyword.trim(),
    };
    this.inMemoryRules.push(newRule);
    return newRule;
  }

  /**
   * Tạo nhiều luật từ khóa cùng lúc (Bulk Import)
   */
  async createRulesBulk(
    items: Array<Omit<KeywordRuleItem, 'id'>>,
    workspaceId?: string,
  ): Promise<{ createdCount: number }> {
    const validItems = items
      .map((item) => ({
        workspaceId: workspaceId || null,
        group: item.group?.trim() || 'Chung',
        keyword: item.keyword?.trim() || '',
        weight: Number.isInteger(item.weight) ? item.weight : 1,
        isActive: typeof item.isActive === 'boolean' ? item.isActive : true,
        description: item.description?.trim() || null,
      }))
      .filter(
        (item) =>
          item.keyword.length > 0 &&
          item.keyword.length <= 200 &&
          item.group.length <= 50,
      );

    if (validItems.length === 0) {
      throw new BadRequestException('Không có từ khóa hợp lệ để nhập.');
    }

    if (this.prisma) {
      const result = await this.prisma.keywordRule.createMany({
        data: validItems,
      });
      return { createdCount: result.count };
    }

    const created: KeywordRuleItem[] = validItems.map((item, idx) => ({
      id: `rule-bulk-${Date.now()}-${idx}`,
      ...item,
      workspaceId: item.workspaceId || undefined,
      description: item.description || undefined,
    }));
    this.inMemoryRules.push(...created);
    return { createdCount: created.length };
  }

  /**
   * Cập nhật trạng thái hoặc thông số hàng loạt
   */
  async bulkUpdateRules(
    ids: string[],
    patch: Partial<KeywordRuleItem>,
    workspaceId?: string,
  ): Promise<{ updatedCount: number }> {
    if (!ids || ids.length === 0) return { updatedCount: 0 };

    const data: Prisma.KeywordRuleUpdateManyMutationInput = {};
    if (typeof patch.isActive === 'boolean') data.isActive = patch.isActive;
    if (typeof patch.weight === 'number' && Number.isInteger(patch.weight)) data.weight = patch.weight;
    if (patch.group?.trim()) data.group = patch.group.trim();

    if (this.prisma) {
      const where: Prisma.KeywordRuleWhereInput = {
        id: { in: ids },
        ...(workspaceId ? { workspaceId } : {}),
      };
      const result = await this.prisma.keywordRule.updateMany({ where, data });
      return { updatedCount: result.count };
    }

    let count = 0;
    this.inMemoryRules = this.inMemoryRules.map((rule) => {
      if (ids.includes(rule.id) && (!workspaceId || rule.workspaceId === workspaceId)) {
        count++;
        return {
          ...rule,
          ...(typeof patch.isActive === 'boolean' ? { isActive: patch.isActive } : {}),
          ...(typeof patch.weight === 'number' ? { weight: patch.weight } : {}),
          ...(patch.group ? { group: patch.group.trim() } : {}),
        };
      }
      return rule;
    });
    return { updatedCount: count };
  }

  /**
   * Xóa từ khóa hàng loạt
   */
  async bulkDeleteRules(
    ids: string[],
    workspaceId?: string,
  ): Promise<{ deletedCount: number }> {
    if (!ids || ids.length === 0) return { deletedCount: 0 };

    if (this.prisma) {
      const where: Prisma.KeywordRuleWhereInput = {
        id: { in: ids },
        ...(workspaceId ? { workspaceId } : {}),
      };
      const result = await this.prisma.keywordRule.deleteMany({ where });
      return { deletedCount: result.count };
    }

    const before = this.inMemoryRules.length;
    this.inMemoryRules = this.inMemoryRules.filter(
      (rule) => !(ids.includes(rule.id) && (!workspaceId || rule.workspaceId === workspaceId)),
    );
    return { deletedCount: before - this.inMemoryRules.length };
  }

  /**
   * Cập nhật trọng số hoặc trạng thái luật (Không cần sửa code)
   */
  async updateRule(
    id: string,
    patch: Partial<KeywordRuleItem>,
    workspaceId?: string,
  ): Promise<KeywordRuleItem | null> {
    if (
      (patch.group !== undefined && (!patch.group.trim() || patch.group.trim().length > 50)) ||
      (patch.keyword !== undefined && (!patch.keyword.trim() || patch.keyword.trim().length > 200)) ||
      (patch.weight !== undefined && !Number.isInteger(patch.weight)) ||
      (patch.isActive !== undefined && typeof patch.isActive !== 'boolean') ||
      (patch.description !== undefined && (patch.description?.length ?? 0) > 500)
    ) {
      throw new BadRequestException('Thông tin tiêu chí chấm điểm không hợp lệ.');
    }

    if (this.prisma) {
      const data = {
        ...(patch.group ? { group: patch.group.trim() } : {}),
        ...(patch.keyword ? { keyword: patch.keyword.trim() } : {}),
        ...(typeof patch.weight === 'number' ? { weight: patch.weight } : {}),
        ...(typeof patch.isActive === 'boolean' ? { isActive: patch.isActive } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
      };

      if (workspaceId) {
        // Shared rules cannot be updated through workspace-scoped endpoints.
        const result = await this.prisma.keywordRule.updateMany({
          where: { id, workspaceId },
          data,
        });
        if (result.count === 0) return null;
        const updated = await this.prisma.keywordRule.findUnique({ where: { id } });
        return updated ? this.mapRule(updated) : null;
      }

      return this.mapRule(await this.prisma.keywordRule.update({ where: { id }, data }));
    }

    const idx = this.inMemoryRules.findIndex(
      (r) => r.id === id && (!workspaceId || r.workspaceId === workspaceId),
    );
    if (idx !== -1) {
      // Không cho phép đổi workspaceId của luật qua patch
      this.inMemoryRules[idx] = { ...this.inMemoryRules[idx], ...patch, workspaceId: this.inMemoryRules[idx].workspaceId };
      return this.inMemoryRules[idx];
    }
    return null;
  }

  /**
   * Xóa luật từ khóa
   */
  async deleteRule(id: string, workspaceId?: string): Promise<boolean> {
    if (this.prisma) {
      if (workspaceId) {
        const result = await this.prisma.keywordRule.deleteMany({ where: { id, workspaceId } });
        return result.count > 0;
      }
      await this.prisma.keywordRule.delete({ where: { id } });
      return true;
    }
    const before = this.inMemoryRules.length;
    this.inMemoryRules = this.inMemoryRules.filter(
      (r) => !(r.id === id && (!workspaceId || r.workspaceId === workspaceId)),
    );
    return this.inMemoryRules.length < before;
  }

  async getScoringConfig(workspaceId: string): Promise<Partial<ScoringThresholdConfig> | null> {
    if (!this.prisma) return this.inMemoryScoringConfigs.get(workspaceId) ?? null;

    const workspaceConfig = await this.prisma.workspaceConfiguration.findUnique({
      where: { workspaceId },
      select: { leadScoringConfig: true },
    });
    const storedConfig = workspaceConfig?.leadScoringConfig;
    if (!storedConfig || typeof storedConfig !== 'object' || Array.isArray(storedConfig)) return null;
    return storedConfig as Partial<ScoringThresholdConfig>;
  }

  async saveScoringConfig(workspaceId: string, config: ScoringThresholdConfig): Promise<void> {
    if (!this.prisma) {
      this.inMemoryScoringConfigs.set(workspaceId, structuredClone(config));
      return;
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    });
    if (!workspace) throw new NotFoundException('Không tìm thấy workspace để lưu cấu hình chấm điểm.');

    const scoringConfigJson = JSON.parse(JSON.stringify(config)) as Prisma.InputJsonValue;
    await this.prisma.workspaceConfiguration.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        ownerId: workspace.ownerId,
        leadScoringConfig: scoringConfigJson,
      },
      update: { leadScoringConfig: scoringConfigJson },
    });
  }

  /**
   * Đánh giá và chấm điểm tự động một tin nhắn / văn bản
   * Đọc luật trực tiếp từ CSDL để đảm bảo khi trọng số thay đổi thì điểm đổi theo mà không sửa code.
   */
  async evaluateMessage(
    rawText: string,
    workspaceId?: string,
    catalog: CatalogProductItem[] = []
  ): Promise<KeywordEvaluationResult & { entities: ExtractedEntitiesResult }> {
    const rules = await this.getRules(workspaceId);
    const scoringConfig = workspaceId ? await this.getScoringConfig(workspaceId) : null;
    const scoringResult = evaluateKeywordRules(
      rawText,
      rules,
      scoringConfig?.exclusionThresholdWeight ?? DEFAULT_SCORING_THRESHOLDS.exclusionThresholdWeight,
      scoringConfig?.negationTerms ?? DEFAULT_SCORING_THRESHOLDS.negationTerms,
      scoringConfig?.negationPostTerms ?? DEFAULT_SCORING_THRESHOLDS.negationPostTerms,
      scoringConfig?.negationWindowWords ?? DEFAULT_SCORING_THRESHOLDS.negationWindowWords,
    );
    const entities = extractEntities(rawText, catalog);

    return {
      ...scoringResult,
      entities,
    };
  }

  private mapRule(rule: {
    id: string;
    workspaceId: string | null;
    group: string;
    keyword: string;
    weight: number;
    isActive: boolean;
    description: string | null;
  }): KeywordRuleItem {
    return {
      id: rule.id,
      workspaceId: rule.workspaceId || undefined,
      group: rule.group,
      keyword: rule.keyword,
      weight: rule.weight,
      isActive: rule.isActive,
      description: rule.description || undefined,
    };
  }
}

