import { LeadQueueReason, LeadQueueStatus } from '@prisma/client';

export interface QueueEntryResult {
  entry: {
    id: string;
    workspaceId: string;
    conversationId: string;
    reason: LeadQueueReason;
    priority: number;
    status: LeadQueueStatus;
  };
  created: boolean;
}
