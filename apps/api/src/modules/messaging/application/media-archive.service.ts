import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Readable } from 'node:stream';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import { TokenEncryptionService } from '../../channel-connection/infrastructure/token-encryption.service.js';
import { SafeFetchError, createSizeLimiter, safeGet } from '../../../common/security/safe-fetch.js';
import { Channel } from '../domain/channel.js';
import type { InboundAttachmentType, NormalizedAttachment } from '../domain/inbound-event.js';
import {
    extensionForMime,
    extractGraphAttachmentUrl,
    guessMimeType,
    readStoredAttachments,
} from '../domain/media/attachment-normalizer.js';
import { MEDIA_STORAGE, type MediaStorage } from '../infrastructure/media-storage/media-storage.js';
import { optimizeImage } from '../infrastructure/media-storage/image-optimizer.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CLEANUP_BATCH = 500;

export interface MediaPolicy {
    /** Kênh được lưu bản sao (mặc định ZALO: link CDN Zalo hết hạn và không lấy lại được) */
    archiveChannels: Channel[];
    /** Loại được lưu (mặc định IMAGE, AUDIO; video / file lớn chỉ giữ link gốc) */
    archiveTypes: InboundAttachmentType[];
    /** Dung lượng tối đa mỗi tệp được lưu */
    maxArchiveBytes: number;
    /** Dung lượng tối đa mỗi tệp được phát qua API */
    maxStreamBytes: number;
    /** Số ngày giữ bản sao trước khi tự xóa */
    retentionDays: number;
    /** Nén ảnh sang WebP trước khi lưu bản sao */
    compressImages: boolean;
    /** Cạnh dài tối đa của ảnh lưu trữ (px) */
    imageMaxDimension: number;
    /** Chất lượng WebP 1–100 */
    imageQuality: number;
    allowedHostSuffixes?: string[];
}

export function mediaPolicyFromEnv(env: Record<string, string | undefined> = process.env): MediaPolicy {
    const list = (v: string | undefined, fallback: string) =>
        (v ?? fallback)
            .split(',')
            .map((s) => s.trim().toUpperCase())
            .filter(Boolean);
    const num = (v: string | undefined, fallback: number) => {
        const n = Number(v);
        return Number.isFinite(n) && n > 0 ? n : fallback;
    };
    const hosts = env.MEDIA_PROXY_ALLOWED_HOSTS?.split(',').map((s) => s.trim()).filter(Boolean);
    return {
        archiveChannels: list(env.MEDIA_ARCHIVE_CHANNELS, 'ZALO') as Channel[],
        archiveTypes: list(env.MEDIA_ARCHIVE_TYPES, 'IMAGE,AUDIO') as InboundAttachmentType[],
        maxArchiveBytes: num(env.MEDIA_ARCHIVE_MAX_BYTES, 10 * 1024 * 1024),
        maxStreamBytes: num(env.MEDIA_PROXY_MAX_BYTES, 25 * 1024 * 1024),
        retentionDays: num(env.MEDIA_RETENTION_DAYS, 365),
        compressImages: (env.MEDIA_IMAGE_WEBP ?? 'true').toLowerCase() !== 'false',
        imageMaxDimension: num(env.MEDIA_IMAGE_MAX_DIMENSION, 1600),
        imageQuality: Math.min(100, num(env.MEDIA_IMAGE_WEBP_QUALITY, 80)),
        allowedHostSuffixes: hosts && hosts.length > 0 ? hosts : undefined,
    };
}
export const MEDIA_POLICY = Symbol('MEDIA_POLICY');

export interface ResolvedMediaStream {
    body: Readable;
    contentType: string;
    contentLength?: number;
    fileName: string;
    source: 'storage' | 'origin' | 'refreshed';
}

type MessageForMedia = {
    id: string;
    channel: Channel;
    externalMessageId: string;
    sentAt: Date;
    attachments: Prisma.JsonValue;
    channelAccount: { id: string; workspaceId: string | null; encryptedAccessToken: string | null };
};

