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
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  customer,
  hasMultipleChannels,
  isFirstInGroup = true,
  isLastInGroup = true,
}) => {
  const isOutbound = message.direction === 'OUTBOUND';
  const isZaloChannel =
    (message.senderName || '').toLowerCase().includes('zalo') ||
    (message.conversationId || '').startsWith('ZALO');

  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null);
  const openImage = (url: string, name: string) => setLightboxImage({ url, name });

  const isSingleSticker =
    message.attachments?.length === 1 &&
    message.attachments[0].type === 'STICKER' &&
    (!message.content || message.content === '[Nhãn dán]' || message.content === '[Sticker]');

  const hasTextContent =
    Boolean(message.content) &&
    !(message.attachments && message.attachments.length > 0 && isAttachmentPlaceholder(message.content));

  const hasAttachments = Boolean(message.attachments && message.attachments.length > 0);
  const isMediaOnly = !hasTextContent && hasAttachments && !isSingleSticker;

  const attributionLabel = message.isAutomation
    ? 'Automation'
    : message.senderStaffName?.trim() || null;

  const renderStatusIcon = () => {
    if (!isOutbound) return null;
    const title =
      message.status === 'SEEN'
        ? 'Đã xem'
        : message.status === 'DELIVERED'
          ? 'Đã nhận'
          : 'Đã gửi';

    return (
      <span className="inline-flex items-center shrink-0" title={title}>
        {message.status === 'SEEN' ? (
          <CheckCheck size={13} className="text-[#0084FF]" />
        ) : message.status === 'DELIVERED' ? (
          <CheckCheck size={13} className="text-slate-400" />
        ) : (
          <Check size={13} className="text-slate-400" />
        )}
      </span>
    );
  };

  const renderFooterMetadata = () => {
    if (!isLastInGroup) return null;

    if (isOutbound) {
      return (
        <div className="mt-1 flex items-center justify-end gap-1.5 text-[11px] text-slate-500 select-none">
          {hasMultipleChannels && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
              {isZaloChannel ? 'Zalo' : 'FB'}
            </span>
          )}
          {attributionLabel && (
            <>
              <span
                className="font-semibold text-slate-700 truncate max-w-[200px]"
                title={attributionLabel}
              >
                {attributionLabel}
              </span>
              <span className="text-slate-300">•</span>
            </>
          )}
          <span className="tabular-nums">{formatMessageTime(message.sentAt)}</span>
          {renderStatusIcon()}
        </div>
      );
    }

    return (
      <div className="mt-1 flex items-center justify-start gap-1.5 text-[11px] text-slate-500 select-none">
        {hasMultipleChannels && (
          <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
            {isZaloChannel ? 'Zalo' : 'FB'}
          </span>
        )}
        <span className="tabular-nums">{formatMessageTime(message.sentAt)}</span>
      </div>
    );
  };

  return (
    <>
      <div
        className={`flex items-end gap-2 ${isLastInGroup ? 'mb-2.5' : 'mb-0.5'} ${isOutbound ? 'justify-end' : 'justify-start'
          }`}
      >
        {/* Avatar khách hàng chỉ hiển thị ở tin nhắn cuối cùng trong cụm liên tiếp */}
        {!isOutbound && (
          <div className="w-7 shrink-0 flex justify-center">
            {isLastInGroup ? (
              <Avatar
                src={customer.avatarUrl}
                name={message.senderName}
                size={28}
              />
            ) : null}
          </div>
        )}

        {/* TRƯỜNG HỢP 1: Tin nhắn chỉ có Nhãn dán (Sticker) */}
        {isSingleSticker && message.attachments && (
          <div
            className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'
              } max-w-[70%]`}
          >
            <MessageAttachmentView
              messageId={message.id}
              index={0}
              attachment={message.attachments[0]}
              isOutbound={isOutbound}
              onOpenImage={openImage}
              standaloneSticker
            />
            {renderFooterMetadata()}
          </div>
        )}

        {/* TRƯỜNG HỢP 2: Tin nhắn văn bản / Ảnh / Tệp đính kèm */}
        {!isSingleSticker && (
          <div
            className={`max-w-[75%] flex flex-col ${isOutbound ? 'items-end' : 'items-start'
              }`}
          >
            <div
              className={
                isMediaOnly
                  ? 'overflow-hidden rounded-2xl'
                  : `px-3.5 py-2 text-[13.5px] leading-relaxed break-words border-0 shadow-none ${isOutbound
                    ? `bg-[#0084FF] text-white rounded-2xl ${isFirstInGroup ? '' : 'rounded-tr-md'
                    } ${isLastInGroup ? 'rounded-br-sm' : 'rounded-br-md'}`
                    : `bg-[#F0F2F5] text-slate-900 rounded-2xl ${isFirstInGroup ? '' : 'rounded-tl-md'
                    } ${isLastInGroup ? 'rounded-bl-sm' : 'rounded-bl-md'}`
                  }`
              }
            >
              {hasTextContent && (
                <p className="m-0 whitespace-pre-wrap">{message.content}</p>
              )}

              {hasAttachments && message.attachments && (
                <div className={`flex flex-col gap-2 ${hasTextContent ? 'mt-2' : ''}`}>
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
            </div>

            {renderFooterMetadata()}
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