/**
 * ĐỊNH NGHĨA KIỂU DỮ LIỆU & INTERFACES CHO ZALO CÁ NHÂN (ZCA-JS)
 */

export interface ZcaSafetyConfig {
  enabled: boolean;
  minIntervalMs: number; // Giãn cách tối thiểu giữa 2 tin nhắn (mặc định 2500ms)
  maxIntervalMs: number; // Giãn cách tối đa giữa 2 tin nhắn (mặc định 4500ms)
  maxMessagesPerMinute: number; // Tối đa tin nhắn / phút (mặc định 15)
  maxStrangerPerDay: number; // Tối đa tin nhắn người lạ / ngày (mặc định 40)
  autoCooldownMinutes: number; // Thời gian làm mát khi nghi ngờ spam (mặc định 15)
}

export interface QrLoginSession {
  sessionId: string;
  qrCodeUrl: string;
  status: 'PENDING' | 'SCANNED' | 'SUCCESS' | 'EXPIRED' | 'FAILED';
  createdAt: number;
  expiresAt: number;
  account?: {
    id: string;
    externalAccountId: string;
    displayName: string;
    avatarUrl: string;
    phone?: string;
    accessToken: string;
  };
}

export interface ZcaSendMessageResult {
  success: boolean;
  messageId: string;
  channel: 'ZALO';
  customerName?: string;
  customerAvatar?: string;
  recipientId: string;
  sentAt: string;
}