/**
 * Chuẩn hóa vòng đời media của tin nhắn:
 * 1. Lưu bản sao (ảnh / voice của Zalo) sang object storage ngay khi nhận tin, lúc link còn sống.
 * 2. Phát media qua một endpoint duy nhất: bản sao → link gốc → (Facebook) xin link mới qua Graph API.
 * 3. Tự xóa bản sao quá hạn lưu trữ.
 * DB chỉ giữ metadata + `storageKey`, không bao giờ giữ nhị phân.
 */
@Injectable()
export class MediaArchiveService {
    private readonly logger = new Logger(MediaArchiveService.name);

    constructor(
        private readonly prisma: PrismaService,
        @Inject(MEDIA_STORAGE) private readonly storage: MediaStorage,
        @Inject(MEDIA_POLICY) private readonly policy: MediaPolicy,
        @Optional() private readonly encryption?: TokenEncryptionService,
    ) {}

    get storageDriver(): MediaStorage['driver'] {
        return this.storage.driver;
    }

    private shouldArchive(channel: Channel, att: NormalizedAttachment): boolean {
        return (
            this.storage.enabled &&
            this.policy.archiveChannels.includes(channel) &&
            this.policy.archiveTypes.includes(att.type) &&
            att.type !== 'STICKER' &&
            !att.storageKey &&
            /^https?:\/\//i.test(att.url)
        );
    }

    /** Lưu bản sao các tệp đủ điều kiện của một tin. Lỗi từng tệp không chặn các tệp khác. */
    async archiveMessage(messageId: string): Promise<number> {
        if (!this.storage.enabled) return 0;
        const message = await this.loadMessage({ id: messageId });
        if (!message) return 0;

        const attachments = readStoredAttachments(message.attachments);
        let archived = 0;
        for (let i = 0; i < attachments.length; i++) {
            const att = attachments[i];
            if (!this.shouldArchive(message.channel, att)) continue;
            try {
                const downloaded = await this.download(att.url, this.policy.maxArchiveBytes);
                // Ảnh: nén WebP + thu nhỏ trước khi lưu (thường giảm 60–90% dung lượng)
                const { buffer, contentType, converted } =
                    att.type === 'IMAGE' && this.policy.compressImages
                        ? await optimizeImage(downloaded.buffer, downloaded.contentType, {
                              maxDimension: this.policy.imageMaxDimension,
                              quality: this.policy.imageQuality,
                          })
                        : { ...downloaded, converted: false };
                const month = message.sentAt.toISOString().slice(0, 7).replace('-', '/');
                const ext = converted ? 'webp' : extensionForMime(contentType, att.name);
                const key = `${message.channelAccount.workspaceId ?? 'no-workspace'}/${month}/${message.id}/${i}.${ext}`;
                await this.storage.put(key, buffer, contentType);
                attachments[i] = {
                    ...att,
                    storageKey: key,
                    storedBytes: buffer.length,
                    storedMimeType: contentType,
                    ...(converted ? { originalBytes: downloaded.buffer.length } : {}),
                    mimeType: att.mimeType ?? downloaded.contentType,
                    archivedAt: new Date().toISOString(),
                };
                archived++;
            } catch (err) {
                this.logger.warn(`Không lưu được media ${message.id}#${i}: ${(err as Error).message}`);
            }
        }

        if (archived > 0) await this.saveAttachments(message.id, attachments);
        return archived;
    }

    /**
     * Mở luồng media cho tệp thứ `index` của tin `messageRef` (UUID hoặc mã tin của kênh) trong workspace.
     * Trả về null nếu không tìm thấy; ném `MediaExpiredError` nếu không còn nguồn nào tải được.
     */
    async open(messageRef: string, index: number, workspaceId: string): Promise<ResolvedMediaStream | null> {
        const message = await this.loadMessage(
            UUID_REGEX.test(messageRef) ? { id: messageRef } : { externalMessageId: messageRef },
            workspaceId,
        );
        if (!message) return null;
        const attachments = readStoredAttachments(message.attachments);
        const att = attachments[index];
        if (!att) return null;
        const fileName = att.name || `media-${index}`;

        // 1. Bản sao trong object storage
        if (att.storageKey) {
            const stored = await this.storage.get(att.storageKey).catch(() => null);
            if (stored) {
                return {
                    body: stored.body,
                    contentType: stored.contentType ?? att.storedMimeType ?? guessMimeType(att.storageKey) ?? 'application/octet-stream',
                    contentLength: stored.contentLength,
                    fileName,
                    source: 'storage',
                };
            }
        }

        // 2. Link gốc của kênh
        const origin = att.url ? await this.tryOpen(att.url) : null;
        if (origin) return { ...origin, fileName, source: 'origin' };

        // 3. Facebook cho phép xin lại link mới theo mã tin
        if (message.channel === Channel.FACEBOOK && att.type !== 'STICKER') {
            const freshUrl = await this.refreshFacebookUrl(message, index);
            if (freshUrl) {
                attachments[index] = { ...att, url: freshUrl, expired: false };
                await this.saveAttachments(message.id, attachments);
                const refreshed = await this.tryOpen(freshUrl);
                if (refreshed) return { ...refreshed, fileName, source: 'refreshed' };
            }
        }

        if (!att.expired) {
            attachments[index] = { ...att, expired: true };
            await this.saveAttachments(message.id, attachments).catch(() => undefined);
        }
        throw new MediaExpiredError();
    }

