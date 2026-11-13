import React, { useRef, useState } from 'react';
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  Mic,
  Smile,
  AtSign,
  FolderOpen,
  X,
  FileText,
  Volume2,
  Video,
  AlertCircle,
  Loader2,
  Square,
  Trash2,
} from 'lucide-react';
import type { ConversationItem, QuickReplyItem } from '../../../types.js';
import { Button } from '../../../../../components/ui/Button.js';
import { useTranslation } from '../../../../../i18n/index.js';
import type { PendingAttachment } from '../hooks/useOutboundAttachments.js';
import { CHANNEL_CAPS, acceptFor, formatBytes, type OutboundChannel } from '../../../utils/outboundMediaRules.js';
import { MAX_VOICE_SECONDS } from '../hooks/useVoiceRecorder.js';

export interface ChatComposerProps {
  conversation: ConversationItem;
  inputText: string;
  isSending: boolean;
  isWithin24Hours: boolean;
  quickReplies?: QuickReplyItem[];
  outboundChannel: OutboundChannel;
  attachments: {
    items: PendingAttachment[];
    addFiles: (files: Iterable<File>) => void;
    remove: (localId: string) => void;
    isUploading: boolean;
    hasErrors: boolean;
  };
  voice: { supported: boolean; isRecording: boolean; seconds: number; start: () => void; stop: () => void; cancel: () => void };
  onOpenLibrary: () => void;
  onInputChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  onInsertEmoji: () => void;
  onQuickReplySelect?: (content: string) => void;
  onOpenQuickReplySettings?: () => void;
}

