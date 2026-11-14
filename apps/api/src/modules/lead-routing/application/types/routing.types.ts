import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../platform/database/prisma.service.js';

export type Db = PrismaService | Prisma.TransactionClient;

export type Candidate = {
  workspaceMemberId: string;
  userId: string;
  capacity: number;
  lastAssignedAt: Date | null;
  shiftMemberIds: string[];
};

export const AUDIT_META = (before: unknown, after: unknown, reason: string) => ({
  before,
  after,
  reason,
});
