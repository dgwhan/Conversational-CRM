import { Injectable, Logger, Optional } from '@nestjs/common';
import { KeywordRulesService } from '../keyword-rules.service.js';
import {
  scoreConversation,
  type ConversationMessageInput,
  type ConversationScoreResult,
  type ScoringThresholdConfig,
  DEFAULT_SCORING_THRESHOLDS,
} from '../domain/conversation-scoring.js';
import { DEFAULT_SCORING_THRESHOLDS_CONFIG } from '../domain/scoring.constants.js';
import { ConversationClassifiedEvent } from '../domain/events/conversation-classified.event.js';
import type { CatalogProductItem } from '../entity-extractor.js';
import type { KeywordRuleItem } from '../keyword-scoring.js';
import { LlmAmbiguityGatewayService } from './llm-ambiguity-gateway.service.js';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * Tầng Application: Quản lý nạp luật (Cache TTL có hạn), nạp ngưỡng cấu hình,
 * gọi hàm thuần scoreConversation và phát sự kiện ConversationClassified.
 *
 * RÀNG BUỘC KIẾN TRÚC:
 * Tuyệt đối KHÔNG import module leads hoặc các thành phần của leads.
 */
@Injectable()
export class ConversationClassificationService {
  private readonly logger = new Logger(ConversationClassificationService.name);

  // Bộ nhớ đệm TTL từ magic constants (Mặc định 5 phút = 300.000 ms)
  private readonly CACHE_TTL_MS = DEFAULT_SCORING_THRESHOLDS_CONFIG.CACHE_TTL_MS;
  private readonly rulesCache = new Map<string, CacheEntry<KeywordRuleItem[]>>();
  private readonly thresholdCache = new Map<string, CacheEntry<ScoringThresholdConfig>>();

  // Cấu hình ngưỡng ghi đè động tại runtime theo workspaceId
  private readonly dynamicThresholdConfigs = new Map<string, ScoringThresholdConfig>();

  // Danh sách các handler đăng ký nhận sự kiện ConversationClassified
  private readonly eventListeners: Array<(event: ConversationClassifiedEvent) => void | Promise<void>> = [];
  private readonly ambiguityGateway: LlmAmbiguityGatewayService;

  constructor(
    private readonly keywordRulesService: KeywordRulesService,
    @Optional() ambiguityGateway?: LlmAmbiguityGatewayService
  ) {
    this.ambiguityGateway = ambiguityGateway ?? new LlmAmbiguityGatewayService();
  }

  /**
   * Đăng ký lắng nghe sự kiện ConversationClassified (Event-Driven decoupled)
   */
  onClassified(listener: (event: ConversationClassifiedEvent) => void | Promise<void>): () => void {
    this.eventListeners.push(listener);
    return () => {
      const idx = this.eventListeners.indexOf(listener);
      if (idx !== -1) this.eventListeners.splice(idx, 1);
    };
  }

  /**
   * Cập nhật ngưỡng điểm động tại runtime cho một workspace (không cần deploy lại)
   */
  setThresholdConfig(
    workspaceId: string = 'default',
    thresholds: Partial<ScoringThresholdConfig>
  ): ScoringThresholdConfig {
    const existing = this.dynamicThresholdConfigs.get(workspaceId) || { ...DEFAULT_SCORING_THRESHOLDS };
    const updated: ScoringThresholdConfig = {
      ...existing,
      ...thresholds,
    };

    this.dynamicThresholdConfigs.set(workspaceId, updated);
    // Xóa cache cũ để có hiệu lực ngay lập tức
    this.thresholdCache.delete(workspaceId);
    this.logger.log(`Updated scoring thresholds for workspace ${workspaceId}: ${JSON.stringify(updated)}`);

    return updated;
  }