    /** Xóa bản sao quá hạn lưu trữ (giữ metadata, đánh dấu expired). */
    async cleanupExpired(now = new Date()): Promise<{ messages: number; objects: number }> {
        if (!this.storage.enabled) return { messages: 0, objects: 0 };
        const cutoff = new Date(now.getTime() - this.policy.retentionDays * 86_400_000);
        let messages = 0;
        let objects = 0;

        for (;;) {
            const rows = await this.prisma.$queryRaw<Array<{ id: string; attachments: Prisma.JsonValue }>>`
                SELECT id, attachments FROM messages
                WHERE sent_at < ${cutoff}
                  -- có bản sao riêng của tin (bỏ qua tài liệu thư viện dùng chung 'library/...')
                  AND attachments::text ~ '"storageKey": "(?!library/)'
                LIMIT ${CLEANUP_BATCH}
            `;
            if (rows.length === 0) break;
            for (const row of rows) {
                const list = readStoredAttachments(row.attachments);
                objects += await this.deleteObjects(list);
                await this.saveAttachments(
                    row.id,
                    list.map((att) => {
                        // Tài liệu thư viện dùng chung: giữ nguyên tham chiếu
                        if (!att.storageKey || att.storageKey.startsWith('library/')) return att;
                        const { storageKey: _k, storedBytes: _b, storedMimeType: _m, originalBytes: _o, archivedAt: _a, ...rest } = att;
                        return { ...rest, expired: true };
                    }),
                );
                messages++;
            }
            if (rows.length < CLEANUP_BATCH) break;
        }
        if (objects > 0) this.logger.log(`Đã xóa ${objects} bản sao media của ${messages} tin quá ${this.policy.retentionDays} ngày`);
        return { messages, objects };
    }

    /** Gọi TRƯỚC khi xóa tin nhắn khỏi DB để không bỏ lại tệp mồ côi trong object storage. */
    async deleteMediaForMessages(where: Prisma.MessageWhereInput): Promise<number> {
        if (!this.storage.enabled) return 0;
        let deleted = 0;
        let cursor: string | undefined;
        for (;;) {
            const rows = await this.prisma.message.findMany({
                where,
                select: { id: true, attachments: true },
                orderBy: { id: 'asc' },
                take: CLEANUP_BATCH,
                ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            });
            if (rows.length === 0) break;
            for (const row of rows) deleted += await this.deleteObjects(readStoredAttachments(row.attachments));
            cursor = rows[rows.length - 1].id;
            if (rows.length < CLEANUP_BATCH) break;
        }
        return deleted;
    }

    // ───────────────────────────── nội bộ ─────────────────────────────

    private async deleteObjects(list: NormalizedAttachment[]): Promise<number> {
        let n = 0;
        for (const att of list) {
            // Tài liệu thư viện dùng chung cho nhiều tin: không xóa theo vòng đời tin nhắn
            if (!att.storageKey || att.storageKey.startsWith('library/')) continue;
            try {
                await this.storage.delete(att.storageKey);
                n++;
            } catch (err) {
                this.logger.warn(`Không xóa được ${att.storageKey}: ${(err as Error).message}`);
            }
        }
        return n;
    }

