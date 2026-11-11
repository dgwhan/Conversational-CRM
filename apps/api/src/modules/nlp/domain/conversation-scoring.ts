

import { containsNormalizedPhrase, normalize } from '../text-normalizer.js';
import { extractEntities, type CatalogProductItem, type ExtractedEntitiesResult } from '../entity-extractor.js';
import { isKeywordNegated } from './negation-detector.js';
import type { KeywordRuleItem } from '../keyword-scoring.js';
import {
  CONVERSATION_TIERS,
  SCORING_RULE_GROUPS,
  SCORING_REASONS,
  DEFAULT_SCORING_THRESHOLDS_CONFIG,
  DEFAULT_TIER_LABELS,
  DEFAULT_TIER_RECOMMENDATIONS,
  DEFAULT_NEGATION_TERMS,
  DEFAULT_NEGATION_POST_TERMS,
  type ConversationTier,
} from './scoring.constants.js';

export { CONVERSATION_TIERS, SCORING_RULE_GROUPS, SCORING_REASONS, type ConversationTier };

export interface ScoringThresholdConfig {
  hotMinScore: number;
  warmMinScore: number;
  coldMinScore: number;
  phoneBonusScore: number;
  inactivityDecayDays: number;
  inactivityDecayPoints: number;
  inactivityDecayWeeklyPoints: number;
  inactivityDecayIntervalDays: number;
  exclusionThresholdWeight: number;
  exclusionPenaltyScore: number;
  ambiguityScoreGap: number;
  hotBoundaryMinMessages: number;
  shortMessageMaxWords: number;
  ambiguityResolutionEnabled: boolean;
  negationWindowWords: number;
  negationTerms: string[];
  negationPostTerms: string[];
  tierLabels: Record<ConversationTier, string>;
  tierRecommendations: Record<ConversationTier, string>;
}

export const DEFAULT_SCORING_THRESHOLDS: ScoringThresholdConfig = {
  hotMinScore: DEFAULT_SCORING_THRESHOLDS_CONFIG.HOT_MIN_SCORE,
  warmMinScore: DEFAULT_SCORING_THRESHOLDS_CONFIG.WARM_MIN_SCORE,
  coldMinScore: DEFAULT_SCORING_THRESHOLDS_CONFIG.COLD_MIN_SCORE,
  phoneBonusScore: DEFAULT_SCORING_THRESHOLDS_CONFIG.PHONE_BONUS_SCORE,
  inactivityDecayDays: DEFAULT_SCORING_THRESHOLDS_CONFIG.INACTIVITY_DECAY_DAYS,
  inactivityDecayPoints: DEFAULT_SCORING_THRESHOLDS_CONFIG.INACTIVITY_DECAY_POINTS,
  inactivityDecayWeeklyPoints: DEFAULT_SCORING_THRESHOLDS_CONFIG.INACTIVITY_DECAY_WEEKLY_POINTS,
  inactivityDecayIntervalDays: DEFAULT_SCORING_THRESHOLDS_CONFIG.INACTIVITY_DECAY_INTERVAL_DAYS,
  exclusionThresholdWeight: DEFAULT_SCORING_THRESHOLDS_CONFIG.EXCLUSION_THRESHOLD_WEIGHT,
  exclusionPenaltyScore: DEFAULT_SCORING_THRESHOLDS_CONFIG.EXCLUSION_PENALTY_SCORE,
  ambiguityScoreGap: DEFAULT_SCORING_THRESHOLDS_CONFIG.AMBIGUITY_SCORE_GAP,
  hotBoundaryMinMessages: DEFAULT_SCORING_THRESHOLDS_CONFIG.HOT_BOUNDARY_MIN_MESSAGES,
  shortMessageMaxWords: DEFAULT_SCORING_THRESHOLDS_CONFIG.SHORT_MESSAGE_MAX_WORDS,
  ambiguityResolutionEnabled: DEFAULT_SCORING_THRESHOLDS_CONFIG.AMBIGUITY_RESOLUTION_ENABLED,
  negationWindowWords: DEFAULT_SCORING_THRESHOLDS_CONFIG.NEGATION_WINDOW_WORDS,
  negationTerms: [...DEFAULT_NEGATION_TERMS],
  negationPostTerms: [...DEFAULT_NEGATION_POST_TERMS],
  tierLabels: { ...DEFAULT_TIER_LABELS },
  tierRecommendations: { ...DEFAULT_TIER_RECOMMENDATIONS },
};

