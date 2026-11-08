/**
 * Magic Strings & Constants: Hệ thống Chấm điểm & Đánh giá Khách hàng Tiềm năng (Lead Scoring)
 * Áp dụng cho mọi lĩnh vực kinh doanh (Customer Acquisition / CRM Multi-domain).
 * Tuyệt đối không gán cứng code hay sử dụng magic string rải rác.
 */

// 1. Phân hạng nhiệt độ của Khách hàng (Lead Tiers)
export const CONVERSATION_TIERS = {
  HOT: 'HOT',
  WARM: 'WARM',
  COLD: 'COLD',
  IRRELEVANT: 'IRRELEVANT',
} as const;

export type ConversationTier = (typeof CONVERSATION_TIERS)[keyof typeof CONVERSATION_TIERS];

// 2. Nhóm quy tắc chấm điểm (Scoring Rule Groups)
export const SCORING_RULE_GROUPS = {
  READY_TO_CONVERT: 'SAN_SANG_DANG_KY', // Sẵn sàng mua / đăng ký / ký hợp đồng
  INTERESTED: 'QUAN_TAM',              // Quan tâm dịch vụ / chi phí / lộ trình
  INFO_OR_DOCS: 'HO_SO',               // Thông tin hồ sơ / yêu cầu hợp tác
  ENTITY: 'THUC_THE',                  // Thực thể trích xuất (SĐT, Email, Sản phẩm)
  TIME_DECAY: 'TIME_DECAY',            // Suy giảm độ quan tâm do im lặng lâu
  EXCLUSION: 'LOAI_TRU',               // Loại trừ (Spam, tuyển dụng, quảng cáo)
} as const;

export type ScoringRuleGroup = (typeof SCORING_RULE_GROUPS)[keyof typeof SCORING_RULE_GROUPS];

// 3. Từ khóa và mẫu giải trình lý do (Scoring Reason Keywords)
export const SCORING_REASONS = {
  PHONE_DETECTED: 'có SĐT',
  INACTIVITY_PREFIX: 'im lặng',
  INACTIVITY_SUFFIX: 'ngày',
  formatInactivityReason: (days: number): string => `im lặng ${days} ngày`,
} as const;

// 4. Các ý định phân giải tin nhắn mơ hồ (Ambiguity Intents)
export const AMBIGUITY_INTENTS = {
  HIGH_ENGAGEMENT_BOUNDARY: 'TUONG_TAC_CAO_SAT_NGUONG',
  INQUIRY_PROCEDURE: 'HOI_QUY_TRINH_THU_TUC',
  INQUIRY_AVAILABILITY: 'HOI_SAN_PHAM_DICH_VU_CON_CHO',
  INQUIRY_PRICING: 'HOI_BAO_GIA_CHI_PHI',
  INQUIRY_OPENING: 'CAU_CHAO_THAM_DO',
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
  CACHE_TTL_MS: 5 * 60 * 1000, // 5 phút
  EXCLUSION_PENALTY_SCORE: -100,
  EXCLUSION_THRESHOLD_WEIGHT: -50,
} as const;

// 7. Tên sự kiện Domain Event
export const DOMAIN_EVENT_NAMES = {
  CONVERSATION_CLASSIFIED: 'conversation.classified',
} as const;

