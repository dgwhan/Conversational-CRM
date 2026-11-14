import type { InboundAttachmentType, NormalizedAttachment } from '../inbound-event.js';

/**
 * Chuẩn hóa tệp đính kèm của mọi kênh về cùng một dạng `NormalizedAttachment`.
 *
 * Nguyên tắc:
 * - Không lưu nhị phân vào DB: chỉ lưu metadata + URL gốc (+ `storageKey` nếu đã lưu sang object storage).
 * - `id` ổn định theo (mã tin, thứ tự) để webhook gửi lại không sinh id khác.
 * - Sticker không bao giờ lưu trữ: luôn dựng lại được từ `stickerId`.
 */

type AnyRecord = Record<string, any>;

const asRecord = (v: unknown): AnyRecord => (v && typeof v === 'object' && !Array.isArray(v) ? (v as AnyRecord) : {});
const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' ? String(v) : undefined);

/** zca-js để `params` dạng chuỗi JSON */
function parseParams(v: unknown): AnyRecord {
    if (typeof v === 'string') {
        try {
            return asRecord(JSON.parse(v));
        } catch {
            return {};
        }
    }
    return asRecord(v);
}

/** Thời lượng (giây hoặc ms) → "m:ss" */
export function formatDuration(raw: unknown): string | undefined {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return undefined;
    const seconds = Math.round(n > 1000 ? n / 1000 : n);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Số byte → "1.2 MB" */
export function formatBytes(raw: unknown): string | undefined {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return undefined;
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const MIME_BY_EXT: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
    mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', amr: 'audio/amr', ogg: 'audio/ogg', wav: 'audio/wav',
    mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
    pdf: 'application/pdf', doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    zip: 'application/zip', txt: 'text/plain',
};

export function guessMimeType(nameOrUrl?: string): string | undefined {
    if (!nameOrUrl) return undefined;
    const clean = nameOrUrl.split(/[?#]/)[0];
    const ext = clean.includes('.') ? clean.split('.').pop()!.toLowerCase() : '';
    return MIME_BY_EXT[ext];
}

export function extensionForMime(mime?: string, fallbackName?: string): string {
    const fromName = fallbackName?.split(/[?#]/)[0].split('.').pop()?.toLowerCase();
    if (fromName && fromName.length <= 5 && MIME_BY_EXT[fromName]) return fromName;
    const entry = Object.entries(MIME_BY_EXT).find(([, m]) => m === mime);
    return entry?.[0] ?? 'bin';
}

function mapType(raw: string): InboundAttachmentType {
    const t = raw.toLowerCase();
    if (t.includes('sticker')) return 'STICKER';
    if (t.includes('audio') || t.includes('voice')) return 'AUDIO';
    if (t.includes('video')) return 'VIDEO';
    if (t.includes('image') || t.includes('photo') || t.includes('gif')) return 'IMAGE';
    return 'FILE';
}

function make(
    messageId: string,
    idx: number,
    type: InboundAttachmentType,
    fields: Partial<NormalizedAttachment>,
): NormalizedAttachment {
    const url = fields.url ?? '';
    return {
        id: `${messageId || 'att'}_${idx}`,
        type,
        url,
        name: fields.name ?? defaultName(type),
        ...(fields.size ? { size: fields.size } : {}),
        ...(fields.duration ? { duration: fields.duration } : {}),
        ...(fields.stickerId !== undefined ? { stickerId: fields.stickerId } : {}),
        ...(fields.thumbnailUrl ? { thumbnailUrl: fields.thumbnailUrl } : {}),
        mimeType: fields.mimeType ?? guessMimeType(fields.name) ?? guessMimeType(url),
    };
}

function defaultName(type: InboundAttachmentType): string {
    switch (type) {
        case 'IMAGE': return 'Hình ảnh';
        case 'AUDIO': return 'Tin nhắn thoại';
        case 'VIDEO': return 'Video';
        case 'STICKER': return 'Nhãn dán';
        default: return 'Tệp đính kèm';
    }
}

// ───────────────────────────── Facebook Messenger ─────────────────────────────

/** `message.attachments` của webhook Messenger */
export function normalizeFacebookAttachments(messageId: string, attachments: unknown): NormalizedAttachment[] {
    if (!Array.isArray(attachments)) return [];
    return attachments
        .map((raw, idx) => {
            const att = asRecord(raw);
            const payload = asRecord(att.payload);
            const stickerId = str(payload.sticker_id);
            const type: InboundAttachmentType = stickerId ? 'STICKER' : mapType(str(att.type) ?? 'file');
            if (type === 'FILE' && (att.type === 'fallback' || att.type === 'template')) return null; // link preview / template
            let url = str(payload.url) ?? str(att.url) ?? '';
            if (!url && stickerId) url = `https://lookaside.facebook.com/stickers/${stickerId}.png`;
            if (!url) return null;
            return make(messageId, idx, type, {
                url,
                name: str(payload.name) ?? str(payload.title) ?? (stickerId ? 'Nhãn dán Messenger' : undefined),
                size: formatBytes(payload.size),
                stickerId,
            });
        })
        .filter((a): a is NormalizedAttachment => a !== null);
}

/**
 * Attachment trả về từ Graph API `/{message-id}?fields=attachments` (dùng để lấy lại URL mới khi URL cũ hết hạn).
 * Thứ tự giữ nguyên như webhook.
 */
export function extractGraphAttachmentUrl(raw: unknown): string | undefined {
    const att = asRecord(raw);
    return (
        str(asRecord(att.image_data).url) ??
        str(asRecord(att.video_data).url) ??
        str(att.file_url) ??
        str(asRecord(att.payload).url)
    );
}

// ───────────────────────────── Zalo OA (webhook) ─────────────────────────────

/** Loại đính kèm suy ra từ tên sự kiện Zalo OA: user_send_image, oa_send_audio, user_send_gif… */
function zaloEventType(eventName: string): string | undefined {
    const m = eventName.match(/^(?:user|oa)_send_(image|gif|audio|voice|video|sticker|file|link|location|business_card)$/);
    return m?.[1];
}

export function normalizeZaloOaAttachments(messageId: string, eventName: string, message: unknown): NormalizedAttachment[] {
    const msg = asRecord(message);
    const eventType = zaloEventType(eventName);
    const list = Array.isArray(msg.attachments) ? msg.attachments : [];
    const result: NormalizedAttachment[] = [];

    list.forEach((raw, idx) => {
        const att = asRecord(raw);
        const payload = asRecord(att.payload);
        const rawType = str(att.type) ?? eventType ?? 'file';
        if (rawType === 'link' || rawType === 'location' || rawType === 'business_card') return; // không phải media
        const type = mapType(rawType);
        const stickerId = type === 'STICKER' ? str(payload.id) ?? str(att.sticker_id) : undefined;
        const url =
            str(payload.url) ??
            str(att.url) ??
            (type === 'STICKER' ? str(payload.thumbnail) ?? (stickerId ? `https://stickers.zalo.me/${stickerId}` : undefined) : undefined) ??
            '';
        if (!url && !stickerId) return;
        result.push(
            make(messageId, idx, type, {
                url,
                name: str(payload.name) ?? str(att.name),
                size: formatBytes(payload.size) ?? str(payload.size),
                duration: formatDuration(payload.duration),
                thumbnailUrl: type === 'STICKER' ? undefined : str(payload.thumbnail),
                stickerId,
                mimeType: str(payload.type) ? guessMimeType(`x.${str(payload.type)}`) : undefined,
            }),
        );
    });

    // Một số sự kiện không bọc trong attachments
    if (result.length === 0 && eventType && !['link', 'location', 'business_card'].includes(eventType)) {
        const type = mapType(eventType);
        const stickerId = type === 'STICKER' ? str(msg.sticker_id) ?? str(msg.id) : undefined;
        const url = str(msg.url) ?? (stickerId ? `https://stickers.zalo.me/${stickerId}` : undefined);
        if (url) result.push(make(messageId, 0, type, { url, name: str(msg.name), stickerId }));
    }
    return result;
}

// ───────────────────────────── Zalo cá nhân (zca-js) ─────────────────────────────

/**
 * Tin zca-js: `msgType` (chat.photo, chat.voice, chat.video.msg, chat.sticker, share.file, chat.gif…)
 * và `content` là object { href, thumb, title, params(JSON) } hoặc { id, catId } với sticker.
 */
export function normalizeZaloPersonalAttachments(messageId: string, msgData: unknown): NormalizedAttachment[] {
    const data = asRecord(msgData);
    const msgType = (str(data.msgType) ?? '').toLowerCase();
    const content = asRecord(data.content);
    if (typeof data.content === 'string' || Object.keys(content).length === 0) return [];
    const params = parseParams(content.params);

    if (msgType.includes('sticker')) {
        const stickerId = str(content.id);
        if (!stickerId) return [];
        return [make(messageId, 0, 'STICKER', { url: `https://stickers.zalo.me/${stickerId}`, stickerId })];
    }

    const href = str(content.href) ?? str(content.hdUrl) ?? str(content.normalUrl);
    if (!href) return [];

    let type: InboundAttachmentType | null = null;
    if (msgType.includes('photo') || msgType.includes('gif') || msgType === 'chat.image') type = 'IMAGE';
    else if (msgType.includes('voice') || msgType.includes('audio')) type = 'AUDIO';
    else if (msgType.includes('video')) type = 'VIDEO';
    else if (msgType.includes('file') || msgType === 'share.file') type = 'FILE';
    if (!type) return []; // link / recommend / location: không phải media

    // Ảnh HD nếu có
    const url = type === 'IMAGE' ? str(params.hd) ?? href : href;
    const name = type === 'FILE' ? str(content.title) : undefined;
    return [
        make(messageId, 0, type, {
            url,
            name,
            size: formatBytes(params.fileSize),
            duration: formatDuration(params.duration),
            thumbnailUrl: str(content.thumb),
            mimeType: str(params.fileExt) ? guessMimeType(`x.${str(params.fileExt)}`) : undefined,
        }),
    ];
}

// ───────────────────────────── Nội dung tóm tắt ─────────────────────────────

/** Nội dung hiển thị khi tin chỉ có đính kèm (dùng cho snippet hội thoại và cột content). */
export function summarizeAttachments(attachments: NormalizedAttachment[]): string | null {
    if (attachments.length === 0) return null;
    const first = attachments[0];
    const many = attachments.length > 1 ? ` (+${attachments.length - 1})` : '';
    switch (first.type) {
        case 'STICKER': return '[Nhãn dán]';
        case 'IMAGE': return `[Hình ảnh]${many}`;
        case 'AUDIO': return '[Tin nhắn thoại]';
        case 'VIDEO': return '[Video]';
        default: return first.name && first.name !== 'Tệp đính kèm' ? `[Tệp: ${first.name}]` : '[Tệp đính kèm]';
    }
}

/**
 * Suy ra tệp đính kèm từ payload gốc đã lưu (dùng khi sự kiện không mang sẵn `attachments`,
 * hoặc khi backfill dữ liệu cũ). Tự nhận dạng Facebook / Zalo OA / Zalo cá nhân.
 */
export function attachmentsFromRawPayload(externalMessageId: string, rawPayload: unknown): NormalizedAttachment[] {
    const raw = asRecord(rawPayload);
    // Adapter đã chuẩn hóa sẵn và lưu kèm trong payload
    if (Array.isArray(raw.attachments) && raw.attachments.every((a: AnyRecord) => a && typeof a.type === 'string' && a.type === a.type.toUpperCase() && 'url' in a)) {
        return raw.attachments as NormalizedAttachment[];
    }
    if (Array.isArray(asRecord(raw.message).attachments) && !raw.event_name) {
        return normalizeFacebookAttachments(externalMessageId, asRecord(raw.message).attachments);
    }
    if (typeof raw.event_name === 'string') {
        return normalizeZaloOaAttachments(externalMessageId, raw.event_name, raw.message ?? raw);
    }
    if (typeof raw.msgType === 'string') {
        return normalizeZaloPersonalAttachments(externalMessageId, raw);
    }
    // Graph API (đồng bộ lịch sử Facebook): attachments.data[]
    const graphList = asRecord(raw.attachments).data;
    if (Array.isArray(graphList)) {
        return graphList
            .map((a, idx) => {
                const att = asRecord(a);
                const url = extractGraphAttachmentUrl(att);
                if (!url) return null;
                const mime = str(att.mime_type);
                const type: InboundAttachmentType = att.image_data ? 'IMAGE' : att.video_data ? 'VIDEO' : mime?.startsWith('audio/') ? 'AUDIO' : mime?.startsWith('image/') ? 'IMAGE' : 'FILE';
                return make(externalMessageId, idx, type, { url, name: str(att.name), size: formatBytes(att.size), mimeType: mime });
            })
            .filter((a): a is NormalizedAttachment => a !== null);
    }
    return [];
}

/** Đọc lại mảng attachments đã lưu trong cột JSON (an toàn với dữ liệu cũ). */
export function readStoredAttachments(raw: unknown): NormalizedAttachment[] {
    return Array.isArray(raw) ? (raw.filter((a) => a && typeof a === 'object') as NormalizedAttachment[]) : [];
}