    private async loadMessage(where: { id: string } | { externalMessageId: string }, workspaceId?: string) {
        return (await this.prisma.message.findFirst({
            where: {
                ...where,
                ...(workspaceId ? { channelAccount: { workspaceId } } : {}),
            },
            select: {
                id: true,
                channel: true,
                externalMessageId: true,
                sentAt: true,
                attachments: true,
                channelAccount: { select: { id: true, workspaceId: true, encryptedAccessToken: true } },
            },
        })) as MessageForMedia | null;
    }

    private async saveAttachments(messageId: string, attachments: NormalizedAttachment[]): Promise<void> {
        await this.prisma.message.update({
            where: { id: messageId },
            data: { attachments: attachments as unknown as Prisma.InputJsonValue },
        });
    }

    private async download(url: string, maxBytes: number): Promise<{ buffer: Buffer; contentType: string }> {
        const res = await safeGet(url, { allowedHostSuffixes: this.policy.allowedHostSuffixes, timeoutMs: 15_000 });
        if (res.statusCode < 200 || res.statusCode >= 300) {
            res.stream.resume();
            throw new Error(`HTTP ${res.statusCode}`);
        }
        const declared = Number(res.headers['content-length']);
        if (Number.isFinite(declared) && declared > maxBytes) {
            res.stream.destroy();
            throw new Error(`Tệp ${declared} byte vượt giới hạn lưu trữ ${maxBytes} byte`);
        }
        const chunks: Buffer[] = [];
        for await (const chunk of res.stream.pipe(createSizeLimiter(maxBytes))) chunks.push(chunk as Buffer);
        const contentType = String(res.headers['content-type'] || '').split(';')[0].trim() || guessMimeType(url) || 'application/octet-stream';
        return { buffer: Buffer.concat(chunks), contentType };
    }

    private async tryOpen(url: string): Promise<Omit<ResolvedMediaStream, 'fileName' | 'source'> | null> {
        try {
            const res = await safeGet(url, { allowedHostSuffixes: this.policy.allowedHostSuffixes });
            if (res.statusCode < 200 || res.statusCode >= 300) {
                res.stream.resume();
                return null;
            }
            const declared = Number(res.headers['content-length']);
            if (Number.isFinite(declared) && declared > this.policy.maxStreamBytes) {
                res.stream.destroy();
                return null;
            }
            const body = res.stream.pipe(createSizeLimiter(this.policy.maxStreamBytes));
            res.stream.on('error', (e) => body.destroy(e));
            return {
                body,
                contentType: String(res.headers['content-type'] || 'application/octet-stream'),
                contentLength: Number.isFinite(declared) ? declared : undefined,
            };
        } catch (err) {
            if (!(err instanceof SafeFetchError)) this.logger.warn(`Không mở được media gốc: ${(err as Error).message}`);
            return null;
        }
    }

    /** Graph API trả lại URL mới cho tệp đính kèm của tin Messenger (link CDN cũ có hạn dùng). */
    private async refreshFacebookUrl(message: MessageForMedia, index: number): Promise<string | null> {
        const encrypted = message.channelAccount.encryptedAccessToken;
        if (!encrypted || !this.encryption || !message.externalMessageId.startsWith('m_')) return null;
        try {
            const token = this.encryption.decrypt(encrypted);
            if (!token) return null;
            const res = await fetch(
                `https://graph.facebook.com/v19.0/${encodeURIComponent(message.externalMessageId)}?fields=attachments&access_token=${encodeURIComponent(token)}`,
            );
            const json = (await res.json().catch(() => ({}))) as { attachments?: { data?: unknown[] }; error?: { message?: string } };
            if (!res.ok || json.error) {
                this.logger.warn(`Graph API không trả link mới cho ${message.externalMessageId}: ${json.error?.message ?? res.status}`);
                return null;
            }
            return extractGraphAttachmentUrl(json.attachments?.data?.[index]) ?? null;
        } catch (err) {
            this.logger.warn(`Lỗi lấy lại link Facebook: ${(err as Error).message}`);
            return null;
        }
    }
}

export class MediaExpiredError extends Error {
    constructor() {
        super('Tệp không còn tải được: link gốc đã hết hạn và không có bản sao lưu trữ.');
    }
}
