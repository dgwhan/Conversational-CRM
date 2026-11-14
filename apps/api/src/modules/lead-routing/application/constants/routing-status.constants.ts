import { AvailabilityExceptionStatus, AvailabilityExceptionType, ConversationStatus, LeadQueueReason, LeadQueueStatus, UserStatus, WorkspaceMemberStatus } from '@prisma/client';
import { WorkspaceRole } from '../../../../contracts/roles.js';

/**
 * Trạng thái kết quả định tuyến lead / phân bổ hội thoại
 */
export const LeadRoutingStatus = {
  LEGACY: 'LEGACY',
  SKIPPED: 'SKIPPED',
  QUEUED: 'QUEUED',
  ASSIGNED: 'ASSIGNED',
} as const;

export type LeadRoutingStatus =
  (typeof LeadRoutingStatus)[keyof typeof LeadRoutingStatus];

/**
 * Chế độ bàn giao lead khi nhân viên offboard / nghỉ đột xuất / khóa nhận lead
 */
export const HandoverMode = {
  QUEUE: 'QUEUE',
  TRANSFER: 'TRANSFER',
} as const;

export type HandoverMode = (typeof HandoverMode)[keyof typeof HandoverMode];

export const DEFAULT_HANDOVER_MODE = HandoverMode.QUEUE;

/**
 * Mã lý do bàn giao lead trong hệ thống kiểm toán (Audit Log)
 */
export const HandoverReasonCode = {
  STAFF_ASSIGNMENT_LOCKED: 'STAFF_ASSIGNMENT_LOCKED',
  STAFF_OUTSIDE_SHIFT: 'STAFF_OUTSIDE_SHIFT',
  UNEXPECTED_LEAVE: 'UNEXPECTED_LEAVE',
  STAFF_OFFBOARDING: 'STAFF_OFFBOARDING',
  MANUAL_HANDOVER: 'MANUAL_HANDOVER',
} as const;

export type HandoverReasonCode =
  (typeof HandoverReasonCode)[keyof typeof HandoverReasonCode];

/**
 * Nguồn kích hoạt sự kiện phân luồng / bàn giao
 */
export const RoutingAuditSource = {
  SHIFT_ROUTING: 'SHIFT_ROUTING',
  MANUAL_HANDOVER: 'MANUAL_HANDOVER',
  QUEUE_CLAIM: 'QUEUE_CLAIM',
  AUTO_ESCALATION: 'AUTO_ESCALATION',
} as const;

export type RoutingAuditSource =
  (typeof RoutingAuditSource)[keyof typeof RoutingAuditSource];

/**
 * Re-export các Enum và hằng số trạng thái để các module trong lead-routing
 * có thể import tập trung từ một nguồn cấu hình duy nhất.
 */
export { ConversationStatus, WorkspaceMemberStatus, UserStatus, WorkspaceRole, LeadQueueStatus, LeadQueueReason, AvailabilityExceptionType, AvailabilityExceptionStatus };
