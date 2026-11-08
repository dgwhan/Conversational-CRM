import { Injectable, Logger } from '@nestjs/common';
import type {
  ConversationMessageInput,
  ConversationScoreResult,
  ScoringThresholdConfig,
} from '../domain/conversation-scoring.js';
import {
  CONVERSATION_TIERS,
  AMBIGUITY_INTENTS,
  AMBIGUITY_GATEWAY_PROVIDERS,
  type ConversationTier,
  type AmbiguityIntent,
  type AmbiguityGatewayProviderName,
} from '../domain/scoring.constants.js';
import { normalize } from '../text-normalizer.js';

export interface AmbiguityResolutionResult {
  isAmbiguous: boolean;
  adjustedTier?: ConversationTier;
  adjustedScore?: number;
  intentDetected?: AmbiguityIntent;
  reason: string;
  needsHumanReview: boolean;
  providerUsed: AmbiguityGatewayProviderName;
}

export interface AmbiguityGatewayProvider {
  name: AmbiguityGatewayProviderName;
  resolve(
    messages: ConversationMessageInput[],
    baseResult: ConversationScoreResult,
    thresholds: ScoringThresholdConfig,
    daysInactive?: number
  ): Promise<AmbiguityResolutionResult>;
}

/**
 * HeuristicAmbiguityResolver:
 * Bộ phân giải tin nhắn mơ hồ tổng quát cho CRM tìm kiếm khách hàng.
 */
export class HeuristicAmbiguityResolver implements AmbiguityGatewayProvider {
  public readonly name: AmbiguityGatewayProviderName = AMBIGUITY_GATEWAY_PROVIDERS.HEURISTIC_LOCAL;

  // Mẫu câu thăm dò chung của khách hàng tiềm năng đa lĩnh vực (B2B, B2C, Giáo dục, BĐS, Dịch vụ)
  private readonly exploratoryPatterns: Array<{
    regex: RegExp;
    intent: AmbiguityIntent;
    suggestedTier: ConversationTier;
    reasonDesc: string;
  }> = [
      {
        regex: /(bao\s+gia|bang\s+gia|gia\s+ca|chi\s+phi|gia\s+bao\s+nhieu|tam\s+nhieu\s+tien|phi\s+the\s+nao)/i,
        intent: AMBIGUITY_INTENTS.INQUIRY_PRICING,
        suggestedTier: CONVERSATION_TIERS.WARM,
        reasonDesc: 'Heuristic: Khách hỏi thông tin báo giá/chi phí dịch vụ -> Gán WARM',
      },
      {
        regex: /(thu\s+tuc|quy\s+trinh|ho\s+so|dieu\s+kien|hop\s+dong|can\s+giay\s+to\s+gi)/i,
        intent: AMBIGUITY_INTENTS.INQUIRY_PROCEDURE,
        suggestedTier: CONVERSATION_TIERS.WARM,
        reasonDesc: 'Heuristic: Khách hỏi quy trình thủ tục giao dịch -> Gán WARM',
      },
      {
        regex: /(con\s+hang|con\s+cho|con\s+suat|con\s+slot|con\s+nhan|con\s+mo|khi\s+nao\s+bat\s+dau)/i,
        intent: AMBIGUITY_INTENTS.INQUIRY_AVAILABILITY,
        suggestedTier: CONVERSATION_TIERS.WARM,
        reasonDesc: 'Heuristic: Khách hỏi tình trạng sẵn có của sản phẩm/dịch vụ -> Gán WARM',
      },
      {
        regex: /(cho\s+em\s+hoi\s+xiu|can\s+tu\s+van|minh\s+muon\s+tim\s+hieu|ad\s+oi|co\s+ai\s+truc\s+khong)/i,
        intent: AMBIGUITY_INTENTS.INQUIRY_OPENING,
        suggestedTier: CONVERSATION_TIERS.COLD,
        reasonDesc: 'Heuristic: Câu chào mở thăm dò chung -> Gán COLD',
      },
    ];

