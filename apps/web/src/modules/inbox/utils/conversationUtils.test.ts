import { describe, expect, it } from 'vitest';
import { deduplicateMessages } from './conversationUtils.js';
import type { ChatMessage } from '../types.js';

const message = (overrides: Partial<ChatMessage>): ChatMessage => ({
  id: 'db-message-1',
  conversationId: 'conversation-1',
  direction: 'OUTBOUND',
  content: 'Xin chào',
  sentAt: '2026-11-16T10:00:00.000Z',
  senderName: 'Page',
  ...overrides,
});

describe('deduplicateMessages sender attribution', () => {
  it('retains optimistic attribution when a realtime copy with the server ID lacks it', () => {
    const result = deduplicateMessages([
      message({ id: 'temp-1', senderStaffId: 'staff-1', senderStaffName: 'Nguyễn An' }),
      message({ id: 'db-message-1', senderStaffId: null, senderStaffName: null }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'db-message-1',
      senderStaffId: 'staff-1',
      senderStaffName: 'Nguyễn An',
    });
  });

  it('fills a missing staff ID even when the existing copy already has a name', () => {
    const result = deduplicateMessages([
      message({ senderStaffName: 'Nguyễn An', senderStaffId: null }),
      message({ senderStaffName: null, senderStaffId: 'staff-1' }),
    ]);

    expect(result[0]).toMatchObject({ senderStaffId: 'staff-1', senderStaffName: 'Nguyễn An' });
  });
});
