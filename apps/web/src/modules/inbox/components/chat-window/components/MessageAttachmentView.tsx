import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Download, FileText, Image as ImageIcon, Loader2, Smile, Volume2, Video } from 'lucide-react';
import type { MessageAttachment } from '../../../types.js';
import { apiClient } from '../../../../../lib/api-client/index.js';

/** Ảnh trong suốt 1x1 hiển thị trong lúc chờ tải (tránh src rỗng) */
const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

function directUrlOf(att: MessageAttachment): string {
  const raw = (att.url || '').trim();
  if (raw) return raw;
  // Webhook Messenger đôi khi chỉ gửi sticker_id
  return att.stickerId ? `https://lookaside.facebook.com/stickers/${att.stickerId}.png` : '';
}

/** Mã tin dùng cho endpoint media: UUID trong DB hoặc mã tin của kênh (tin realtime chưa có UUID) */
const isAddressable = (messageId: string) => Boolean(messageId) && !/^(auto_reply_|temp|optimistic|local_)/.test(messageId);

/**
 * Nguồn hiển thị của một tệp:
 * 1. Đã có bản sao trong CRM → tải qua endpoint `/messaging/media/:message/:index`.
 * 2. Chưa có → thử link CDN gốc trước (không tốn băng thông máy chủ); lỗi thì chuyển sang endpoint
 *    (server tự lấy bản sao / link mới của Facebook).
 * 3. Endpoint cũng không tải được → hiển thị "đã hết hạn".
 */
function useMediaSource(messageId: string, index: number, att: MessageAttachment, autoLoad = true) {
  const direct = directUrlOf(att);
  const canUseApi = isAddressable(messageId);
  const [mode, setMode] = useState<'direct' | 'api' | 'failed'>(() =>
    att.expired && !att.storageKey ? (canUseApi ? 'api' : 'failed') : att.storageKey && canUseApi ? 'api' : direct ? 'direct' : canUseApi ? 'api' : 'failed',
  );
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const blobRef = useRef<string | null>(null);
  const requested = useRef(false);

  useEffect(() => {
    if (mode !== 'api' || !autoLoad || requested.current) return;
    requested.current = true;
    apiClient
      .fetchBlob(`/messaging/media/${encodeURIComponent(messageId)}/${index}`)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        blobRef.current = url;
        setBlobUrl(url);
      })
      .catch(() => setMode('failed'));
  }, [mode, autoLoad, messageId, index]);

  useEffect(
    () => () => {
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    },
    [],
  );

  const onError = () => setMode((m) => (m === 'direct' && canUseApi ? 'api' : 'failed'));
  const src = mode === 'direct' ? direct : blobUrl;
  return { src, mode, loading: mode === 'api' && !blobUrl, failed: mode === 'failed', onError };
}

interface AttachmentViewProps {
  messageId: string;
  index: number;
  attachment: MessageAttachment;
  isOutbound: boolean;
  onOpenImage: (url: string, name: string) => void;
}

const ExpiredNotice: React.FC<{ label: string; icon?: React.ReactNode }> = ({ label, icon }) => (
  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
    {icon ?? <AlertCircle size={16} className="shrink-0 text-amber-500" />}
    <span>{label} không còn tải được (link của kênh đã hết hạn)</span>
  </div>
);

const ImageAttachment: React.FC<AttachmentViewProps & { sticker?: boolean; large?: boolean }> = ({
  messageId,
  index,
  attachment,
  onOpenImage,
  sticker,
  large,
}) => {
  const { src, failed, loading, onError } = useMediaSource(messageId, index, attachment);
  const name = attachment.name || (sticker ? 'Nhãn dán' : 'Ảnh đính kèm');

  if (failed) {
    return sticker ? (
      <div className="inline-flex items-center gap-1.5 py-1 text-xs text-slate-400">
        <Smile size={16} /> <span>Nhãn dán</span>
      </div>
    ) : (
      <ExpiredNotice label="Hình ảnh" />
    );
  }

  if (sticker) {
    return (
      <img
        src={src || TRANSPARENT_PIXEL}
        alt={name}
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={onError}
        onClick={() => src && onOpenImage(src, name)}
        className={`${large ? 'h-32 w-32 md:h-36 md:w-36 drop-shadow-sm' : 'h-28 w-28'} cursor-pointer select-none object-contain transition-transform hover:scale-105`}
      />
    );
  }

  return (
    <div className="group relative max-w-[280px] overflow-hidden rounded-lg border border-black/10 bg-slate-100">
      {loading && (
        <div className="flex h-32 w-48 items-center justify-center text-slate-400">
          <Loader2 size={18} className="animate-spin" />
        </div>
      )}
      <img
        src={src || TRANSPARENT_PIXEL}
        alt={name}
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={onError}
        onClick={() => src && onOpenImage(src, name)}
        className={`${loading ? 'hidden' : ''} h-auto max-h-[240px] w-auto max-w-[280px] cursor-pointer rounded-lg object-cover transition-transform duration-200 group-hover:scale-[1.02]`}
      />
      {!loading && (
        <div
          onClick={() => src && onOpenImage(src, name)}
          className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/0 opacity-0 transition-colors group-hover:bg-black/20 group-hover:opacity-100"
        >
          <span className="flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium text-white">
            <ImageIcon size={12} /> Bấm để phóng to
          </span>
        </div>
      )}
    </div>
  );
};

