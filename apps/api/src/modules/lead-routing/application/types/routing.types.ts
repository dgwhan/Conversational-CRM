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