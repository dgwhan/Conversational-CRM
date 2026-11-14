import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PassThrough, Readable } from 'node:stream';

vi.mock('../../../common/security/safe-fetch.js', async (orig) => {
    const actual = await orig<typeof import('../../../common/security/safe-fetch.js')>();
    return { ...actual, safeGet: vi.fn() };
});

import { safeGet } from '../../../common/security/safe-fetch.js';
import { MediaArchiveService, MediaExpiredError, type MediaPolicy } from './media-archive.service.js';
import { Channel } from '../domain/channel.js';
import type { MediaStorage } from '../infrastructure/media-storage/media-storage.js';

const WS = 'ws-1';
const MSG_ID = '11111111-1111-1111-1111-111111111111';

function upstream(status: number, body = 'data', contentType = 'image/jpeg') {
    const stream = new PassThrough();
    stream.end(Buffer.from(body));
    return { statusCode: status, headers: { 'content-type': contentType, 'content-length': String(body.length) }, stream, finalUrl: new URL('https://cdn/x') };
}

describe('MediaArchiveService', () => {
    let prisma: any;
    let storage: MediaStorage & { put: any; get: any; delete: any };
    let encryption: any;
    let service: MediaArchiveService;
    const policy: MediaPolicy = {
        archiveChannels: [Channel.ZALO],
        archiveTypes: ['IMAGE', 'AUDIO'],
        maxArchiveBytes: 1024 * 1024,
        maxStreamBytes: 1024 * 1024,
        retentionDays: 30,
        compressImages: true,
        imageMaxDimension: 1600,
        imageQuality: 80,
    };

    const message = (overrides: Record<string, unknown> = {}) => ({
        id: MSG_ID,
        channel: Channel.ZALO,
        externalMessageId: 'z-1',
        sentAt: new Date('2026-11-13T00:00:00Z'),
        attachments: [
            { id: 'z-1_0', type: 'IMAGE', url: 'https://photo.zdn.vn/a.jpg', name: 'Hình ảnh' },
            { id: 'z-1_1', type: 'STICKER', url: 'https://stickers.zalo.me/1', stickerId: '1' },
            { id: 'z-1_2', type: 'VIDEO', url: 'https://v.zdn.vn/v.mp4' },
        ],
        channelAccount: { id: 'acc', workspaceId: WS, encryptedAccessToken: 'enc' },
        ...overrides,
    });

    beforeEach(() => {
        vi.mocked(safeGet).mockReset();
        prisma = {
            message: { findFirst: vi.fn(), update: vi.fn().mockResolvedValue({}), findMany: vi.fn() },
            $queryRaw: vi.fn(),
        };
        storage = {
            driver: 'local',
            enabled: true,
            put: vi.fn().mockResolvedValue(undefined),
            get: vi.fn().mockResolvedValue(null),
            delete: vi.fn().mockResolvedValue(undefined),
        } as any;
        encryption = { decrypt: vi.fn().mockReturnValue('page-token') };
        service = new MediaArchiveService(prisma, storage, policy, encryption);
    });

    afterEach(() => vi.unstubAllGlobals());

    it('chỉ lưu bản sao ảnh/voice của Zalo, bỏ qua sticker và video', async () => {
        prisma.message.findFirst.mockResolvedValue(message());
        vi.mocked(safeGet).mockResolvedValue(upstream(200, 'jpegdata') as any);

        expect(await service.archiveMessage(MSG_ID)).toBe(1);
        expect(storage.put).toHaveBeenCalledWith(`${WS}/2026/11/${MSG_ID}/0.jpg`, Buffer.from('jpegdata'), 'image/jpeg');
        const saved = prisma.message.update.mock.calls[0][0].data.attachments;
        expect(saved[0]).toMatchObject({ storageKey: `${WS}/2026/11/${MSG_ID}/0.jpg`, storedBytes: 8 });
        expect(saved[1].storageKey).toBeUndefined();
        expect(saved[2].storageKey).toBeUndefined();
    });

    it('nén ảnh thật sang WebP trước khi lưu và ghi lại dung lượng gốc', async () => {
        const sharp = (await import('sharp')).default;
        const png = await sharp({ create: { width: 2400, height: 1200, channels: 3, background: '#ff8800' } }).png().toBuffer();
        prisma.message.findFirst.mockResolvedValue(message({ attachments: [{ id: 'z-1_0', type: 'IMAGE', url: 'https://photo.zdn.vn/a.png' }] }));
        const stream = new PassThrough();
        stream.end(png);
        vi.mocked(safeGet).mockResolvedValue({ statusCode: 200, headers: { 'content-type': 'image/png' }, stream, finalUrl: new URL('https://x') } as any);

        expect(await service.archiveMessage(MSG_ID)).toBe(1);
        const [key, buffer, contentType] = storage.put.mock.calls[0];
        expect(key).toBe(`${WS}/2026/11/${MSG_ID}/0.webp`);
        expect(contentType).toBe('image/webp');
        const saved = prisma.message.update.mock.calls[0][0].data.attachments[0];
        expect(saved).toMatchObject({ storedMimeType: 'image/webp', originalBytes: png.length, storedBytes: buffer.length, mimeType: 'image/png' });
        expect((await sharp(buffer).metadata()).width).toBe(1600);
    });

    it('không lưu media của kênh ngoài chính sách (Facebook lấy lại link được)', async () => {
        prisma.message.findFirst.mockResolvedValue(message({ channel: Channel.FACEBOOK }));
        expect(await service.archiveMessage(MSG_ID)).toBe(0);
        expect(safeGet).not.toHaveBeenCalled();
    });

    it('phát từ bản sao khi có storageKey', async () => {
        prisma.message.findFirst.mockResolvedValue(
            message({ attachments: [{ id: 'a', type: 'IMAGE', url: 'https://dead', storageKey: 'k/0.jpg', mimeType: 'image/jpeg' }] }),
        );
        storage.get.mockResolvedValue({ body: Readable.from(['x']), contentType: 'image/jpeg', contentLength: 1 });

        const res = await service.open(MSG_ID, 0, WS);
        expect(res).toMatchObject({ source: 'storage', contentType: 'image/jpeg' });
        expect(safeGet).not.toHaveBeenCalled();
        expect(prisma.message.findFirst.mock.calls[0][0].where).toMatchObject({ id: MSG_ID, channelAccount: { workspaceId: WS } });
    });

    it('Facebook: link gốc hết hạn thì xin link mới qua Graph API và lưu lại', async () => {
        prisma.message.findFirst.mockResolvedValue(
            message({ channel: Channel.FACEBOOK, externalMessageId: 'm_abc', attachments: [{ id: 'm_abc_0', type: 'IMAGE', url: 'https://old' }] }),
        );
        vi.mocked(safeGet)
            .mockResolvedValueOnce(upstream(403) as any)
            .mockResolvedValueOnce(upstream(200, 'fresh') as any);
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ attachments: { data: [{ image_data: { url: 'https://new' } }] } }), { status: 200 }),
        );
        vi.stubGlobal('fetch', fetchMock);

        const res = await service.open('m_abc', 0, WS);
        expect(res?.source).toBe('refreshed');
        expect(String(fetchMock.mock.calls[0][0])).toContain('graph.facebook.com/v19.0/m_abc?fields=attachments');
        expect(prisma.message.update.mock.calls[0][0].data.attachments[0]).toMatchObject({ url: 'https://new', expired: false });
        expect(prisma.message.findFirst.mock.calls[0][0].where).toMatchObject({ externalMessageId: 'm_abc' });
    });

    it('không còn nguồn nào thì báo hết hạn và đánh dấu expired', async () => {
        prisma.message.findFirst.mockResolvedValue(message());
        vi.mocked(safeGet).mockResolvedValue(upstream(404) as any);

        await expect(service.open(MSG_ID, 0, WS)).rejects.toBeInstanceOf(MediaExpiredError);
        expect(prisma.message.update.mock.calls[0][0].data.attachments[0]).toMatchObject({ expired: true });
    });

    it('trả null khi tin không thuộc workspace hoặc sai thứ tự tệp', async () => {
        prisma.message.findFirst.mockResolvedValue(null);
        expect(await service.open(MSG_ID, 0, WS)).toBeNull();
        prisma.message.findFirst.mockResolvedValue(message());
        expect(await service.open(MSG_ID, 9, WS)).toBeNull();
    });

    it('dọn bản sao quá hạn: xóa object, giữ metadata và đánh dấu expired', async () => {
        prisma.$queryRaw.mockResolvedValueOnce([
            { id: MSG_ID, attachments: [{ id: 'a', type: 'IMAGE', url: 'u', storageKey: 'k/0.jpg', storedBytes: 5, archivedAt: 'x' }] },
        ]);
        const res = await service.cleanupExpired(new Date('2027-01-01'));
        expect(res).toEqual({ messages: 1, objects: 1 });
        expect(storage.delete).toHaveBeenCalledWith('k/0.jpg');
        expect(prisma.message.update.mock.calls[0][0].data.attachments[0]).toEqual({ id: 'a', type: 'IMAGE', url: 'u', expired: true });
    });

    it('xóa object trước khi purge tin', async () => {
        prisma.message.findMany.mockResolvedValueOnce([
            { id: 'm1', attachments: [{ storageKey: 'k/1.jpg' }, { url: 'x' }] },
            { id: 'm2', attachments: null },
        ]);
        expect(await service.deleteMediaForMessages({ id: { in: ['m1', 'm2'] } })).toBe(1);
        expect(storage.delete).toHaveBeenCalledTimes(1);
    });
});
