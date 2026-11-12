export type MemberDraft = {
  workspaceMemberId: string;
  leadCapacity: number;
  isShiftManager: boolean;
};

export type AuditEntry = {
  id: string;
  action: string;
  createdAt: string;
  actorId?: string | null;
  user?: { fullName: string; email: string } | null;
  metadata?: unknown;
};

export type AuditPage = {
  items: AuditEntry[];
  nextCursor: string | null;
};
