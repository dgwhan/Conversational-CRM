import React, { useState } from 'react';
import { Check, CheckCheck, Download, ExternalLink, X } from 'lucide-react';
import type { ChatMessage, CustomerProfile } from '../../../types.js';
import { formatMessageTime } from '../../../utils/conversationUtils.js';
import { Avatar } from '../../../../../components/common/Avatar.js';
import { MessageAttachmentView } from './MessageAttachmentView.js';
import { isAttachmentPlaceholder } from '../../../utils/attachmentContent.js';

export interface MessageBubbleProps {
  message: ChatMessage;
  customer: CustomerProfile;
  hasMultipleChannels: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  customer,
  hasMultipleChannels,
}) => {
  const isOutbound = message.direction === 'OUTBOUND';
  const isZaloChannel =
    (message.senderName || '').toLowerCase().includes('zalo') ||
    (message.conversationId || '').startsWith('ZALO');

  // Quản lý Modal Lightbox xem trước ảnh phóng to
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null);

  const openImage = (url: string, name: string) => setLightboxImage({ url, name });

  // Xác định xem tin nhắn có phải chỉ gồm duy nhất 1 nhãn dán (Sticker) hay không
  const isSingleSticker =
    message.attachments?.length === 1 &&
    message.attachments[0].type === 'STICKER' &&
    (!message.content || message.content === '[Nhãn dán]' || message.content === '[Sticker]');

  return (
    <>
      <div
        className={`flex items-end gap-2 my-1.5 ${
          isOutbound ? 'justify-end' : 'justify-start'
        }`}
      >
        {/* Avatar người gửi tin nhắn đến (Inbound) */}
        {!isOutbound && (
          <Avatar
            src={customer.avatarUrl}
            name={message.senderName}
            size={28}
            className="border border-slate-200/80 shrink-0 mb-1"
          />
        )}

        {/* TRƯỜNG HỢP 1: Tin nhắn chỉ có Nhãn dán (Sticker) */}
        {isSingleSticker && message.attachments && (
          <div
            className={`flex flex-col ${
              isOutbound ? 'items-end' : 'items-start'
            } max-w-[70%] group`}
          >
            <MessageAttachmentView
              messageId={message.id}
              index={0}
              attachment={message.attachments[0]}
              isOutbound={isOutbound}
              onOpenImage={openImage}
              standaloneSticker
            />
            {/* Timestamp dưới sticker */}
            <div
              className={`flex items-center gap-1 mt-1 text-[11px] text-slate-400 select-none ${
                isOutbound ? 'justify-end' : 'justify-start'
              }`}
            >
              <span>{formatMessageTime(message.sentAt)}</span>
              {isOutbound && (
                <span className="inline-flex shrink-0">
                  {message.status === 'SEEN' ? (
                    <CheckCheck size={13} className="text-blue-500" />
                  ) : message.status === 'DELIVERED' ? (
                    <CheckCheck size={13} className="text-slate-400" />
                  ) : (
                    <Check size={13} className="text-slate-400" />
                  )}
                </span>
              )}
            </div>
          </div>
        )}

        {/* TRƯỜNG HỢP 2: Tin nhắn thông thường hoặc có kèm Ảnh / Tệp / Âm thanh */}
        {!isSingleSticker && (
          <div
            className={`max-w-[75%] flex flex-col ${
              isOutbound ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`px-3.5 py-2.5 text-sm leading-relaxed break-words shadow-sm ${
                isOutbound
                  ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm'
                  : 'bg-white border border-slate-200/90 text-slate-800 rounded-2xl rounded-tl-sm'
              }`}
            >
              {/* Nội dung tin nhắn văn bản (nếu không phải là text placeholder của attachment) */}
              {message.content &&
                !(message.attachments && message.attachments.length > 0 && isAttachmentPlaceholder(message.content)) && (
                  <p className="m-0 whitespace-pre-wrap">{message.content}</p>
                )}

              {/* Danh sách tệp tin / Ảnh / Sticker đính kèm */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="flex flex-col gap-2 mt-1.5">
                  {message.attachments.map((att, index) => (
                    <div key={att.id || index}>
                      <MessageAttachmentView
                        messageId={message.id}
                        index={index}
                        attachment={att}
                        isOutbound={isOutbound}
                        onOpenImage={openImage}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Meta footer: Channel Tag (nếu đa kênh), Thời gian gửi, Icon đã xem */}
              <div
                className={`flex items-center gap-1.5 mt-1.5 text-[11px] select-none ${
                  isOutbound ? 'justify-end text-blue-100' : 'justify-start text-slate-400'
                }`}
              >
                {hasMultipleChannels && (
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-medium ${
                      isOutbound ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-700'
                    }`}
                  >
                    {isZaloChannel ? 'Zalo' : 'FB'}
                  </span>
                )}

                <span>{formatMessageTime(message.sentAt)}</span>

                {isOutbound && (
                  <span
                    className="inline-flex shrink-0 ml-0.5"
                    title={
                      message.status === 'SEEN'
                        ? 'Đã xem'
                        : message.status === 'DELIVERED'
                        ? 'Đã nhận'
                        : 'Đã gửi'
                    }
                  >
                    {message.status === 'SEEN' ? (
                      <CheckCheck size={13} className="text-white" />
                    ) : message.status === 'DELIVERED' ? (
                      <CheckCheck size={13} className="text-blue-200" />
                    ) : (
                      <Check size={13} className="text-blue-200" />
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL LIGHTBOX XEM ẢNH / STICKER PHÓNG TO TOÀN MÀN HÌNH */}
      {lightboxImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setLightboxImage(null)}
        >
          {/* Header công cụ */}
          <div
            className="w-full max-w-4xl flex items-center justify-between text-white pb-3 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-sm font-medium truncate max-w-md opacity-90">
              {lightboxImage.name}
            </span>
            <div className="flex items-center gap-2">
              <a
                href={lightboxImage.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1.5 text-xs font-medium"
                title="Mở ảnh trong tab mới"
              >
                <ExternalLink size={14} /> Mở tab mới
              </a>
              <a
                href={lightboxImage.url}
                download={lightboxImage.name}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1.5 text-xs font-medium"
                title="Tải ảnh về máy"
              >
                <Download size={14} /> Tải ảnh
              </a>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="p-2 rounded-lg bg-white/10 hover:bg-red-500/80 text-white transition-colors cursor-pointer"
                title="Đóng xem trước (Esc)"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Ảnh phóng to */}
          <div
            className="relative max-w-4xl max-h-[82vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImage.url}
              alt={lightboxImage.name}
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[82vh] object-contain rounded-lg shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}
    </>
  );
};
