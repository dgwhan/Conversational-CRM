export * from './routing-status.constants.js';

export const AUDIT_META = (
  before: unknown,
  after: unknown,
  reason: string,
) => ({ before, after, reason });
