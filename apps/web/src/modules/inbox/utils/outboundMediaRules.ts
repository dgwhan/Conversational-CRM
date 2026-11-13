import type { OutboundKind } from '../../../lib/api-client/outbound-media.js';

/**
 * Gợi ý phía giao diện về khả năng gửi tệp của từng kênh (máy chủ vẫn kiểm tra lại bằng nội dung tệp).
 * Đồng bộ với apps/api/src/modules/messaging/domain/media/outbound-media-policy.ts
 */
export type OutboundChannel = 'FACEBOOK' | 'ZALO_OA' | 'ZALO_PERSONAL';

const MB = 1024 * 1024;

interface ChannelCaps {
  label: string;
  kinds: Partial<Record<OutboundKind, { maxBytes: number; extensions?: string[] }>>;
}

export const CHANNEL_CAPS: Record<OutboundChannel, ChannelCaps> = {
  FACEBOOK: {
    label: 'Facebook Messenger',
    kinds: {
      IMAGE: { maxBytes: 25 * MB },
      FILE: { maxBytes: 25 * MB },
      AUDIO: { maxBytes: 25 * MB },
      VIDEO: { maxBytes: 25 * MB, extensions: ['mp4', 'mov', 'webm'] },
    },
  },
  ZALO_OA: {
    label: 'Zalo OA',
    kinds: {
      // Ảnh lớn được máy chủ nén xuống ≤ 1MB trước khi gửi
      IMAGE: { maxBytes: 25 * MB, extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'] },
      FILE: { maxBytes: 5 * MB, extensions: ['pdf', 'doc', 'docx'] },
    },
  },
  ZALO_PERSONAL: {
    label: 'Zalo cá nhân',
    kinds: {
      IMAGE: { maxBytes: 25 * MB },
      FILE: { maxBytes: 25 * MB },
      AUDIO: { maxBytes: 10 * MB },
      VIDEO: { maxBytes: 25 * MB, extensions: ['mp4', 'mov'] },
    },
  },
};

export function outboundChannelOf(channel: string): OutboundChannel {
  const c = String(channel || '').toUpperCase();
  if (c.includes('FACEBOOK') || c === 'FB') return 'FACEBOOK';
  if (c.includes('PERSONAL')) return 'ZALO_PERSONAL';
  return 'ZALO_OA';
}

const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'];
const AUDIO_EXT = ['mp3', 'm4a', 'aac', 'ogg', 'wav', 'webm'];
const VIDEO_EXT = ['mp4', 'mov'];
const FILE_EXT = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'txt', 'csv'];

const extOf = (name: string) => (name.includes('.') ? name.split('.').pop()!.toLowerCase() : '');

export function guessKind(file: File): OutboundKind | null {
  const ext = extOf(file.name);
  if (file.type.startsWith('image/') || IMAGE_EXT.includes(ext)) return 'IMAGE';
  if (file.type.startsWith('audio/') || (AUDIO_EXT.includes(ext) && ext !== 'webm')) return 'AUDIO';
  if (file.type.startsWith('video/') || VIDEO_EXT.includes(ext)) return 'VIDEO';
  if (FILE_EXT.includes(ext)) return 'FILE';
  return null;
}

/** Thuộc tính accept cho ô chọn tệp theo kênh */
export function acceptFor(channel: OutboundChannel, onlyImages = false): string {
  if (onlyImages) return 'image/*,.heic';
  const caps = CHANNEL_CAPS[channel].kinds;
  const parts: string[] = [];
  if (caps.IMAGE) parts.push('image/*', '.heic');
  if (caps.FILE) parts.push(...(caps.FILE.extensions ?? FILE_EXT).map((e) => `.${e}`));
  if (caps.AUDIO) parts.push('audio/*');
  if (caps.VIDEO) parts.push(...(caps.VIDEO.extensions ?? VIDEO_EXT).map((e) => `.${e}`));
  return parts.join(',');
}

/** Trả về lý do không gửi được (tiếng Việt) hoặc null nếu hợp lệ */
export function validateForChannel(channel: OutboundChannel, kind: OutboundKind | null, fileName: string, sizeBytes: number): string | null {
  const caps = CHANNEL_CAPS[channel];
  if (!kind) return `"${fileName}": định dạng không được hỗ trợ.`;
  const rule = caps.kinds[kind];
  if (!rule) {
    const what = kind === 'AUDIO' ? 'tin nhắn thoại' : kind === 'VIDEO' ? 'video' : kind === 'IMAGE' ? 'hình ảnh' : 'tệp';
    return `${caps.label} không hỗ trợ gửi ${what}.`;
  }
  const ext = extOf(fileName);
  if (rule.extensions && ext && !rule.extensions.includes(ext)) {
    return `${caps.label} chỉ nhận ${rule.extensions.join(', ')} (tệp "${fileName}").`;
  }
  if (sizeBytes > rule.maxBytes) {
    return `"${fileName}" lớn hơn ${Math.round(rule.maxBytes / MB)}MB — giới hạn của ${caps.label}.`;
  }
  return null;
}

export function canSendVoice(channel: OutboundChannel): boolean {
  return Boolean(CHANNEL_CAPS[channel].kinds.AUDIO);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < MB) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / MB).toFixed(1)} MB`;
}
