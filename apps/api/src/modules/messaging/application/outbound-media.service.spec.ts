import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Readable } from 'node:stream';
import sharp from 'sharp';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { OutboundMediaService, isSharedLibraryKey, type MediaAssetContext } from './outbound-media.service.js';
import { WorkspaceRole } from '../../../contracts/roles.js';

const WS = '11111111-1111-1111-1111-111111111111';
const owner: MediaAssetContext = { workspaceId: WS, userId: 'u-owner', role: WorkspaceRole.OWNER };
const staff: MediaAssetContext = { workspaceId: WS, userId: 'u-staff', role: WorkspaceRole.STAFF };

describe('OutboundMediaService', () => {
    let prisma: any;
    let storage: any;
    let service: OutboundMediaService;

    beforeEach(() => {
        prisma = {
            mediaAsset: {
                create: vi.fn().mockImplementation(async ({ data }) => ({ ...data, channelRefs: {}, sentAt: null, createdAt: new Date(), updatedAt: new Date() })),
                findMany: vi.fn().mockResolvedValue([]),
                findFirst: vi.fn(),
                findUnique: vi.fn(),
                update: vi.fn().mockResolvedValue({}),
                delete: vi.fn().mockResolvedValue({}),
            },
        };
        storage = {
            driver: 'local',
            enabled: true,
            put: vi.fn().mockResolvedValue(undefined),
            get: vi.fn(),
            delete: vi.fn().mockResolvedValue(undefined),
        };
        service = new OutboundMediaService(prisma, storage);
    });

    it('ảnh tải lên được chuẩn hóa sang JPEG, bỏ EXIF, lưu dưới outbound/', async () => {
        const png = await sharp({ create: { width: 3000, height: 1000, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
        const dto = await service.upload(staff, { buffer: png, fileName: 'Ảnh chụp.png' }, { purpose: 'OUTBOUND' });

        const [key, buffer, mime] = storage.put.mock.calls[0];
        expect(key).toMatch(new RegExp(`^outbound/${WS}/\\d{4}/\\d{2}/[0-9a-f-]{36}\\.jpg$`));
        expect(mime).toBe('image/jpeg');
        const meta = await sharp(buffer).metadata();
        expect([meta.format, meta.width, meta.height, meta.exif]).toEqual(['jpeg', 2048, 683, undefined]);
        expect(dto).toMatchObject({ kind: 'IMAGE', status: 'PENDING', fileName: 'Ảnh chụp.jpg', mimeType: 'image/jpeg', width: 2048 });
        expect(dto.contentUrl).toBe(`/messaging/assets/${dto.id}/content`);
    });

    it('từ chối định dạng nguy hiểm và chỉ OWNER được thêm vào thư viện', async () => {
        await expect(
            service.upload(owner, { buffer: Buffer.from('<svg onload="alert(1)"></svg>'.padEnd(64)), fileName: 'x.png' }, { purpose: 'OUTBOUND' }),
        ).rejects.toBeInstanceOf(BadRequestException);
        await expect(
            service.upload(staff, { buffer: Buffer.from('%PDF-1.7'.padEnd(64)), fileName: 'a.pdf' }, { purpose: 'LIBRARY' }),
        ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('ghi âm WebM từ trình duyệt với gợi ý AUDIO được lưu là audio/webm', async () => {
        const webm = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(60)]);
        const dto = await service.upload(staff, { buffer: webm, fileName: 'ghi-am.webm' }, { purpose: 'OUTBOUND', kindHint: 'AUDIO' });
        expect(dto).toMatchObject({ kind: 'AUDIO', mimeType: 'audio/webm' });
    });

    it('thư viện lưu dưới library/ và được bảo vệ khỏi dọn dẹp theo tin nhắn', async () => {
        await service.upload(owner, { buffer: Buffer.from('%PDF-1.7'.padEnd(64)), fileName: 'Brochure.pdf' }, { purpose: 'LIBRARY', title: 'Brochure 2026' });
        const key = storage.put.mock.calls[0][0];
        expect(key.startsWith(`library/${WS}/`)).toBe(true);
        expect(isSharedLibraryKey(key)).toBe(true);
        expect(prisma.mediaAsset.create.mock.calls[0][0].data).toMatchObject({ status: 'ACTIVE', title: 'Brochure 2026' });
    });

    it('loadForSend giữ đúng thứ tự, nạp nội dung và từ chối tệp đã gửi', async () => {
        prisma.mediaAsset.findMany.mockResolvedValue([
            { id: 'b', purpose: 'LIBRARY', kind: 'FILE', fileName: 'b.pdf', mimeType: 'application/pdf', sizeBytes: 2, storageKey: 'library/b.pdf', channelRefs: { facebookAttachmentId: '77' }, width: null, height: null },
            { id: 'a', purpose: 'OUTBOUND', kind: 'IMAGE', fileName: 'a.jpg', mimeType: 'image/jpeg', sizeBytes: 2, storageKey: 'outbound/a.jpg', channelRefs: {}, width: 10, height: 5 },
        ]);
        storage.get.mockImplementation(async (key: string) => ({ body: Readable.from([Buffer.from(key)]) }));

        const list = await service.loadForSend(WS, ['a', 'b']);
        expect(list.map((m) => [m.assetId, m.buffer.toString(), m.facebookAttachmentId])).toEqual([
            ['a', 'outbound/a.jpg', undefined],
            ['b', 'library/b.pdf', '77'],
        ]);
        expect(prisma.mediaAsset.findMany.mock.calls[0][0].where).toMatchObject({ workspaceId: WS, id: { in: ['a', 'b'] } });

        await expect(service.loadForSend(WS, ['a', 'missing'])).rejects.toThrow(/không tồn tại hoặc đã được gửi/);
    });

    it('markSent: tệp chờ gửi bị xóa dòng tạm (tin nhắn giữ bản lưu trữ), thư viện lưu attachment_id', async () => {
        const base = { buffer: Buffer.alloc(0), kind: 'FILE' as const, fileName: 'x', mimeType: 'application/pdf', sizeBytes: 1, storageKey: 'k' };
        await service.markSent({ ...base, assetId: 'a', purpose: 'OUTBOUND' });
        expect(prisma.mediaAsset.delete).toHaveBeenCalledWith({ where: { id: 'a' } });
        expect(storage.delete).not.toHaveBeenCalled();

        prisma.mediaAsset.findUnique.mockResolvedValue({ channelRefs: {} });
        await service.markSent({ ...base, assetId: 'b', purpose: 'LIBRARY' }, { facebookAttachmentId: '88' });
        expect(prisma.mediaAsset.update.mock.calls[0][0].data.channelRefs).toEqual({ facebookAttachmentId: '88' });
    });

    it('STAFF không xóa được tệp chờ gửi của người khác; dọn tệp chờ quá 24 giờ', async () => {
        prisma.mediaAsset.findFirst.mockResolvedValue({ id: 'a', purpose: 'OUTBOUND', status: 'PENDING', createdById: 'u-khac', storageKey: 'k' });
        await expect(service.remove(staff, 'a')).rejects.toBeInstanceOf(ForbiddenException);

        prisma.mediaAsset.findMany.mockResolvedValue([{ id: 'old', storageKey: 'outbound/old.jpg' }]);
        expect(await service.cleanupPending(new Date('2026-11-14T00:00:00Z'))).toBe(1);
        expect(storage.delete).toHaveBeenCalledWith('outbound/old.jpg');
        expect(prisma.mediaAsset.findMany.mock.calls[0][0].where).toMatchObject({ purpose: 'OUTBOUND', status: 'PENDING' });
    });

    it('toMessageAttachment trỏ tới bản lưu trữ để Inbox hiển thị qua endpoint media', () => {
        const att = service.toMessageAttachment(
            { assetId: 'a', purpose: 'OUTBOUND', kind: 'IMAGE', fileName: 'a.jpg', mimeType: 'image/jpeg', sizeBytes: 2048, storageKey: 'outbound/a.jpg', buffer: Buffer.alloc(0) },
            'm_9',
        );
        expect(att).toMatchObject({ id: 'm_9_0', type: 'IMAGE', storageKey: 'outbound/a.jpg', size: '2.0 KB', url: '' });
    });
});
