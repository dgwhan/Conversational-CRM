import { BadRequestException, ForbiddenException, Inject, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import { DistributedLockService } from '../../../platform/redis/distributed-lock.service.js';
import { WorkspaceRole } from '../../../contracts/roles.js';
import { MEDIA_STORAGE, type MediaStorage, type StoredMediaObject } from '../infrastructure/media-storage/media-storage.js';
import { prepareOutboundImage } from '../infrastructure/media-storage/image-optimizer.js';
import {
    UPLOAD_MAX_BYTES,
    detectFileType,
    safeFileName,
    type OutboundKind,
} from '../domain/media/outbound-media-policy.js';
import { formatBytes } from '../domain/media/attachment-normalizer.js';
import type { NormalizedAttachment } from '../domain/inbound-event.js';

export type MediaAssetPurpose = 'OUTBOUND' | 'LIBRARY';

export interface MediaAssetContext {
    workspaceId: string;
    userId?: string;
    role: WorkspaceRole;
}

export interface MediaAssetDto {
    id: string;
    purpose: MediaAssetPurpose;
    status: string;
    kind: OutboundKind;
    title: string | null;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    width: number | null;
    height: number | null;
    createdById: string | null;
    createdAt: string;
    /** Endpoint xem trước (cần đăng nhập) */
    contentUrl: string;
}

/** Tệp đã nạp sẵn nội dung để dispatcher gửi qua kênh */
export interface OutboundMediaPayload {
    assetId: string;
    purpose: MediaAssetPurpose;
    kind: OutboundKind;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    width?: number;
    height?: number;
    storageKey: string;
    buffer: Buffer;
    /** attachment_id Facebook đã có từ lần gửi trước (tài liệu thư viện) */
    facebookAttachmentId?: string;
}

const PENDING_TTL_MS = 24 * 60 * 60 * 1000;
const LIBRARY_PREFIX = 'library/';

type AssetRow = Prisma.MediaAssetGetPayload<object>;

/**
 * Tệp do CRM gửi đi: tải lên → kiểm tra định dạng thật → chuẩn hóa ảnh → lưu object storage → gửi.
 * - OUTBOUND: tải lên trong khung chat, chờ gửi tối đa 24 giờ; gửi xong thì tin nhắn "sở hữu" bản lưu trữ.
 * - LIBRARY: tài liệu dùng lại (brochure, bảng học phí); tin nhắn chỉ tham chiếu, không bị xóa theo tin.
 */
@Injectable()
export class OutboundMediaService {
    private readonly logger = new Logger(OutboundMediaService.name);

    constructor(
        private readonly prisma: PrismaService,
        @Inject(MEDIA_STORAGE) private readonly storage: MediaStorage,
        @Optional() private readonly locks?: DistributedLockService,
    ) {}

    async upload(
        ctx: MediaAssetContext,
        file: { buffer: Buffer; fileName: string },
        opts: { purpose: MediaAssetPurpose; title?: string; kindHint?: string },
    ): Promise<MediaAssetDto> {
        if (!this.storage.enabled) {
            throw new BadRequestException('Máy chủ chưa cấu hình nơi lưu tệp (MEDIA_STORAGE_DRIVER). Liên hệ quản trị viên.');
        }
        if (opts.purpose === 'LIBRARY' && ctx.role !== WorkspaceRole.OWNER) {
            throw new ForbiddenException('Chỉ chủ workspace được thêm tài liệu vào thư viện.');
        }
        if (file.buffer.length === 0) throw new BadRequestException('Tệp rỗng.');
        if (file.buffer.length > UPLOAD_MAX_BYTES) {
            throw new BadRequestException(`Tệp vượt quá ${Math.round(UPLOAD_MAX_BYTES / 1024 / 1024)}MB.`);
        }

        const detected = detectFileType(file.buffer, file.fileName);
        if (!detected) {
            throw new BadRequestException(
                'Định dạng tệp không được hỗ trợ. Cho phép: ảnh (jpg, png, gif, webp, heic), PDF, Word, Excel, PowerPoint, zip, txt/csv, âm thanh (mp3, m4a, ogg, wav, webm) và video (mp4, mov).',
            );
        }

        let kind: OutboundKind = detected.kind;
        let mimeType = detected.mimeType;
        let extension = detected.extension;
        // Ghi âm trên trình duyệt có container mp4/webm giống video: tin vào gợi ý AUDIO của client
        if (opts.kindHint === 'AUDIO' && kind === 'VIDEO' && (mimeType === 'video/webm' || mimeType === 'video/mp4')) {
            kind = 'AUDIO';
            mimeType = mimeType === 'video/webm' ? 'audio/webm' : 'audio/mp4';
            extension = mimeType === 'audio/webm' ? 'webm' : 'm4a';
        }

        let buffer = file.buffer;
        let width: number | undefined;
        let height: number | undefined;
        if (kind === 'IMAGE') {
            try {
                const prepared = await prepareOutboundImage(buffer, mimeType);
                buffer = prepared.buffer;
                mimeType = prepared.mimeType;
                extension = prepared.extension;
                width = prepared.width;
                height = prepared.height;
            } catch (err) {
                throw new BadRequestException(`Không đọc được ảnh: ${(err as Error).message}`);
            }
        }

        const now = new Date();
        const id = randomUUID();
        const prefix = opts.purpose === 'LIBRARY' ? 'library' : 'outbound';
        const storageKey = `${prefix}/${ctx.workspaceId}/${now.toISOString().slice(0, 7).replace('-', '/')}/${id}.${extension}`;
        await this.storage.put(storageKey, buffer, mimeType);

        const row = await this.prisma.mediaAsset.create({
            data: {
                id,
                workspaceId: ctx.workspaceId,
                createdById: ctx.userId ?? null,
                purpose: opts.purpose,
                status: opts.purpose === 'LIBRARY' ? 'ACTIVE' : 'PENDING',
                kind,
                title: opts.title?.trim().slice(0, 255) || null,
                fileName: safeFileName(file.fileName, extension),
                mimeType,
                sizeBytes: buffer.length,
                width: width ?? null,
                height: height ?? null,
                storageKey,
            },
        });
        return this.toDto(row);
    }

    async listLibrary(ctx: MediaAssetContext, search?: string): Promise<MediaAssetDto[]> {
        const term = search?.trim();
        const rows = await this.prisma.mediaAsset.findMany({
            where: {
                workspaceId: ctx.workspaceId,
                purpose: 'LIBRARY',
                status: 'ACTIVE',
                ...(term
                    ? { OR: [{ title: { contains: term, mode: 'insensitive' } }, { fileName: { contains: term, mode: 'insensitive' } }] }
                    : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
        });
        return rows.map((r) => this.toDto(r));
    }

    async renameLibraryItem(ctx: MediaAssetContext, id: string, title: string): Promise<MediaAssetDto> {
        if (ctx.role !== WorkspaceRole.OWNER) throw new ForbiddenException('Chỉ chủ workspace được sửa thư viện.');
        const row = await this.findOwned(ctx, id);
        if (row.purpose !== 'LIBRARY') throw new BadRequestException('Chỉ đổi tên được tài liệu trong thư viện.');
        const updated = await this.prisma.mediaAsset.update({ where: { id }, data: { title: title.trim().slice(0, 255) || null } });
        return this.toDto(updated);
    }

    /** Xóa tệp chờ gửi (người tải lên / chủ workspace) hoặc tài liệu thư viện (chủ workspace). */
    async remove(ctx: MediaAssetContext, id: string): Promise<void> {
        const row = await this.findOwned(ctx, id);
        if (row.purpose === 'LIBRARY' && ctx.role !== WorkspaceRole.OWNER) {
            throw new ForbiddenException('Chỉ chủ workspace được xóa tài liệu thư viện.');
        }
        if (row.purpose === 'OUTBOUND') {
            if (row.status !== 'PENDING') throw new BadRequestException('Tệp đã gửi đi, không thể xóa ở đây.');
            if (ctx.role !== WorkspaceRole.OWNER && row.createdById !== ctx.userId) throw new ForbiddenException('Không thể xóa tệp của người khác.');
        }
        await this.storage.delete(row.storageKey).catch(() => undefined);
        await this.prisma.mediaAsset.delete({ where: { id } });
    }

    async openContent(ctx: MediaAssetContext, id: string): Promise<{ object: StoredMediaObject; asset: MediaAssetDto }> {
        const row = await this.findOwned(ctx, id);
        const object = await this.storage.get(row.storageKey);
        if (!object) throw new NotFoundException('Tệp không còn trong kho lưu trữ.');
        return { object, asset: this.toDto(row) };
    }

    /** Nạp nội dung các tệp sẽ gửi (giữ đúng thứ tự). Chỉ nhận tệp chờ gửi hoặc tài liệu thư viện của workspace. */
    async loadForSend(workspaceId: string, assetIds: string[]): Promise<OutboundMediaPayload[]> {
        if (assetIds.length === 0) return [];
        if (assetIds.length > 10) throw new BadRequestException('Mỗi lần gửi tối đa 10 tệp.');
        const rows = await this.prisma.mediaAsset.findMany({
            where: {
                id: { in: assetIds },
                workspaceId,
                OR: [
                    { purpose: 'OUTBOUND', status: 'PENDING' },
                    { purpose: 'LIBRARY', status: 'ACTIVE' },
                ],
            },
        });
        const byId = new Map(rows.map((r) => [r.id, r]));
        const result: OutboundMediaPayload[] = [];
        for (const id of assetIds) {
            const row = byId.get(id);
            if (!row) throw new BadRequestException('Tệp đính kèm không tồn tại hoặc đã được gửi. Hãy tải lên lại.');
            const object = await this.storage.get(row.storageKey);
            if (!object) throw new BadRequestException(`Tệp "${row.fileName}" không còn trong kho lưu trữ.`);
            const chunks: Buffer[] = [];
            for await (const chunk of object.body) chunks.push(Buffer.from(chunk as Buffer));
            const refs = (row.channelRefs ?? {}) as Record<string, unknown>;
            result.push({
                assetId: row.id,
                purpose: row.purpose as MediaAssetPurpose,
                kind: row.kind as OutboundKind,
                fileName: row.fileName,
                mimeType: row.mimeType,
                sizeBytes: row.sizeBytes,
                width: row.width ?? undefined,
                height: row.height ?? undefined,
                storageKey: row.storageKey,
                buffer: Buffer.concat(chunks),
                facebookAttachmentId: typeof refs.facebookAttachmentId === 'string' ? refs.facebookAttachmentId : undefined,
            });
        }
        return result;
    }

    /**
     * Sau khi gửi thành công: tệp OUTBOUND nhường quyền sở hữu bản lưu trữ cho tin nhắn (xóa dòng tạm),
     * tài liệu thư viện ghi lại attachment_id của Facebook để lần sau gửi không cần tải lên lại.
     */
    async markSent(media: OutboundMediaPayload, refs: { facebookAttachmentId?: string } = {}): Promise<void> {
        if (media.purpose === 'OUTBOUND') {
            await this.prisma.mediaAsset.delete({ where: { id: media.assetId } }).catch(() => undefined);
            return;
        }
        if (refs.facebookAttachmentId && refs.facebookAttachmentId !== media.facebookAttachmentId) {
            const row = await this.prisma.mediaAsset.findUnique({ where: { id: media.assetId }, select: { channelRefs: true } });
            await this.prisma.mediaAsset.update({
                where: { id: media.assetId },
                data: {
                    sentAt: new Date(),
                    channelRefs: { ...((row?.channelRefs as object) ?? {}), facebookAttachmentId: refs.facebookAttachmentId },
                },
            });
        } else {
            await this.prisma.mediaAsset.update({ where: { id: media.assetId }, data: { sentAt: new Date() } }).catch(() => undefined);
        }
    }

    /** Dạng đính kèm lưu cùng tin nhắn chiều đi (Inbox hiển thị qua endpoint media bằng storageKey). */
    toMessageAttachment(media: OutboundMediaPayload, externalMessageId: string, index = 0): NormalizedAttachment {
        return {
            id: `${externalMessageId}_${index}`,
            type: media.kind,
            url: '',
            name: media.fileName,
            size: formatBytes(media.sizeBytes),
            mimeType: media.mimeType,
            storageKey: media.storageKey,
            storedBytes: media.sizeBytes,
            storedMimeType: media.mimeType,
            archivedAt: new Date().toISOString(),
        };
    }

    /** Mỗi giờ: xóa tệp tải lên mà không gửi đi sau 24 giờ. */
    @Cron('15 * * * *', { name: 'outbound-media-pending-cleanup' })
    async cleanupPending(now = new Date()): Promise<number> {
        // Khóa phân tán: nhiều instance chỉ một instance dọn (giống các cron khác)
        const run = () => this.cleanupPendingRows(now);
        const result = this.locks ? await this.locks.runExclusive('cron:outbound-media-pending-cleanup', 10 * 60_000, run) : await run();
        return result ?? 0;
    }

    private async cleanupPendingRows(now: Date): Promise<number> {
        const rows = await this.prisma.mediaAsset.findMany({
            where: { purpose: 'OUTBOUND', status: 'PENDING', createdAt: { lt: new Date(now.getTime() - PENDING_TTL_MS) } },
            select: { id: true, storageKey: true },
            take: 500,
        });
        for (const row of rows) {
            await this.storage.delete(row.storageKey).catch(() => undefined);
            await this.prisma.mediaAsset.delete({ where: { id: row.id } }).catch(() => undefined);
        }
        if (rows.length > 0) this.logger.log(`Đã xóa ${rows.length} tệp tải lên không được gửi sau 24 giờ`);
        return rows.length;
    }

    private async findOwned(ctx: MediaAssetContext, id: string): Promise<AssetRow> {
        const row = await this.prisma.mediaAsset.findFirst({ where: { id, workspaceId: ctx.workspaceId } }).catch(() => null);
        if (!row) throw new NotFoundException('Không tìm thấy tệp.');
        return row;
    }

    private toDto(row: AssetRow): MediaAssetDto {
        return {
            id: row.id,
            purpose: row.purpose as MediaAssetPurpose,
            status: row.status,
            kind: row.kind as OutboundKind,
            title: row.title,
            fileName: row.fileName,
            mimeType: row.mimeType,
            sizeBytes: row.sizeBytes,
            width: row.width,
            height: row.height,
            createdById: row.createdById,
            createdAt: row.createdAt.toISOString(),
            contentUrl: `/messaging/assets/${row.id}/content`,
        };
    }
}

/** Bản lưu trữ của tài liệu thư viện dùng chung cho nhiều tin: không được xóa theo vòng đời tin nhắn. */
export const isSharedLibraryKey = (key?: string) => Boolean(key && key.startsWith(LIBRARY_PREFIX));