const PlayableAttachment: React.FC<AttachmentViewProps & { kind: 'audio' | 'video' }> = ({
  messageId,
  index,
  attachment,
  isOutbound,
  kind,
}) => {
  const { src, failed, loading, onError } = useMediaSource(messageId, index, attachment);
  const label = kind === 'audio' ? 'Tin nhắn thoại' : 'Video';
  if (failed) return <ExpiredNotice label={label} icon={kind === 'audio' ? <Volume2 size={16} /> : <Video size={16} />} />;

  return (
    <div className={`flex flex-col gap-1 ${kind === 'video' ? 'max-w-[300px]' : 'min-w-[220px]'}`}>
      {loading ? (
        <div className={`flex items-center gap-2 text-xs ${isOutbound ? 'text-blue-100' : 'text-slate-500'}`}>
          <Loader2 size={14} className="animate-spin" /> Đang tải {label.toLowerCase()}…
        </div>
      ) : kind === 'audio' ? (
        <audio controls preload="metadata" src={src ?? undefined} onError={onError} className="h-9 w-full max-w-[260px]" />
      ) : (
        <video
          controls
          preload="metadata"
          src={src ?? undefined}
          poster={attachment.thumbnailUrl}
          onError={onError}
          className="max-h-[260px] w-full rounded-lg bg-black"
        />
      )}
      {attachment.duration && (
        <span className={`text-[11px] ${isOutbound ? 'text-blue-100' : 'text-slate-500'}`}>{attachment.duration}</span>
      )}
    </div>
  );
};

const FileAttachment: React.FC<AttachmentViewProps> = ({ messageId, index, attachment, isOutbound }) => {
  const [state, setState] = useState<'idle' | 'loading' | 'failed'>(attachment.expired && !attachment.storageKey ? 'failed' : 'idle');
  const name = attachment.name || 'Tệp đính kèm';

  const download = async () => {
    setState('loading');
    try {
      // Endpoint tự chọn nguồn (bản sao / link gốc / link mới) và kèm xác thực
      const blob = await apiClient.fetchBlob(`/messaging/media/${encodeURIComponent(messageId)}/${index}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setState('idle');
    } catch {
      setState('failed');
    }
  };

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl border p-2.5 text-xs font-medium ${
        isOutbound ? 'border-white/25 bg-white/15 text-white' : 'border-slate-200 bg-slate-50 text-slate-800'
      }`}
    >
      <div className="flex min-w-0 items-center gap-2.5 pr-2">
        <div className={`shrink-0 rounded-lg p-2 ${isOutbound ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'}`}>
          <FileText size={18} />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="max-w-[170px] truncate font-semibold" title={name}>
            {name}
          </span>
          <span className={`text-[11px] ${isOutbound ? 'text-blue-100' : state === 'failed' ? 'text-amber-600' : 'text-slate-500'}`}>
            {state === 'failed' ? 'Tệp đã hết hạn trên máy chủ của kênh' : attachment.size || 'Tài liệu'}
          </span>
        </div>
      </div>
      {state !== 'failed' && (
        <button
          type="button"
          onClick={download}
          disabled={state === 'loading'}
          className={`shrink-0 rounded-lg p-2 transition-colors ${
            isOutbound ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-slate-200/70 text-slate-700 hover:bg-slate-300'
          }`}
          title="Tải tệp xuống"
          aria-label={`Tải xuống ${name}`}
        >
          {state === 'loading' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
        </button>
      )}
    </div>
  );
};

export const MessageAttachmentView: React.FC<AttachmentViewProps & { standaloneSticker?: boolean }> = (props) => {
  switch (props.attachment.type) {
    case 'IMAGE':
      return <ImageAttachment {...props} />;
    case 'STICKER':
      return <ImageAttachment {...props} sticker large={props.standaloneSticker} />;
    case 'AUDIO':
      return <PlayableAttachment {...props} kind="audio" />;
    case 'VIDEO':
      return <PlayableAttachment {...props} kind="video" />;
    default:
      return <FileAttachment {...props} />;
  }
};
