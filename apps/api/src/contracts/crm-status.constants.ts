import { ConversationStatus } from '@prisma/client';

/**
 * FILE CẤU HÌNH TRẠNG THÁI CHUNG TOÀN HỆ THỐNG CRM
 *
 * Định nghĩa tập trung các hằng số và kiểu dữ liệu cho:
 * 1. Trạng thái khách hàng / Lead (leadStatus)
 * 2. Giai đoạn trong phễu tuyển sinh / Pipeline (leadStage)
 * 3. Trạng thái cuộc hội thoại (ConversationStatus)
 */

export const CustomerLeadStatus = {
  NEW: 'NEW',
  POTENTIAL: 'POTENTIAL',
  QUALIFIED: 'QUALIFIED',
  CONVERTED: 'CONVERTED',
  UNQUALIFIED: 'UNQUALIFIED',
} as const;

export type CustomerLeadStatus =
  (typeof CustomerLeadStatus)[keyof typeof CustomerLeadStatus];

export const CUSTOMER_LEAD_STATUSES = [
  CustomerLeadStatus.NEW,
  CustomerLeadStatus.POTENTIAL,
  CustomerLeadStatus.QUALIFIED,
  CustomerLeadStatus.CONVERTED,
  CustomerLeadStatus.UNQUALIFIED,
] as const;

export const CustomerLeadStage = {
  STAGE_NEW: 'TIẾP CẬN',
  STAGE_CONTACTED: 'LIÊN HỆ',
  STAGE_QUALIFIED: 'TIỀM NĂNG',
  STAGE_APPOINTMENT: 'HẸN GẶP',
  STAGE_SUBMITTED: 'NỘP HỒ SƠ',
  STAGE_ENROLLED: 'NHẬP HỌC',
  STAGE_LOST: 'THẤT BẠI',
} as const;

export type CustomerLeadStage =
  (typeof CustomerLeadStage)[keyof typeof CustomerLeadStage];

export const CUSTOMER_LEAD_STAGES = [
  CustomerLeadStage.STAGE_NEW,
  CustomerLeadStage.STAGE_CONTACTED,
  CustomerLeadStage.STAGE_QUALIFIED,
  CustomerLeadStage.STAGE_APPOINTMENT,
  CustomerLeadStage.STAGE_SUBMITTED,
  CustomerLeadStage.STAGE_ENROLLED,
  CustomerLeadStage.STAGE_LOST,
] as const;

// Xuất lại ConversationStatus chuẩn từ Prisma
export { ConversationStatus };

/**
 * Giá trị khởi tạo mặc định cho Lead mới và Hội thoại mới
 */
export const DEFAULT_CRM_CONFIG = {
  DEFAULT_LEAD_STATUS: CustomerLeadStatus.NEW,
  DEFAULT_LEAD_STAGE: CustomerLeadStage.STAGE_NEW,
  DEFAULT_CONVERSATION_STATUS: ConversationStatus.OPEN,
} as const;

