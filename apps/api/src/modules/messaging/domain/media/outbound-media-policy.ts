/**
 * Chính sách tệp gửi đi (chiều CRM → khách): loại tệp được phép, giới hạn dung lượng theo kênh,
 * và nhận dạng định dạng thật bằng nội dung tệp (không tin đuôi tệp / Content-Type của trình duyệt).
 */

export type OutboundKind = 'IMAGE' | 'FILE' | 'AUDIO' | 'VIDEO';
/** Kênh gửi đi: Zalo OA và Zalo cá nhân khác nhau về khả năng */
export type OutboundChannel = 'FACEBOOK' | 'ZALO_OA' | 'ZALO_PERSONAL';

export interface DetectedFile {
    kind: OutboundKind;
    mimeType: string;
    extension: string;
}

const MB = 1024 * 1024;

/** Giới hạn khi tải lên CRM (trước khi biết kênh, VD: thư viện tài liệu) */
export const UPLOAD_MAX_BYTES = 25 * MB;

interface KindRule {
    maxBytes: number;
    /** null = mọi định dạng đã nhận dạng được của loại này */
    mimeTypes: string[] | null;
}

/**
 * Khả năng từng kênh (theo tài liệu nền tảng; ảnh được CRM chuẩn hóa sang JPEG trước khi gửi):
 * - Facebook Send API: ảnh / audio / video / file, tối đa 25MB.
 * - Zalo OA: ảnh jpg/png ≤ 1MB, gif ≤ 5MB, tệp pdf/doc/docx ≤ 5MB; không hỗ trợ voice / video.
 * - Zalo cá nhân (zca-js): ảnh, tệp, voice (gửi dạng tin thoại), video gửi như tệp.
 */
export const OUTBOUND_RULES: Record<OutboundChannel, Partial<Record<OutboundKind, KindRule>>> = {
    FACEBOOK: {
        IMAGE: { maxBytes: 8 * MB, mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] },
        FILE: { maxBytes: 25 * MB, mimeTypes: null },
        AUDIO: { maxBytes: 25 * MB, mimeTypes: null },
        VIDEO: { maxBytes: 25 * MB, mimeTypes: ['video/mp4', 'video/quicktime', 'video/webm'] },
    },
    ZALO_OA: {
        IMAGE: { maxBytes: 5 * MB, mimeTypes: ['image/jpeg', 'image/png', 'image/gif'] },
        FILE: {
            maxBytes: 5 * MB,
            mimeTypes: [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ],
        },
    },
    ZALO_PERSONAL: {
        IMAGE: { maxBytes: 20 * MB, mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] },
        FILE: { maxBytes: 25 * MB, mimeTypes: null },
        AUDIO: { maxBytes: 10 * MB, mimeTypes: null },
        VIDEO: { maxBytes: 25 * MB, mimeTypes: ['video/mp4', 'video/quicktime'] },
    },
};

/** Zalo OA chỉ nhận ảnh jpg/png ≤ 1MB (gif ≤ 5MB) — ảnh lớn hơn được nén lại lúc gửi */
export const ZALO_OA_IMAGE_MAX_BYTES = 1 * MB;

const OFFICE_ZIP: Record<string, { mime: string; ext: string }> = {
    docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: 'docx' },
    xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: 'xlsx' },
    pptx: { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', ext: 'pptx' },
};
const OLE: Record<string, { mime: string; ext: string }> = {
    doc: { mime: 'application/msword', ext: 'doc' },
    xls: { mime: 'application/vnd.ms-excel', ext: 'xls' },
    ppt: { mime: 'application/vnd.ms-powerpoint', ext: 'ppt' },
};

const startsWith = (buf: Buffer, bytes: number[], offset = 0) => bytes.every((b, i) => buf[offset + i] === b);
const ascii = (buf: Buffer, start: number, end: number) => buf.subarray(start, end).toString('latin1');
const extOf = (name: string) => (name.includes('.') ? name.split('.').pop()!.toLowerCase() : '');

/**
 * Nhận dạng định dạng theo chữ ký đầu tệp. Trả về null với định dạng không cho phép
 * (HTML, SVG, script, tệp thực thi…) để chặn tải lên nội dung có thể gây XSS / mã độc.
 */
