import { useState, useRef, useEffect, useCallback } from 'react';
import type { ConversationItem, MessageAttachment } from '../../../types.js';
import { notify } from '../../../../../components/feedback/toastEmitter.js';
import { useOutboundAttachments } from './useOutboundAttachments.js';
import { useVoiceRecorder } from './useVoiceRecorder.js';
import { canSendVoice, outboundChannelOf } from '../../../utils/outboundMediaRules.js';

/**
 * Gửi tin: text + tệp đính kèm đã tải lên (assetIds). Trả về true khi gửi thành công
 * để khung soạn biết có dọn tệp đính kèm hay giữ lại cho người dùng thử lại.
 */
export type SendMessageHandler = (
  text: string,
  attachments?: MessageAttachment[],
  assetIds?: string[],
) => void | boolean | Promise<boolean | void>;

export interface UseChatComposerOptions {
  conversation: ConversationItem;
  onSendMessage: SendMessageHandler;
}

export function useChatComposer({ conversation, onSendMessage }: UseChatComposerOptions) {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const outboundChannel = outboundChannelOf(conversation.channel);
  const attachments = useOutboundAttachments(outboundChannel);
  const voice = useVoiceRecorder(
    useCallback((file: File) => attachments.addFiles([file], 'AUDIO'), [attachments.addFiles]),
  );

  // Đổi hội thoại: bỏ tệp chưa gửi của hội thoại cũ
  const { discardAll } = attachments;
  useEffect(() => discardAll, [conversation.id, discardAll]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTimestamp(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Tự động cuộn xuống tin nhắn cuối cùng khi có tin mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.messages]);

  // Kiểm tra thời hạn 24 giờ của Meta (Facebook Messenger)
  // Ưu tiên 1: Tin nhắn INBOUND gần nhất trong conversation.messages
  const latestInboundMsg = [...(conversation.messages || [])]
    .reverse()
    .find((m) => m.direction === 'INBOUND');

  const timeFromMsg = latestInboundMsg?.sentAt
    ? new Date(latestInboundMsg.sentAt).getTime()
    : Number.NaN;

  const timeFromField = conversation.lastCustomerMessageAt
    ? new Date(conversation.lastCustomerMessageAt).getTime()
    : Number.NaN;

  // Lấy mốc thời gian khách hàng tương tác gần nhất hợp lệ
  const validTimes = [timeFromField, timeFromMsg].filter((t) => Number.isFinite(t) && !Number.isNaN(t));
  const lastCustomerMessageTime = validTimes.length > 0 ? Math.max(...validTimes) : Number.NaN;

  const hoursDiff = Number.isFinite(lastCustomerMessageTime)
    ? (currentTimestamp - lastCustomerMessageTime) / (1000 * 60 * 60)
    : Number.NaN;

  // Nếu tin nhắn cuối cùng trong chuỗi hội thoại là từ khách hàng đến -> Reset tag 24h ngay lập tức
  const isLastMsgFromCustomer = Boolean(
    conversation.messages &&
    conversation.messages.length > 0 &&
    conversation.messages[conversation.messages.length - 1]?.direction === 'INBOUND'
  );

  // Hợp lệ trong 24 giờ khi:
  // 1. Khách vừa gửi tin nhắn mới
  // 2. Chênh lệch thời gian hợp lệ dưới 24 giờ
  // 3. Hoặc chưa có mốc thời gian cũ (tránh chặn oan tư vấn viên khi vừa nạp hội thoại)
  const isWithin24Hours = isLastMsgFromCustomer || !Number.isFinite(hoursDiff) || (hoursDiff >= 0 && hoursDiff < 24);
  const hoursRemaining = Number.isFinite(hoursDiff) ? Math.max(0, Math.floor(24 - hoursDiff)) : 24;

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    const pending = attachments.items;
    if (!text && pending.length === 0) return;
    if (attachments.isUploading) {
      notify.info('Đang tải tệp lên, vui lòng đợi trong giây lát.');
      return;
    }
    if (attachments.hasErrors) {
      notify.warning('Có tệp tải lên lỗi. Hãy bỏ tệp đó trước khi gửi.');
      return;
    }
    if (conversation.channel === 'FACEBOOK' && !isWithin24Hours) {
      notify.warning(
        'Đã hết cửa sổ phản hồi 24 giờ của Facebook. Chờ khách nhắn lại hoặc dùng phương thức được Meta cho phép.',
      );
      return;
    }

    // Tin tạm hiển thị ngay: ảnh / voice dùng bản xem trước tại chỗ
    const optimistic: MessageAttachment[] = pending.map((it, i) => ({
      id: `local-${it.localId}-${i}`,
      type: it.kind,
      url: it.previewUrl ?? '',
      name: it.fileName,
      size: undefined,
      mimeType: it.mimeType,
    }));
    const assetIds = attachments.readyAssetIds;

    setInputText('');
    setIsSending(true);
    try {
      const ok = await onSendMessage(text, optimistic.length > 0 ? optimistic : undefined, assetIds.length > 0 ? assetIds : undefined);
      if (ok !== false) attachments.clearAfterSend();
    } finally {
      setIsSending(false);
    }
  }, [attachments, conversation.channel, inputText, isWithin24Hours, onSendMessage]);

  // Dán ảnh từ clipboard (VD: chụp màn hình rồi Ctrl+V)
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length === 0) return;
      e.preventDefault();
      attachments.addFiles(
        files.map((f, i) =>
          f.name && f.name !== 'image.png'
            ? f
            : new File([f], `anh-dan-${Date.now()}-${i}.${(f.type.split('/')[1] || 'png').replace('jpeg', 'jpg')}`, { type: f.type }),
        ),
      );
    },
    [attachments],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleQuickReplySelect = useCallback((content: string) => {
    setInputText((prev) => (prev ? `${prev} ${content}` : content));
  }, []);

  const handleInsertEmoji = useCallback(() => {
    setInputText((prev) => `${prev} 😊 `);
  }, []);

  return {
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
    voice: { ...voice, supported: canSendVoice(outboundChannel) },
    library: { isOpen: isLibraryOpen, open: () => setIsLibraryOpen(true), close: () => setIsLibraryOpen(false) },
  };
}
