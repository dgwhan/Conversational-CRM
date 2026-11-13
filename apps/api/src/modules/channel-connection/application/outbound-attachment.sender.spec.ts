import { describe, it, expect, vi } from 'vitest';
import sharp from 'sharp';
import { sendFacebookAttachment, sendZaloOaAttachment } from './outbound-attachment.sender.js';
import type { OutboundMediaPayload } from '../../messaging/application/outbound-media.service.js';

const media = (overrides: Partial<OutboundMediaPayload> = {}): OutboundMediaPayload => ({
    assetId: 'a1',
    purpose: 'OUTBOUND',
    kind: 'IMAGE',
    fileName: 'anh.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 3,
    storageKey: 'outbound/ws/2026/11/a1.jpg',
    buffer: Buffer.from('abc'),
    ...overrides,
});
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('sendFacebookAttachment', () => {
    it('tải tệp lên kèm tin (multipart filedata) và trả attachment_id để dùng lại', async () => {
        const fetchMock = vi.fn().mockResolvedValue(json({ message_id: 'm_1', attachment_id: '999' }));
        const res = await sendFacebookAttachment('tok', '123', media(), fetchMock as unknown as typeof fetch);

        const [url, init] = fetchMock.mock.calls[0];
        expect(String(url)).toContain('graph.facebook.com/v19.0/me/messages?access_token=tok');
        const form = init.body as FormData;
        expect(JSON.parse(form.get('recipient') as string)).toEqual({ id: '123' });
        expect(JSON.parse(form.get('message') as string)).toEqual({ attachment: { type: 'image', payload: { is_reusable: true } } });
        expect((form.get('filedata') as File).name).toBe('anh.jpg');
        expect(res).toMatchObject({ externalMessageId: 'm_1', facebookAttachmentId: '999' });
    });

    it('tài liệu thư viện đã có attachment_id thì gửi bằng id; id hết hiệu lực thì tải lên lại', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(json({ error: { message: 'invalid attachment', code: 100 } }, 400))
            .mockResolvedValueOnce(json({ message_id: 'm_2', attachment_id: '1000' }));
        const res = await sendFacebookAttachment('tok', '123', media({ facebookAttachmentId: '555', kind: 'FILE' }), fetchMock as unknown as typeof fetch);

        expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ message: { attachment: { type: 'file', payload: { attachment_id: '555' } } } });
        expect(fetchMock.mock.calls[1][1].body).toBeInstanceOf(FormData);
        expect(res.facebookAttachmentId).toBe('1000');
    });

    it('báo lỗi khung 24 giờ dễ hiểu', async () => {
        const fetchMock = vi.fn().mockResolvedValue(json({ error: { code: 10, error_subcode: 2018278, message: 'outside window' } }, 400));
        await expect(sendFacebookAttachment('tok', '123', media(), fetchMock as unknown as typeof fetch)).rejects.toThrow(/24 giờ/);
    });
});

describe('sendZaloOaAttachment', () => {
    it('ảnh: upload/image rồi gửi template media', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(json({ error: 0, data: { attachment_id: 'att-1' } }))
            .mockResolvedValueOnce(json({ error: 0, data: { message_id: 'z-1' } }));
        const res = await sendZaloOaAttachment('oa-tok', 'u1', media(), fetchMock as unknown as typeof fetch);

        expect(String(fetchMock.mock.calls[0][0])).toBe('https://openapi.zalo.me/v2.0/oa/upload/image');
        expect(fetchMock.mock.calls[0][1].headers).toEqual({ access_token: 'oa-tok' });
        const sent = JSON.parse(fetchMock.mock.calls[1][1].body);
        expect(sent).toEqual({
            recipient: { user_id: 'u1' },
            message: { attachment: { type: 'template', payload: { template_type: 'media', elements: [{ media_type: 'image', attachment_id: 'att-1' }] } } },
        });
        expect(res.externalMessageId).toBe('z-1');
    });

    it('PDF: upload/file rồi gửi attachment file bằng token', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(json({ error: 0, data: { token: 'file-tok' } }))
            .mockResolvedValueOnce(json({ error: 0, data: { message_id: 'z-2' } }));
        await sendZaloOaAttachment('oa-tok', 'u1', media({ kind: 'FILE', mimeType: 'application/pdf', fileName: 'hoc-phi.pdf' }), fetchMock as unknown as typeof fetch);
        expect(String(fetchMock.mock.calls[0][0])).toContain('/upload/file');
        expect(JSON.parse(fetchMock.mock.calls[1][1].body).message).toEqual({ attachment: { type: 'file', payload: { token: 'file-tok' } } });
    });

    it('ảnh > 1MB được nén lại trước khi tải lên', async () => {
        const big = await sharp({ create: { width: 3000, height: 3000, channels: 3, background: '#888', noise: { type: 'gaussian', mean: 128, sigma: 60 } } })
            .jpeg({ quality: 100 })
            .toBuffer();
        expect(big.length).toBeGreaterThan(1024 * 1024);
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(json({ error: 0, data: { attachment_id: 'att' } }))
            .mockResolvedValueOnce(json({ error: 0, data: { message_id: 'z' } }));
        await sendZaloOaAttachment('t', 'u', media({ buffer: big, sizeBytes: big.length }), fetchMock as unknown as typeof fetch);
        const uploaded = (fetchMock.mock.calls[0][1].body as FormData).get('file') as Blob;
        expect(uploaded.size).toBeLessThanOrEqual(1024 * 1024);
    }, 30000);

    it('từ chối voice và báo lỗi 7 ngày', async () => {
        await expect(sendZaloOaAttachment('t', 'u', media({ kind: 'AUDIO' }), vi.fn() as unknown as typeof fetch)).rejects.toThrow(/không hỗ trợ/);
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(json({ error: 0, data: { attachment_id: 'att' } }))
            .mockResolvedValueOnce(json({ error: -201, message: 'x' }));
        await expect(sendZaloOaAttachment('t', 'u', media(), fetchMock as unknown as typeof fetch)).rejects.toThrow(/7 ngày/);
    });
});
