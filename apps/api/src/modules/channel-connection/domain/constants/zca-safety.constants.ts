import { ZcaSafetyConfig } from '../types/zca.types.js';

/**
 * CẤU HÌNH AN TOÀN MẶC ĐỊNH CHO TÀI KHOẢN ZALO CÁ NHÂN (ANTI-BAN & HUMAN DELAY)
 */
export const DEFAULT_ZCA_SAFETY_CONFIG: ZcaSafetyConfig = {
  enabled: true,
  minIntervalMs: 2500, // 2.5s
  maxIntervalMs: 4500, // 4.5s
  maxMessagesPerMinute: 15,
  maxStrangerPerDay: 40,
  autoCooldownMinutes: 15,
} as const;

export const ZCA_QR_SESSION_TTL_MS = 2 * 60 * 1000; // 2 phút

