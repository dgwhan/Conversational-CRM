export const LeadRoutingStatus = {
  LEGACY: 'LEGACY',
  SKIPPED: 'SKIPPED',
  QUEUED: 'QUEUED',
  ASSIGNED: 'ASSIGNED',
} as const;

export type LeadRoutingStatus =
  (typeof LeadRoutingStatus)[keyof typeof LeadRoutingStatus];

export const HandoverMode = {
  QUEUE: 'QUEUE',
  TRANSFER: 'TRANSFER',
} as const;

export type HandoverMode = (typeof HandoverMode)[keyof typeof HandoverMode];

export const DEFAULT_HANDOVER_MODE = HandoverMode.QUEUE;

export const AUDIT_META = (
  before: unknown,
  after: unknown,
  reason: string,
) => ({ before, after, reason });