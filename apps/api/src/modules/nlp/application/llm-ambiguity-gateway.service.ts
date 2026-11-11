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

export class HeuristicAmbiguityResolver implements AmbiguityGatewayProvider {
  public readonly name: AmbiguityGatewayProviderName = AMBIGUITY_GATEWAY_PROVIDERS.HEURISTIC_LOCAL;

  async resolve(
    messages: ConversationMessageInput[],
    baseResult: ConversationScoreResult,
    thresholds: ScoringThresholdConfig,
    daysInactive?: number
  ): Promise<AmbiguityResolutionResult> {
    const rawTexts = messages.map((message) =>
      typeof message === 'string' ? message : message.content || ''
    ).filter(Boolean);
    const isInactive = typeof daysInactive === 'number' && daysInactive >= thresholds.inactivityDecayDays;
    const isHotBoundary =
      baseResult.score < thresholds.hotMinScore &&
      baseResult.score >= thresholds.hotMinScore - thresholds.ambiguityScoreGap;

    if (
      isHotBoundary &&
      !baseResult.isExcluded &&
      !isInactive &&
      rawTexts.length >= thresholds.hotBoundaryMinMessages
    ) {
      return {
        isAmbiguous: true,
        adjustedTier: CONVERSATION_TIERS.HOT,
        adjustedScore: thresholds.hotMinScore,
        intentDetected: AMBIGUITY_INTENTS.HIGH_ENGAGEMENT_BOUNDARY,
        reason: `Điểm nằm sát ngưỡng ${thresholds.tierLabels.HOT} (${thresholds.hotMinScore}) và đạt số lượt tương tác đã cấu hình.`,
        needsHumanReview: false,
        providerUsed: this.name,
      };
    }

    if (
      rawTexts.length === 1 &&
      rawTexts[0].trim().split(/\s+/).length <= thresholds.shortMessageMaxWords &&
      baseResult.tier === CONVERSATION_TIERS.IRRELEVANT
    ) {
      return {
        isAmbiguous: true,
        adjustedTier: CONVERSATION_TIERS.IRRELEVANT,
        adjustedScore: 0,
        intentDetected: AMBIGUITY_INTENTS.SHORT_QUERY_UNRESOLVED,
        reason: 'Tin nhắn ngắn chưa khớp tiêu chí đã cấu hình; cần nhân viên xem xét.',
        needsHumanReview: true,
        providerUsed: this.name,
      };
    }

    return {
      isAmbiguous: false,
      reason: 'Không cần hiệu chỉnh kết quả chấm điểm theo cấu hình hiện tại.',
      needsHumanReview: false,
      providerUsed: this.name,
    };
  }
}

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
    const isInactive = typeof daysInactive === 'number' && daysInactive >= thresholds.inactivityDecayDays;
    const isBoundary =
      baseResult.score < thresholds.hotMinScore &&
      baseResult.score >= thresholds.hotMinScore - thresholds.ambiguityScoreGap &&
      !isInactive &&
      !baseResult.isExcluded;
    const isShortUnclassifiedMessage =
      messages.length === 1 &&
      baseResult.tier === CONVERSATION_TIERS.IRRELEVANT &&
      (() => {
        const message = messages[0];
        const content = typeof message === 'string' ? message : message.content || '';
        return content.trim().split(/\s+/).length <= thresholds.shortMessageMaxWords;
      })();

    return thresholds.ambiguityResolutionEnabled && (isBoundary || isShortUnclassifiedMessage);
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