export interface MatchedReasonItem {
  keyword: string;
  points: number;
  ruleId?: string;
  group?: string;
  sourceMessageIndex?: number;
}

export interface ConversationScoreResult {
  score: number;
  tier: ConversationTier;
  reasons: MatchedReasonItem[];
  reasonsFormatted: string;
  entities: ExtractedEntitiesResult;
  isExcluded: boolean;
}

export type ConversationMessageInput =
  | string
  | {
    id?: string;
    content?: string | null;
    senderRole?: 'CUSTOMER' | 'STAFF' | 'BOT' | string;
  };

/**
 * Hàm thuần chấm điểm toàn bộ hội thoại:
 * scoreConversation(messages, rules, thresholdConfig, catalog, daysInactive)
 *
 * Tiêu chí cốt lõi:
 * 1. Độc lập với domain ngành nghề (Multi-domain).
 * 2. Cộng dồn điểm theo toàn bộ hội thoại, khử trùng lặp từ khóa (Deduplication).
 * 3. Xử lý câu phủ định ngữ cảnh (Negation Detection).
 * 4. Thưởng điểm thực thể liên hệ (SĐT).
 * 5. Điểm giảm dần khi khách im lặng lâu (Inactivity Time Decay, cấu hình số ngày).
 * 6. Phân hạng nhiệt độ (HOT, WARM, COLD, IRRELEVANT) qua constants.
 */