  /**
   * Lấy cấu hình ngưỡng điểm (Ưu tiên cache, sau đó là cấu hình runtime)
   */
  async getThresholdConfig(workspaceId: string = 'default'): Promise<ScoringThresholdConfig> {
    const cached = this.thresholdCache.get(workspaceId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const config = this.dynamicThresholdConfigs.get(workspaceId) || { ...DEFAULT_SCORING_THRESHOLDS };
    this.thresholdCache.set(workspaceId, {
      data: config,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    return config;
  }

  /**
   * Nạp danh sách quy tắc từ khóa (Áp dụng Cache có hạn TTL)
   */
  async getCachedRules(workspaceId?: string): Promise<KeywordRuleItem[]> {
    const cacheKey = workspaceId || 'global';
    const cached = this.rulesCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const rules = await this.keywordRulesService.getRules(workspaceId);
    this.rulesCache.set(cacheKey, {
      data: rules,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    return rules;
  }

  /**
   * Xóa bộ nhớ đệm (Invalidate Cache) khi người dùng cập nhật bảng luật hoặc ngưỡng điểm
   */
  invalidateCache(workspaceId?: string): void {
    if (workspaceId) {
      this.rulesCache.delete(workspaceId);
      this.thresholdCache.delete(workspaceId);
    } else {
      this.rulesCache.clear();
      this.thresholdCache.clear();
    }
  }

  /**
   * Luồng xử lý chính:
   * 1. Nạp luật từ cache
   * 2. Nạp ngưỡng từ cấu hình
   * 3. Gọi hàm thuần scoreConversation (hỗ trợ suy giảm điểm daysInactive)
   * 4. Giải quyết tin mơ hồ qua AmbiguityGateway (Heuristic / LLM) nếu có
   * 5. Phát sự kiện ConversationClassified
   */
  async classifyConversation(params: {
    conversationId: string;
    messages: ConversationMessageInput[];
    customerId?: string;
    workspaceId?: string;
    catalog?: CatalogProductItem[];
    daysInactive?: number;
    resolveAmbiguity?: boolean;
  }): Promise<ConversationScoreResult> {
    const {
      conversationId,
      messages,
      customerId,
      workspaceId,
      catalog = [],
      daysInactive,
      resolveAmbiguity = true,
    } = params;

    // 1. Nạp luật với Cache có hạn
    const rules = await this.getCachedRules(workspaceId);

    // 2. Nạp cấu hình ngưỡng điểm
    const thresholds = await this.getThresholdConfig(workspaceId);

    // 3. Gọi hàm thuần domain scoreConversation (không side-effects, hỗ trợ time decay)
    let result = scoreConversation(messages, rules, thresholds, catalog, daysInactive);

    // 4. Giải quyết tin mơ hồ qua Cổng Ambiguity Gateway nếu có cấu hình
    if (this.ambiguityGateway && resolveAmbiguity) {
      if (this.ambiguityGateway.isAmbiguous(result, messages, thresholds, daysInactive)) {
        const ambiguityRes = await this.ambiguityGateway.resolveAmbiguity(
          messages,
          result,
          thresholds,
          daysInactive
        );
        if (ambiguityRes.isAmbiguous && ambiguityRes.adjustedTier) {
          result = {
            ...result,
            tier: ambiguityRes.adjustedTier,
            score: ambiguityRes.adjustedScore ?? result.score,
            reasonsFormatted: result.reasonsFormatted
              ? `${result.reasonsFormatted}, ${ambiguityRes.reason}`
              : ambiguityRes.reason,
          };
        }
      }
    }

    // 5. Phát sự kiện ConversationClassified
    const event = new ConversationClassifiedEvent(
      conversationId,
      customerId,
      workspaceId,
      result,
      new Date()
    );

    this.dispatchClassifiedEvent(event);

    return result;
  }

  private dispatchClassifiedEvent(event: ConversationClassifiedEvent): void {
    for (const listener of this.eventListeners) {
      try {
        const res = listener(event);
        if (res instanceof Promise) {
          res.catch((err) => {
            this.logger.error(`Error in ConversationClassified listener: ${(err as Error).message}`);
          });
        }
      } catch (err) {
        this.logger.error(`Error in ConversationClassified listener: ${(err as Error).message}`);
      }
    }
  }
}
