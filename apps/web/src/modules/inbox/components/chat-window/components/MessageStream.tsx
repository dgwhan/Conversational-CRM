import React, { type RefObject } from 'react';
import type { ChatMessage, ConversationItem } from '../../../types.js';
import { getDateDividerLabel } from '../../../utils/conversationUtils.js';
import { MessageBubble } from './MessageBubble.js';

export interface MessageStreamProps {
  conversation: ConversationItem;
  messagesEndRef: RefObject<HTMLDivElement | null>;
}

export const MessageStream: React.FC<MessageStreamProps> = ({
  conversation,
  messagesEndRef,
}) => {
  const messages = conversation.messages;
  const hasMultipleChannels = (conversation.customer.channelIdentities || []).length > 1;

  const getSenderKey = (m: ChatMessage) => {
    if (m.direction === 'INBOUND') return `__inbound_${m.senderName || 'customer'}__`;
    if (m.isAutomation) return '__automation__';
    if (m.senderStaffId) return `__staff_${m.senderStaffId}__`;
    if (m.senderStaffName?.trim()) return m.senderStaffName.trim();
    return '__unknown__';
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-slate-50 custom-scrollbar scrollbar-thin">
      {messages.map((msg, index) => {
        const currentDateLabel = getDateDividerLabel(msg.sentAt);
        const prevMsg = index > 0 ? messages[index - 1] : null;
        const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;

        const prevDateLabel = prevMsg ? getDateDividerLabel(prevMsg.sentAt) : null;
        const nextDateLabel = nextMsg ? getDateDividerLabel(nextMsg.sentAt) : null;

        const showDateDivider = index === 0 || currentDateLabel !== prevDateLabel;

        const currentSender = getSenderKey(msg);
        const prevSender = prevMsg ? getSenderKey(prevMsg) : null;
        const nextSender = nextMsg ? getSenderKey(nextMsg) : null;

        const isFirstInGroup =
          showDateDivider || !prevMsg || prevMsg.direction !== msg.direction || currentSender !== prevSender;

        const isLastInGroup =
          !nextMsg ||
          nextDateLabel !== currentDateLabel ||
          nextMsg.direction !== msg.direction ||
          currentSender !== nextSender;

        return (
          <React.Fragment key={msg.id}>
            {showDateDivider && (
              <div className="flex items-center justify-center my-3">
                <span className="text-[11px] font-medium text-slate-600 bg-white px-2.5 py-0.5 rounded-full select-none border border-slate-200/80">
                  {currentDateLabel}
                </span>
              </div>
            )}

            <MessageBubble
              message={msg}
              customer={conversation.customer}
              hasMultipleChannels={hasMultipleChannels}
              isFirstInGroup={isFirstInGroup}
              isLastInGroup={isLastInGroup}
            />
          </React.Fragment>
        );
      })}

      <div ref={messagesEndRef} />
    </div>
  );
};