const formatSeconds = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const PendingChip: React.FC<{ item: PendingAttachment; onRemove: () => void }> = ({ item, onRemove }) => {
  const icon =
    item.kind === 'AUDIO' ? <Volume2 size={16} /> : item.kind === 'VIDEO' ? <Video size={16} /> : <FileText size={16} />;
  return (
    <div
      className={`relative flex w-[150px] shrink-0 items-center gap-2 rounded-lg border p-1.5 pr-6 text-xs ${
        item.status === 'error' ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'
      }`}
      title={item.error ?? item.fileName}
    >
      {item.kind === 'IMAGE' && item.previewUrl ? (
        <img src={item.previewUrl} alt="" className="h-9 w-9 shrink-0 rounded object-cover" />
      ) : (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-white text-blue-600">{icon}</span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-slate-700">{item.fileName}</span>
        <span className={`block truncate text-[10px] ${item.status === 'error' ? 'text-red-600' : 'text-slate-500'}`}>
          {item.status === 'uploading'
            ? `Đang tải ${item.progress}%`
            : item.status === 'error'
              ? item.error ?? 'Lỗi tải lên'
              : item.fromLibrary
                ? 'Thư viện'
                : formatBytes(item.sizeBytes)}
        </span>
      </span>
      {item.status === 'uploading' && (
        <span className="absolute bottom-0 left-0 h-0.5 rounded bg-blue-500 transition-all" style={{ width: `${item.progress}%` }} />
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1 top-1 rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
        aria-label={`Bỏ ${item.fileName}`}
      >
        <X size={12} />
      </button>
    </div>
  );
};

export const ChatComposer: React.FC<ChatComposerProps> = ({
  conversation,
  inputText,
  isSending,
  isWithin24Hours,
  quickReplies,
  outboundChannel,
  attachments,
  voice,
  onOpenLibrary,
  onInputChange,
  onKeyDown,
  onPaste,
  onSend,
  onInsertEmoji,
  onQuickReplySelect,
  onOpenQuickReplySettings,
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [dragDepth, setDragDepth] = useState(0);
  const blockedBy24h = conversation.channel === 'FACEBOOK' && !isWithin24Hours;
  const caps = CHANNEL_CAPS[outboundChannel];

  const pickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) attachments.addFiles(e.target.files);
    e.target.value = '';
  };

  const canSend =
    !blockedBy24h &&
    !isSending &&
    !attachments.isUploading &&
    !attachments.hasErrors &&
    (inputText.trim().length > 0 || attachments.items.length > 0);

  return (
    <div
      className="relative p-3 bg-white border-t border-slate-200/80 flex flex-col gap-2 shrink-0"
      onDragEnter={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        setDragDepth((d) => d + 1);
      }}
      onDragOver={(e) => e.dataTransfer.types.includes('Files') && e.preventDefault()}
      onDragLeave={() => setDragDepth((d) => Math.max(0, d - 1))}
      onDrop={(e) => {
        if (!e.dataTransfer.files?.length) return;
        e.preventDefault();
        setDragDepth(0);
        attachments.addFiles(e.dataTransfer.files);
      }}
    >
      {dragDepth > 0 && (
        <div className="pointer-events-none absolute inset-1 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-blue-400 bg-blue-50/90 text-sm font-semibold text-blue-700">
          Thả tệp để đính kèm vào tin gửi {caps.label}
        </div>
      )}

      {/* 1. Quick replies */}
      {quickReplies && quickReplies.length > 0 && onQuickReplySelect && (
        <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 overflow-x-auto no-scrollbar scrollbar-none select-none">
          <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap shrink-0">Mẫu phản hồi:</span>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none">
            {quickReplies.map((item) => (
              <button
                key={item.id}
                type="button"
                className="px-2 py-0.5 text-xs font-normal text-slate-600 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/70 rounded transition-colors cursor-pointer truncate max-w-[180px] whitespace-nowrap shrink-0"
                onClick={() => onQuickReplySelect(item.content)}
                title={item.content}
              >
                {item.label}
              </button>
            ))}
          </div>
          {onOpenQuickReplySettings && (
            <button
              type="button"
              className="text-[11px] font-medium text-slate-400 hover:text-slate-700 transition-colors cursor-pointer whitespace-nowrap shrink-0 ml-auto"
              onClick={onOpenQuickReplySettings}
              title="Quản lý danh sách tin nhắn mẫu"
            >
              Quản lý
            </button>
          )}
        </div>
      )}

      {/* 2. Tệp chờ gửi */}
      {attachments.items.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Tệp đính kèm chờ gửi">
          {attachments.items.map((item) => (
            <PendingChip key={item.localId} item={item} onRemove={() => attachments.remove(item.localId)} />
          ))}
        </div>
      )}

      {/* 3. Khung soạn thảo / đang ghi âm */}
      {voice.isRecording ? (
        <div className="flex min-h-[44px] items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 text-sm text-red-700">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
          <span className="font-mono tabular-nums">{formatSeconds(voice.seconds)}</span>
          <span className="text-xs text-red-500">/ {formatSeconds(MAX_VOICE_SECONDS)}</span>
          <div className="ml-auto flex items-center gap-1">
            <button type="button" onClick={voice.cancel} className="rounded p-1.5 hover:bg-red-100" title="Hủy ghi âm" aria-label="Hủy ghi âm">
              <Trash2 size={15} />
            </button>
            <button
              type="button"
              onClick={voice.stop}
              className="flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700"
            >
              <Square size={12} /> Dừng & đính kèm
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full">
          <textarea
            className="w-full min-h-[44px] max-h-[120px] resize-none border border-slate-200/80 rounded-lg px-3 py-2 text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 bg-white hover:border-slate-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
            placeholder={
              blockedBy24h
                ? 'Đã quá 24h Meta. Cần gắn Message Tag để phản hồi...'
                : `Nhập tin nhắn phản hồi cho ${conversation.customer.fullName}... (dán ảnh bằng Ctrl+V)`
            }
            value={inputText}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            rows={1}
          />
        </div>
      )}

      {/* 4. Toolbar & Nút gửi */}
      <div className="flex items-center justify-between select-none">
        <div className="flex items-center gap-0.5 text-slate-400">
          <input ref={fileInputRef} type="file" multiple hidden accept={acceptFor(outboundChannel)} onChange={pickFiles} />
          <input ref={imageInputRef} type="file" multiple hidden accept={acceptFor(outboundChannel, true)} onChange={pickFiles} />
          <button
            type="button"
            className="p-1.5 rounded hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
            title={`${t('inbox.chatInput.attachFile')} (${caps.label})`}
            onClick={() => fileInputRef.current?.click()}
            disabled={voice.isRecording}
          >
            <Paperclip size={16} />
          </button>
          <button
            type="button"
            className="p-1.5 rounded hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
            title={t('inbox.chatInput.attachImage')}
            onClick={() => imageInputRef.current?.click()}
            disabled={voice.isRecording}
          >
            <ImageIcon size={16} />
          </button>
          <button
            type="button"
            className="p-1.5 rounded hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
            title="Chèn tài liệu từ thư viện (brochure, bảng học phí…)"
            onClick={onOpenLibrary}
            disabled={voice.isRecording}
          >
            <FolderOpen size={16} />
          </button>
          <button
            type="button"
            className="p-1.5 rounded hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
            title={t('inbox.chatInput.insertEmoji')}
            onClick={onInsertEmoji}
          >
            <Smile size={16} />
          </button>
          <button
            type="button"
            className="p-1.5 rounded hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
            title="Chèn ký hiệu @"
            onClick={() => onInputChange(inputText ? `${inputText} @` : '@')}
          >
            <AtSign size={16} />
          </button>
          {voice.supported && (
            <button
              type="button"
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                voice.isRecording ? 'text-red-500 bg-red-50' : 'hover:bg-slate-100 hover:text-slate-700'
              }`}
              title={voice.isRecording ? 'Đang ghi âm' : t('inbox.chatInput.voiceMessage')}
              onClick={voice.isRecording ? voice.stop : voice.start}
            >
              <Mic size={16} />
            </button>
          )}
          {attachments.hasErrors && (
            <span className="ml-1 inline-flex items-center gap-1 text-[11px] text-red-600">
              <AlertCircle size={12} /> Có tệp lỗi
            </span>
          )}
        </div>

        <Button
          type="button"
          variant="primary"
          size="sm"
          icon={isSending || attachments.isUploading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          onClick={onSend}
          disabled={!canSend}
        >
          {attachments.isUploading ? 'Đang tải tệp…' : t('Send')}
        </Button>
      </div>
    </div>
  );
};
