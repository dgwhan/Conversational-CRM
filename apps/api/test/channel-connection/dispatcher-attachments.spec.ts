import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageDispatcherService } from '../../src/modules/channel-connection/application/message-dispatcher.service.js';
import { OutboundMediaService } from '../../src/modules/messaging/application/outbound-media.service.js';
import type { PrismaService } from '../../src/platform/database/prisma.service.js';
import type { TokenEncryptionService } from '../../src/modules/channel-connection/infrastructure/token-encryption.service.js';
import type { MessageRepository } from '../../src/modules/messaging/infrastructure/message.repository.js';

const WS = 'ws-1';
const CONV = 'f8a5c5b2-0fc0-4dc2-a0d8-6ab5cd111111';
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('MessageDispatcherService – gửi tệp đính kèm', () => {
    const fetchMock = vi.fn();
    let insert: ReturnType<typeof vi.fn>;
    let outbound: { loadForSend: any; markSent: any; toMessageAttachment: any };
    let dispatcher: MessageDispatcherService;
    let account: Record<string, unknown>;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal('fetch', fetchMock);
        account = {
            id: 'acc-1',
            workspaceId: WS,
            channel: 'FACEBOOK',
            displayName: 'Fanpage',
            externalAccountId: 'page-1',
            encryptedAccessToken: 'enc',
            metadata: {},
        };
        const prisma = {
            channelAccount: { findFirst: vi.fn().mockResolvedValue(account), update: vi.fn() },
            conversation: { findUnique: vi.fn().mockResolvedValue({ id: CONV }), findFirst: vi.fn(), update: vi.fn().mockResolvedValue({}) },
            message: { findUnique: vi.fn() },
        } as unknown as PrismaService;
        const encryption = { decrypt: vi.fn().mockReturnValue('page-token') } as unknown as TokenEncryptionService;
        insert = vi.fn().mockImplementation(async (events: Array<{ externalMessageId: string }>) =>
            events.map((e) => ({ id: `db-${e.externalMessageId}`, conversationId: CONV, channel: 'FACEBOOK', externalMessageId: e.externalMessageId })),
        );
        const repo = { insertManyIgnoreDuplicate: insert } as unknown as MessageRepository;

        const real = new OutboundMediaService({} as never, { enabled: true } as never);
        outbound = {
            loadForSend: vi.fn().mockResolvedValue([
                { assetId: 'a1', purpose: 'OUTBOUND', kind: 'IMAGE', fileName: 'anh.jpg', mimeType: 'image/jpeg', sizeBytes: 3, storageKey: 'outbound/ws-1/a1.jpg', buffer: Buffer.from('abc') },
            ]),
            markSent: vi.fn().mockResolvedValue(undefined),
            toMessageAttachment: real.toMessageAttachment.bind(real),
        };
        // moduleRef chỉ cung cấp OutboundMediaService (không có phiên Zalo cá nhân trong test)
        const moduleRef = { get: vi.fn((token: unknown) => (token === OutboundMediaService ? outbound : undefined)) };
        dispatcher = new MessageDispatcherService(prisma, encryption, repo, undefined, undefined, moduleRef as never);
    });

    it('gửi chữ trước rồi từng tệp; mỗi phần là một tin và tệp được gắn bản lưu trữ', async () => {
        fetchMock
            .mockResolvedValueOnce(json({ message_id: 'm_text', recipient_id: '123' }))
            .mockResolvedValueOnce(json({ message_id: 'm_img', attachment_id: '999' }));

        const res = await dispatcher.sendMessage({
            channel: 'FACEBOOK',
            recipientId: '123',
            content: 'Gửi bạn brochure',
            conversationId: CONV,
            workspaceId: WS,
            channelAccountId: 'acc-1',
            attachments: [{ assetId: 'a1' }],
        });

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(JSON.parse(fetchMock.mock.calls[0][1].body).message).toEqual({ text: 'Gửi bạn brochure' });
        expect(fetchMock.mock.calls[1][1].body).toBeInstanceOf(FormData);

        expect(insert).toHaveBeenCalledTimes(2);
        const imageEvent = insert.mock.calls[1][0][0];
        expect(imageEvent).toMatchObject({ externalMessageId: 'm_img', content: '[Hình ảnh]', direction: 'OUTBOUND' });
        expect(imageEvent.attachments[0]).toMatchObject({ id: 'm_img_0', type: 'IMAGE', storageKey: 'outbound/ws-1/a1.jpg' });

        expect(outbound.markSent).toHaveBeenCalledWith(expect.objectContaining({ assetId: 'a1' }), { facebookAttachmentId: '999' });
        expect(res).toMatchObject({ messageId: 'm_text', attachmentMessages: [{ assetId: 'a1', messageId: 'm_img', dbMessageId: 'db-m_img' }] });
        expect(outbound.loadForSend).toHaveBeenCalledWith(WS, ['a1']);
    });

    it('chỉ gửi tệp (không có chữ) vẫn hợp lệ', async () => {
        fetchMock.mockResolvedValueOnce(json({ message_id: 'm_only' }));
        const res = await dispatcher.sendMessage({ channel: 'FACEBOOK', recipientId: '123', content: '', workspaceId: WS, channelAccountId: 'acc-1', attachments: [{ assetId: 'a1' }] });
        expect(res.messageId).toBe('m_only');
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('kiểm tra khả năng kênh TRƯỚC khi gửi: Zalo OA không gửi voice nên không gửi cả phần chữ', async () => {
        account.channel = 'ZALO';
        account.externalAccountId = 'oa-1';
        outbound.loadForSend.mockResolvedValue([
            { assetId: 'v1', purpose: 'OUTBOUND', kind: 'AUDIO', fileName: 'ghi-am.webm', mimeType: 'audio/webm', sizeBytes: 10, storageKey: 'k', buffer: Buffer.alloc(10) },
        ]);
        await expect(
            dispatcher.sendMessage({ channel: 'ZALO', recipientId: 'u1', content: 'Nghe giúp mình', workspaceId: WS, channelAccountId: 'acc-1', attachments: [{ assetId: 'v1' }] }),
        ).rejects.toThrow(/Zalo OA không hỗ trợ gửi tin nhắn thoại/);
        expect(fetchMock).not.toHaveBeenCalled();
        expect(insert).not.toHaveBeenCalled();
    });

    it('tin trống (không chữ, không tệp) bị từ chối', async () => {
        await expect(dispatcher.sendMessage({ channel: 'FACEBOOK', recipientId: '123', content: '  ', workspaceId: WS, channelAccountId: 'acc-1' })).rejects.toThrow(/Tin nhắn trống/);
    });
});
