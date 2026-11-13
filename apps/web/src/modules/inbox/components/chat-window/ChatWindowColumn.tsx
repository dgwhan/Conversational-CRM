import React from 'react';
import type { ChatWindowColumnProps } from '../../types.js';
import { MediaLibraryModal } from './components/MediaLibraryModal.js';
import { useUserRole } from '../../../auth/index.js';
import {
  useChatComposer,
  ChatHeader,
  LinkedConversationsBanner,
  MessageStream,
  ChatComposer,
} from './index.js';

// Re-export types để đảm bảo backward compatibility
export type { ChatWindowColumnProps };

/**
 * Cột Cửa Sổ Trò Chuyện (Column 2 - Unified Inbox)
 * Tách tầng kiến trúc:
 * - Tầng Logic & State: `useChatComposer` (Soạn thảo tin nhắn, âm thanh voice, 24h Meta, cuộn mượt)
 * - Tầng UI Molecules: Header, LinkedConversationsBanner, MessageStream, ChatComposer (tích hợp quick replies)
 */
export const ChatWindowColumn: React.FC<ChatWindowColumnProps> = ({
  conversation,
  staffList,
  quickReplies,
  alertThresholdMinutes = 15,
  onSendMessage,
  onAssignStaff,
  onBackToList,
  onToggleProfile,
  isProfileOpen,
  onOpenQuickReplySettings,
  onSelectConversation,
}) => {
  // Tầng 1: Nghiệp vụ soạn thảo, voice và tính toán 24h Meta
  const {
    inputText,
    setInputText,
    isSending,
    messagesEndRef,
    isWithin24Hours,
    hoursRemaining,
    handleSend,
    handleKeyDown,
    handlePaste,
    handleQuickReplySelect,
    handleInsertEmoji,
    outboundChannel,
    attachments,
    voice,
    library,
  } = useChatComposer({ conversation, onSendMessage });
  const { isOwner } = useUserRole();

  return (
    <section className="pancake-col-center flex-1 flex flex-col h-full bg-white border-r border-slate-200/80 min-w-[380px] overflow-hidden">
      {/* 1. Header cuộc trò chuyện */}
      <ChatHeader
        conversation={conversation}
        staffList={staffList}
        isWithin24Hours={isWithin24Hours}
        hoursRemaining={hoursRemaining}
        alertThresholdMinutes={alertThresholdMinutes}
        onAssignStaff={onAssignStaff}
        onBackToList={onBackToList}
        onToggleProfile={onToggleProfile}
        isProfileOpen={isProfileOpen}
      />

      {/* 2. Banner hội thoại liên kết đa kênh (CUS-04) */}
      <LinkedConversationsBanner
        customer={conversation.customer}
        onSelectConversation={onSelectConversation}
      />

      {/* 3. Luồng bong bóng tin nhắn (Message Stream & Date Dividers) */}
      <MessageStream
        conversation={conversation}
        messagesEndRef={messagesEndRef}
      />

      {/* 4. Khung soạn thảo tin nhắn hiện đại tích hợp toolbar & quick replies */}
      <ChatComposer
        conversation={conversation}
        inputText={inputText}
        isSending={isSending}
        isWithin24Hours={isWithin24Hours}
        quickReplies={quickReplies}
        outboundChannel={outboundChannel}
        attachments={attachments}
        voice={voice}
        onOpenLibrary={library.open}
        onInputChange={setInputText}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onSend={handleSend}
        onInsertEmoji={handleInsertEmoji}
        onQuickReplySelect={handleQuickReplySelect}
        onOpenQuickReplySettings={onOpenQuickReplySettings}
      />

      {/* 5. Thư viện tài liệu dùng lại (brochure, bảng học phí…) */}
      <MediaLibraryModal
        isOpen={library.isOpen}
        onClose={library.close}
        onSelect={attachments.addLibraryAssets}
        canManage={isOwner}
        channel={outboundChannel}
      />
    </section>
  );
};