  async resolve(
    messages: ConversationMessageInput[],
    baseResult: ConversationScoreResult,
    thresholds: ScoringThresholdConfig,
    daysInactive?: number
  ): Promise<AmbiguityResolutionResult> {
    const rawTexts = messages.map((m) => (typeof m === 'string' ? m : m.content || '')).filter(Boolean);
    const combinedNormText = rawTexts.map((t) => normalize(t)).join(' ');

    // 1. Kiểm tra trường hợp điểm số giáp ranh ngưỡng
    // Lưu ý: Nếu khách đã bị trừ điểm do im lặng (daysInactive >= 14), KHÔNG nâng hạng ngược lại
    const isInactive = typeof daysInactive === 'number' && daysInactive >= (thresholds.inactivityDecayDays ?? 14);
    const isHotBoundary = baseResult.score === thresholds.hotMinScore - 1;

    if (isHotBoundary && !baseResult.isExcluded && !isInactive) {
      if (rawTexts.length >= 2) {
        return {
          isAmbiguous: true,
          adjustedTier: CONVERSATION_TIERS.HOT,
          adjustedScore: thresholds.hotMinScore,
          intentDetected: AMBIGUITY_INTENTS.HIGH_ENGAGEMENT_BOUNDARY,
          reason: `Heuristic: Điểm ${baseResult.score} sát ngưỡng HOT (${thresholds.hotMinScore}) kèm tương tác cao -> Nâng hạng HOT`,
          needsHumanReview: false,
          providerUsed: this.name,
        };
      }
    }

    // 2. Kiểm tra các mẫu câu thăm dò mở khi điểm số hiện tại đang thấp
    if (baseResult.tier === CONVERSATION_TIERS.IRRELEVANT || baseResult.tier === CONVERSATION_TIERS.COLD) {
      for (const pattern of this.exploratoryPatterns) {
        if (pattern.regex.test(combinedNormText)) {
          return {
            isAmbiguous: true,
            adjustedTier: pattern.suggestedTier,
            adjustedScore: Math.max(
              baseResult.score,
              pattern.suggestedTier === CONVERSATION_TIERS.WARM ? thresholds.warmMinScore : thresholds.coldMinScore
            ),
            intentDetected: pattern.intent,
            reason: pattern.reasonDesc,
            needsHumanReview: false,
            providerUsed: this.name,
          };
        }
      }
    }

    // 3. Tin nhắn quá ngắn dưới 4 từ không có từ khóa rõ ràng
    if (rawTexts.length === 1 && rawTexts[0].split(/\s+/).length <= 4 && baseResult.tier === CONVERSATION_TIERS.IRRELEVANT) {
      return {
        isAmbiguous: true,
        adjustedTier: CONVERSATION_TIERS.IRRELEVANT,
        adjustedScore: 0,
        intentDetected: AMBIGUITY_INTENTS.SHORT_QUERY_UNRESOLVED,
        reason: 'Heuristic: Tin nhắn ngắn chưa rõ ý định. Đề xuất nhân viên gửi câu chào mở',
        needsHumanReview: true,
        providerUsed: this.name,
      };
    }

    // Mặc định không bị mơ hồ
    return {
      isAmbiguous: false,
      reason: 'Quy tắc từ khóa rõ ràng, không cần hiệu chỉnh',
      needsHumanReview: false,
      providerUsed: this.name,
    };
  }
}

/**
 * Cổng Ambiguity Gateway Service :
 * Dựng nền tảng kiến trúc Adapter/Strategy pattern để giải quyết tin mơ hồ.
 */
@Injectable()
export class LlmAmbiguityGatewayService {
  private readonly logger = new Logger(LlmAmbiguityGatewayService.name);
  private currentProvider: AmbiguityGatewayProvider = new HeuristicAmbiguityResolver();

  setProvider(provider: AmbiguityGatewayProvider): void {
    this.logger.log(`Switched Ambiguity Gateway Provider to: ${provider.name}`);
    this.currentProvider = provider;
  }

  getCurrentProviderName(): AmbiguityGatewayProviderName {
    return this.currentProvider.name;
  }

  isAmbiguous(
    baseResult: ConversationScoreResult,
    messages: ConversationMessageInput[],
    thresholds: ScoringThresholdConfig,
    daysInactive?: number
  ): boolean {
    const isInactive = typeof daysInactive === 'number' && daysInactive >= (thresholds.inactivityDecayDays ?? 14);
    const isBoundary =
      (baseResult.score === thresholds.hotMinScore - 1 ||
        baseResult.score === thresholds.warmMinScore - 1) &&
      !isInactive;

    if (isBoundary && !baseResult.isExcluded) {
      return true;
    }

    if (baseResult.score === 0 && messages.length > 0) {
      const rawTexts = messages.map((m) => (typeof m === 'string' ? m : m.content || '')).filter(Boolean);
      const combined = rawTexts.join(' ').toLowerCase();
      if (
        combined.includes('báo giá') ||
        combined.includes('chi phí') ||
        combined.includes('thủ tục') ||
        combined.includes('còn hàng') ||
        combined.includes('còn chỗ') ||
        combined.includes('tư vấn')
      ) {
        return true;
      }
    }

    return false;
  }

  async resolveAmbiguity(
    messages: ConversationMessageInput[],
    baseResult: ConversationScoreResult,
    thresholds: ScoringThresholdConfig,
    daysInactive?: number
  ): Promise<AmbiguityResolutionResult> {
    return this.currentProvider.resolve(messages, baseResult, thresholds, daysInactive);
  }
}