export function detectFileType(buf: Buffer, fileName: string): DetectedFile | null {
    if (buf.length < 4) return null;
    const ext = extOf(fileName);

    if (startsWith(buf, [0xff, 0xd8, 0xff])) return { kind: 'IMAGE', mimeType: 'image/jpeg', extension: 'jpg' };
    if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47])) return { kind: 'IMAGE', mimeType: 'image/png', extension: 'png' };
    if (ascii(buf, 0, 4) === 'GIF8') return { kind: 'IMAGE', mimeType: 'image/gif', extension: 'gif' };
    if (ascii(buf, 0, 4) === 'RIFF' && ascii(buf, 8, 12) === 'WEBP') return { kind: 'IMAGE', mimeType: 'image/webp', extension: 'webp' };
    if (ascii(buf, 4, 8) === 'ftyp') {
        const brand = ascii(buf, 8, 12);
        if (/heic|heix|mif1|heis/.test(brand)) return { kind: 'IMAGE', mimeType: 'image/heic', extension: 'heic' };
        if (/M4A |M4B /.test(brand)) return { kind: 'AUDIO', mimeType: 'audio/mp4', extension: 'm4a' };
        if (brand === 'qt  ') return { kind: 'VIDEO', mimeType: 'video/quicktime', extension: 'mov' };
        // Ghi âm trên trình duyệt (MediaRecorder audio/mp4) cũng có hộp ftyp: dựa vào đuôi tệp để phân biệt
        if (ext === 'm4a' || ext === 'aac') return { kind: 'AUDIO', mimeType: 'audio/mp4', extension: 'm4a' };
        return { kind: 'VIDEO', mimeType: 'video/mp4', extension: 'mp4' };
    }
    if (ascii(buf, 0, 3) === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0 && ext !== 'aac'))
        return { kind: 'AUDIO', mimeType: 'audio/mpeg', extension: 'mp3' };
    if (buf[0] === 0xff && (buf[1] & 0xf6) === 0xf0) return { kind: 'AUDIO', mimeType: 'audio/aac', extension: 'aac' };
    if (ascii(buf, 0, 4) === 'OggS') return { kind: 'AUDIO', mimeType: 'audio/ogg', extension: 'ogg' };
    if (ascii(buf, 0, 4) === 'RIFF' && ascii(buf, 8, 12) === 'WAVE') return { kind: 'AUDIO', mimeType: 'audio/wav', extension: 'wav' };
    if (startsWith(buf, [0x1a, 0x45, 0xdf, 0xa3])) {
        // WebM: ghi âm từ trình duyệt (audio) hoặc video
        return ext === 'webm' && /audio|voice|ghi-am/i.test(fileName)
            ? { kind: 'AUDIO', mimeType: 'audio/webm', extension: 'webm' }
            : { kind: 'VIDEO', mimeType: 'video/webm', extension: 'webm' };
    }
    if (ascii(buf, 0, 5) === '%PDF-') return { kind: 'FILE', mimeType: 'application/pdf', extension: 'pdf' };
    if (startsWith(buf, [0x50, 0x4b, 0x03, 0x04])) {
        if (OFFICE_ZIP[ext]) return { kind: 'FILE', mimeType: OFFICE_ZIP[ext].mime, extension: OFFICE_ZIP[ext].ext };
        return { kind: 'FILE', mimeType: 'application/zip', extension: 'zip' };
    }
    if (startsWith(buf, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
        const o = OLE[ext] ?? OLE.doc;
        return { kind: 'FILE', mimeType: o.mime, extension: o.ext };
    }
    // Văn bản thuần (txt / csv): không có byte 0, không phải HTML/SVG/script
    if ((ext === 'txt' || ext === 'csv') && !buf.subarray(0, 4096).includes(0)) {
        const head = buf.subarray(0, 1024).toString('utf8').trimStart().toLowerCase();
        if (/^<(!doctype|html|svg|script|\?xml)/.test(head)) return null;
        return { kind: 'FILE', mimeType: ext === 'csv' ? 'text/csv' : 'text/plain', extension: ext };
    }
    return null;
}

export class OutboundMediaRuleError extends Error {}

/** Kiểm tra tệp có gửi được qua kênh hay không; ném lỗi kèm lý do tiếng Việt. */
export function assertSendable(channel: OutboundChannel, kind: OutboundKind, mimeType: string, sizeBytes: number): void {
    const rule = OUTBOUND_RULES[channel][kind];
    const label = channelLabel(channel);
    if (!rule) {
        const what = kind === 'AUDIO' ? 'tin nhắn thoại' : kind === 'VIDEO' ? 'video' : kind === 'IMAGE' ? 'hình ảnh' : 'tệp';
        throw new OutboundMediaRuleError(`${label} không hỗ trợ gửi ${what}.`);
    }
    if (rule.mimeTypes && !rule.mimeTypes.includes(mimeType)) {
        throw new OutboundMediaRuleError(`${label} không nhận định dạng ${mimeType}.`);
    }
    if (sizeBytes > rule.maxBytes) {
        throw new OutboundMediaRuleError(
            `${label} chỉ nhận tệp ${kind === 'IMAGE' ? 'ảnh ' : ''}tối đa ${Math.round(rule.maxBytes / MB)}MB (tệp hiện tại ${(sizeBytes / MB).toFixed(1)}MB).`,
        );
    }
}

export function channelLabel(channel: OutboundChannel): string {
    return channel === 'FACEBOOK' ? 'Facebook Messenger' : channel === 'ZALO_OA' ? 'Zalo OA' : 'Zalo cá nhân';
}

/** Đảm bảo tên tệp an toàn và luôn có đuôi đúng định dạng thật */
export function safeFileName(original: string, extension: string): string {
    const base = (original || 'tep')
        .replace(/\.[^.]*$/, '')
        .normalize('NFC')
        .replace(/[\\/:*?"<>|\r\n\t]+/g, '_')
        .trim()
        .slice(0, 120);
    return `${base || 'tep'}.${extension}`;
}
