/**
 * Stable system identifiers and editable workspace-scoring bootstrap values.
 */

// 1. Phân hạng nhiệt độ của Khách hàng (Lead Tiers)
export const CONVERSATION_TIERS = {
  HOT: 'HOT',
  WARM: 'WARM',
  COLD: 'COLD',
  IRRELEVANT: 'IRRELEVANT',
} as const;

export type ConversationTier = (typeof CONVERSATION_TIERS)[keyof typeof CONVERSATION_TIERS];

// 2. Internal reason groups; customer-defined keyword rules use workspace group names.
export const SCORING_RULE_GROUPS = {
  ENTITY: 'THUC_THE',
  TIME_DECAY: 'TIME_DECAY',
} as const;

export type ScoringRuleGroup = (typeof SCORING_RULE_GROUPS)[keyof typeof SCORING_RULE_GROUPS];

// 3. Từ khóa và mẫu giải trình lý do (Scoring Reason Keywords)
export const SCORING_REASONS = {
  PHONE_DETECTED: 'có SĐT',
  INACTIVITY_PREFIX: 'im lặng',
  INACTIVITY_SUFFIX: 'ngày',
  formatInactivityReason: (days: number): string => `im lặng ${days} ngày`,
} as const;

export const DEFAULT_NEGATION_TERMS = [
  'khong',
  'chua',
  'ko',
  'k0',
  'k',
  'hong',
  'hong co',
  'chang',
  'dung',
  'dung co',
  'huy',
  'ngung',
  'thoi',
  'khoi',
  'rut',
  'chua tung',
  'khong he',
  'chua muon',
  'khong muon',
  'ko muon',
  'khong can',
  'ko can',
] as const;

export const DEFAULT_NEGATION_POST_TERMS = [
  'dau',
  'nua',
  'gi dau',
  'chi nua',
  'dau a',
  'dau nhe',
] as const;

// 4. Các ý định phân giải tin nhắn mơ hồ (Ambiguity Intents)
export const AMBIGUITY_INTENTS = {
  HIGH_ENGAGEMENT_BOUNDARY: 'TUONG_TAC_CAO_SAT_NGUONG',
  SHORT_QUERY_UNRESOLVED: 'TIN_NHAN_NGAN_CHUA_RO_Y_DINH',
} as const;

export type AmbiguityIntent = (typeof AMBIGUITY_INTENTS)[keyof typeof AMBIGUITY_INTENTS];

// 5. Cổng Provider giải quyết tin mơ hồ (Gateway Providers)
export const AMBIGUITY_GATEWAY_PROVIDERS = {
  HEURISTIC_LOCAL: 'HEURISTIC_LOCAL',
  EXTERNAL_LLM: 'EXTERNAL_LLM',
} as const;

export type AmbiguityGatewayProviderName =
  (typeof AMBIGUITY_GATEWAY_PROVIDERS)[keyof typeof AMBIGUITY_GATEWAY_PROVIDERS];

// 6. Cấu hình tham số mặc định cho hệ thống chấm điểm
export const DEFAULT_SCORING_THRESHOLDS_CONFIG = {
  HOT_MIN_SCORE: 8,
  WARM_MIN_SCORE: 4,
  COLD_MIN_SCORE: 1,
  PHONE_BONUS_SCORE: 5,
  INACTIVITY_DECAY_DAYS: 14,
  INACTIVITY_DECAY_POINTS: 3,
  INACTIVITY_DECAY_WEEKLY_POINTS: 2,
  INACTIVITY_DECAY_INTERVAL_DAYS: 7,
  CACHE_TTL_MS: 5 * 60 * 1000, // 5 phút
  EXCLUSION_PENALTY_SCORE: -100,
  EXCLUSION_THRESHOLD_WEIGHT: -50,
  AMBIGUITY_SCORE_GAP: 1,
  HOT_BOUNDARY_MIN_MESSAGES: 2,
  SHORT_MESSAGE_MAX_WORDS: 4,
  AMBIGUITY_RESOLUTION_ENABLED: true,
  NEGATION_WINDOW_WORDS: 4,
} as const;

export const DEFAULT_TIER_LABELS = {
  HOT: 'Ưu tiên cao',
  WARM: 'Đang quan tâm',
  COLD: 'Mới tiếp cận',
  IRRELEVANT: 'Chưa phân loại',
} as const;

export const DEFAULT_TIER_RECOMMENDATIONS = {
  HOT: 'Khách hàng có nhu cầu rõ ràng. Ưu tiên liên hệ sớm.',
  WARM: 'Khách hàng đang tìm hiểu. Gửi thông tin tư vấn phù hợp.',
  COLD: 'Khách hàng mới tiếp cận. Tiếp tục giải đáp và chăm sóc.',
  IRRELEVANT: 'Chưa phát hiện tín hiệu phù hợp trong hội thoại.',
} as const;

// 7. Tên sự kiện Domain Event
export const DOMAIN_EVENT_NAMES = {
  CONVERSATION_CLASSIFIED: 'conversation.classified',
} as const;

