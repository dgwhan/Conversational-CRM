import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  CheckCheck,
  FileText,
  Volume2,
  Download,
  ExternalLink,
  X,
  Image as ImageIcon,
  Smile,
  AlertCircle,
} from 'lucide-react';
import type { ChatMessage, CustomerProfile, MessageAttachment } from '../../../types.js';
import { formatMessageTime } from '../../../utils/conversationUtils.js';
import { Avatar } from '../../../../../components/common/Avatar.js';
import { apiClient } from '../../../../../lib/api-client/index.js';

// Ảnh trong suốt 1x1 hiển thị trong lúc chờ tải ảnh qua Media Proxy (tránh src rỗng)
const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

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

  // Lưu trạng thái lỗi khi tải ảnh trực tiếp từ CDN Meta/Zalo
  const [failedDirectUrls, setFailedDirectUrls] = useState<Record<string, boolean>>({});
  // Lưu trạng thái lỗi hoàn toàn (cả CDN lẫn Proxy đều lỗi / URL hết hạn)
  const [failedProxyUrls, setFailedProxyUrls] = useState<Record<string, boolean>>({});

  // Media Proxy yêu cầu đăng nhập: tải bằng fetch kèm Authorization rồi dùng blob URL thay vì <img src> trực tiếp
  const [proxyBlobUrls, setProxyBlobUrls] = useState<Record<string, string>>({});
  const proxyRequestedRef = useRef<Set<string>>(new Set());
  const proxyBlobUrlsRef = useRef<Record<string, string>>({});

  const resolveImageUrl = (att: MessageAttachment) => {
    let raw = (att.url || '').trim();
    if (!raw && att.stickerId) {
      // Tự động phân giải URL sticker Messenger khi webhook chỉ gửi sticker_id
      raw = `https://lookaside.facebook.com/stickers/${att.stickerId}.png`;
    }
    if (!raw) return '';

    // Nếu tải trực tiếp bị lỗi (CORS/403 Hotlink từ Meta), chuyển hướng qua Media Proxy của CRM
    if (failedDirectUrls[att.id]) {
      return proxyBlobUrls[att.id] || TRANSPARENT_PIXEL;
    }
    return raw;
  };

  useEffect(() => {
    (message.attachments || []).forEach((att) => {
      if (!failedDirectUrls[att.id] || proxyRequestedRef.current.has(att.id)) return;
      let raw = (att.url || '').trim();
      if (!raw && att.stickerId) raw = `https://lookaside.facebook.com/stickers/${att.stickerId}.png`;
      if (!raw) return;

      proxyRequestedRef.current.add(att.id);
      apiClient
        .fetchBlob('/messaging/media-proxy', { url: raw })
        .then((blob) => {
          const objectUrl = URL.createObjectURL(blob);
          proxyBlobUrlsRef.current[att.id] = objectUrl;
          setProxyBlobUrls((prev) => ({ ...prev, [att.id]: objectUrl }));
        })
        .catch(() => {
          setFailedProxyUrls((prev) => ({ ...prev, [att.id]: true }));
        });
    });
  }, [message.attachments, failedDirectUrls]);

  // Giải phóng các blob URL khi bong bóng chat bị gỡ
  useEffect(() => {
    return () => {
      Object.values(proxyBlobUrlsRef.current).forEach((u) => URL.revokeObjectURL(u));
      proxyBlobUrlsRef.current = {};
    };
  }, []);

  const handleImageError = (attId: string) => {
    if (!failedDirectUrls[attId]) {
      // Lỗi lần 1: Kích hoạt tải qua CRM Media Proxy
      setFailedDirectUrls((prev) => ({ ...prev, [attId]: true }));
    } else {
      // Lỗi lần 2: Đánh dấu URL đã hết hạn từ máy chủ gốc của Facebook/Zalo
      setFailedProxyUrls((prev) => ({ ...prev, [attId]: true }));
    }
  };

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
            {failedProxyUrls[message.attachments[0].id] ? (
              // Fallback khi link sticker bị lỗi/hết hạn
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-100 text-slate-600 border border-slate-200 text-xs">
                <Smile className="text-amber-500" size={20} />
                <span>Nhãn dán Messenger (Đã hết hạn từ Meta)</span>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={resolveImageUrl(message.attachments[0])}
                  alt={message.attachments[0].name || 'Nhãn dán'}
                  referrerPolicy="no-referrer"
                  loading="eager"
                  onError={() => handleImageError(message.attachments![0].id)}
                  className="w-32 h-32 md:w-36 md:h-36 object-contain hover:scale-105 transition-transform duration-200 cursor-pointer drop-shadow-sm select-none"
                  onClick={() =>
                    setLightboxImage({
                      url: resolveImageUrl(message.attachments![0]),
                      name: message.attachments![0].name || 'Nhãn dán',
                    })
                  }
                />
              </div>
            )}
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
                !(
                  message.attachments &&
                  message.attachments.length > 0 &&
                  (message.content === '[Hình ảnh]' ||
                    message.content === '[Nhãn dán]' ||
                    message.content === '[Sticker]' ||
                    message.content === '[Tệp đính kèm]' ||
                    message.content === '[Đính kèm]')
                ) && (
                  <p className="m-0 whitespace-pre-wrap">{message.content}</p>
                )}

              {/* Danh sách tệp tin / Ảnh / Sticker đính kèm */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="flex flex-col gap-2 mt-1.5">
                  {message.attachments.map((att) => (
                    <div key={att.id}>
                      {/* A. HIỂN THỊ HÌNH ẢNH */}
                      {att.type === 'IMAGE' && (
                        <div className="relative group overflow-hidden rounded-lg border border-black/10 bg-slate-100 max-w-[280px]">
                          {failedProxyUrls[att.id] ? (
                            <div className="p-4 flex flex-col items-center gap-1.5 text-center text-slate-500 bg-slate-50">
                              <AlertCircle size={22} className="text-amber-500" />
                              <span className="text-xs font-medium">Hình ảnh từ Facebook đã hết hạn</span>
                              <span className="text-[10px] text-slate-400">Meta đã thu hồi liên kết CDN này</span>
                            </div>
                          ) : (
                            <>
                              <img
                                src={resolveImageUrl(att)}
                                alt={att.name || 'Ảnh đính kèm'}
                                referrerPolicy="no-referrer"
                                loading="lazy"
                                onError={() => handleImageError(att.id)}
                                onClick={() =>
                                  setLightboxImage({
                                    url: resolveImageUrl(att),
                                    name: att.name || 'Ảnh đính kèm',
                                  })
                                }
                                className="max-w-[280px] max-h-[240px] w-auto h-auto object-cover rounded-lg cursor-pointer group-hover:scale-[1.02] transition-transform duration-200"
                              />
                              <div
                                onClick={() =>
                                  setLightboxImage({
                                    url: resolveImageUrl(att),
                                    name: att.name || 'Ảnh đính kèm',
                                  })
                                }
                                className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100"
                              >
                                <span className="bg-black/60 text-white text-[11px] font-medium px-2 py-1 rounded-md flex items-center gap-1 backdrop-blur-xs">
                                  <ImageIcon size={12} /> Bấm để phóng to
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* B. HIỂN THỊ NHÃN DÁN TRONG KHỐI TIN NHẮN */}
                      {att.type === 'STICKER' && (
                        <div className="py-1">
                          {failedProxyUrls[att.id] ? (
                            <div className="inline-flex items-center gap-1.5 text-xs text-slate-400 py-1">
                              <Smile size={16} /> <span>Nhãn dán</span>
                            </div>
                          ) : (
                            <img
                              src={resolveImageUrl(att)}
                              alt={att.name || 'Nhãn dán'}
                              referrerPolicy="no-referrer"
                              loading="lazy"
                              onError={() => handleImageError(att.id)}
                              onClick={() =>
                                setLightboxImage({
                                  url: resolveImageUrl(att),
                                  name: att.name || 'Nhãn dán',
                                })
                              }
                              className="w-28 h-28 object-contain cursor-pointer hover:scale-105 transition-transform select-none"
                            />
                          )}
                        </div>
                      )}

                      {/* C. HIỂN THỊ ÂM THANH / VOICE NOTE */}
                      {att.type === 'AUDIO' && (
                        <div
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                            isOutbound
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <Volume2 size={15} />
                          <span className="truncate max-w-[120px]">{att.name}</span>
                          <span className="opacity-80 font-mono text-[11px]">
                            {att.duration || 'Tin nhắn thoại'}
                          </span>
                        </div>
                      )}

                      {/* D. HIỂN THỊ TỆP TIN ĐÍNH KÈM (PDF, DOCX, ZIP, EXCEL) CÓ NÚT TẢI VỀ */}
                      {att.type === 'FILE' && (
                        <div
                          className={`flex items-center justify-between gap-3 p-2.5 rounded-xl text-xs font-medium border transition-all ${
                            isOutbound
                              ? 'bg-white/15 border-white/25 text-white hover:bg-white/20'
                              : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100/80'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <div
                              className={`p-2 rounded-lg shrink-0 ${
                                isOutbound ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'
                              }`}
                            >
                              <FileText size={18} />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="truncate font-semibold max-w-[170px]" title={att.name}>
                                {att.name || 'Tệp đính kèm'}
                              </span>
                              <span
                                className={`text-[11px] ${
                                  isOutbound ? 'text-blue-100' : 'text-slate-500'
                                }`}
                              >
                                {att.size || 'Tài liệu'}
                              </span>
                            </div>
                          </div>

                          <a
                            href={att.url || `/api/messaging/media-proxy?url=${encodeURIComponent(att.url)}&filename=${encodeURIComponent(att.name || 'document')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={att.name || 'document'}
                            className={`p-2 rounded-lg transition-colors shrink-0 ${
                              isOutbound
                                ? 'bg-white/20 hover:bg-white/30 text-white'
                                : 'bg-slate-200/70 hover:bg-slate-300 text-slate-700'
                            }`}
                            title="Tải tệp xuống hoặc mở trong tab mới"
                          >
                            <Download size={15} />
                          </a>
                        </div>
                      )}
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