export function scoreConversation(
  messages: ConversationMessageInput[],
  rules: KeywordRuleItem[] = [],
  thresholdConfig: Partial<ScoringThresholdConfig> = {},
  catalog: CatalogProductItem[] = [],
  daysInactive?: number
): ConversationScoreResult {
  const config: ScoringThresholdConfig = {
    ...DEFAULT_SCORING_THRESHOLDS,
    ...thresholdConfig,
  };

  const phoneBonus = config.phoneBonusScore;

  // 1. Chuẩn hóa danh sách chuỗi tin nhắn đầu vào
  const messageTexts: string[] = [];
  for (const msg of messages) {
    if (!msg) continue;
    if (typeof msg === 'string') {
      if (msg.trim()) messageTexts.push(msg.trim());
    } else if (typeof msg === 'object' && msg.content) {
      if (msg.senderRole && msg.senderRole !== 'CUSTOMER' && msg.senderRole !== 'user') {
        continue;
      }
      if (msg.content.trim()) messageTexts.push(msg.content.trim());
    }
  }

  // Kết hợp nội dung toàn bộ hội thoại để trích xuất thực thể
  const combinedRawText = messageTexts.join('\n');
  const entities = extractEntities(combinedRawText, catalog);

  const matchedReasons: MatchedReasonItem[] = [];
  const appliedRuleIds = new Set<string>();
  const appliedKeywords = new Set<string>();
  let isExcluded = false;

  // Lọc danh sách luật đang kích hoạt (isActive === true)
  const activeRules = rules.filter((r) => r.isActive !== false);

  // 2. Quét qua từng tin nhắn để khớp luật từ khóa
  for (let msgIdx = 0; msgIdx < messageTexts.length; msgIdx++) {
    const rawMsg = messageTexts[msgIdx];
    const normMsg = normalize(rawMsg);
    if (!normMsg) continue;

    for (const rule of activeRules) {
      const normKeyword = normalize(rule.keyword);
      if (
        !normKeyword ||
        appliedRuleIds.has(rule.id) ||
        appliedKeywords.has(normKeyword) ||
        !containsNormalizedPhrase(normMsg, normKeyword)
      ) {
        continue;
      }

      const negated = isKeywordNegated(
        normMsg,
        normKeyword,
        config.negationWindowWords,
        config.negationTerms,
        config.negationPostTerms,
      );
      if (negated) continue;

      appliedRuleIds.add(rule.id);
      appliedKeywords.add(normKeyword);
      matchedReasons.push({
        keyword: rule.keyword,
        points: rule.weight,
        ruleId: rule.id,
        group: rule.group,
        sourceMessageIndex: msgIdx,
      });

      if (rule.weight <= config.exclusionThresholdWeight) {
        isExcluded = true;
      }
    }
  }

  // 3. Thưởng điểm Số Điện Thoại hợp lệ
  if (entities.phoneNumber) {
    matchedReasons.push({
      keyword: SCORING_REASONS.PHONE_DETECTED,
      points: phoneBonus,
      group: SCORING_RULE_GROUPS.ENTITY,
    });
  }

  // 3.1. Suy giảm điểm khi khách im lặng lâu (Inactivity Decay - Cấu hình được số ngày)
  const decayThresholdDays = config.inactivityDecayDays ?? DEFAULT_SCORING_THRESHOLDS_CONFIG.INACTIVITY_DECAY_DAYS;
  const decayBasePoints = config.inactivityDecayPoints ?? DEFAULT_SCORING_THRESHOLDS_CONFIG.INACTIVITY_DECAY_POINTS;

  if (
    typeof daysInactive === 'number' &&
    daysInactive >= decayThresholdDays &&
    decayBasePoints > 0 &&
    !isExcluded
  ) {
    const extraIntervals = Math.floor((daysInactive - decayThresholdDays) / config.inactivityDecayIntervalDays);
    const totalDecay = decayBasePoints + extraIntervals * config.inactivityDecayWeeklyPoints;

    matchedReasons.push({
      keyword: SCORING_REASONS.formatInactivityReason(daysInactive),
      points: -totalDecay,
      group: SCORING_RULE_GROUPS.TIME_DECAY,
    });
  }

  // 4. Tính toán tổng điểm tích lũy
  let totalScore = 0;
  for (const reason of matchedReasons) {
    totalScore += reason.points;
  }

  if (!isExcluded && totalScore < 0) {
    totalScore = 0;
  }

  if (isExcluded && totalScore > 0) {
    totalScore = config.exclusionPenaltyScore ?? DEFAULT_SCORING_THRESHOLDS_CONFIG.EXCLUSION_PENALTY_SCORE;
  }

  // 5. Xác định Phân hạng nhiệt độ (Tier) dựa theo ngưỡng cấu hình qua constants
  let tier: ConversationTier = CONVERSATION_TIERS.IRRELEVANT;

  if (isExcluded || totalScore <= 0) {
    tier = CONVERSATION_TIERS.IRRELEVANT;
  } else if (totalScore >= config.hotMinScore) {
    tier = CONVERSATION_TIERS.HOT;
  } else if (totalScore >= config.warmMinScore) {
    tier = CONVERSATION_TIERS.WARM;
  } else if (totalScore >= config.coldMinScore) {
    tier = CONVERSATION_TIERS.COLD;
  } else {
    tier = CONVERSATION_TIERS.IRRELEVANT;
  }

  // 6. Định dạng chuỗi giải trình lý do minh bạch
  const formattedParts = matchedReasons.map((r) => {
    const sign = r.points >= 0 ? `+${r.points}` : `${r.points}`;
    return `${r.keyword} ${sign}`;
  });
  const reasonsFormatted = formattedParts.join(', ');

  return {
    score: totalScore,
    tier,
    reasons: matchedReasons,
    reasonsFormatted,
    entities,
    isExcluded,
  };
}
