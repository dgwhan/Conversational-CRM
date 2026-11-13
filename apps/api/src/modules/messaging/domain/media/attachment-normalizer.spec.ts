import { describe, it, expect } from 'vitest';
import {
    attachmentsFromRawPayload,
    formatBytes,
    formatDuration,
    normalizeFacebookAttachments,
    normalizeZaloOaAttachments,
    normalizeZaloPersonalAttachments,
    summarizeAttachments,
} from './attachment-normalizer.js';

describe('normalizeFacebookAttachments', () => {
    it('chuẩn hóa ảnh, voice, video, file và sticker với id ổn định theo mid', () => {
        const list = normalizeFacebookAttachments('m_1', [
            { type: 'image', payload: { url: 'https://scontent.xx.fbcdn.net/a.jpg' } },
            { type: 'audio', payload: { url: 'https://cdn.fbsbx.com/v.mp4' } },
            { type: 'video', payload: { url: 'https://video.xx.fbcdn.net/v.mp4' } },
            { type: 'file', payload: { url: 'https://cdn.fbsbx.com/hoso.pdf', name: 'hoso.pdf' } },
            { type: 'image', payload: { sticker_id: 369239263222822 } },
            { type: 'fallback', payload: { url: 'https://example.com' } },
        ]);
        expect(list.map((a) => [a.id, a.type])).toEqual([
            ['m_1_0', 'IMAGE'],
            ['m_1_1', 'AUDIO'],
            ['m_1_2', 'VIDEO'],
            ['m_1_3', 'FILE'],
            ['m_1_4', 'STICKER'],
        ]);
        expect(list[4].url).toBe('https://lookaside.facebook.com/stickers/369239263222822.png');
        expect(list[3]).toMatchObject({ name: 'hoso.pdf', mimeType: 'application/pdf' });
    });
});

describe('normalizeZaloOaAttachments', () => {
    it('nhận diện voice / video / gif và KHÔNG coi ảnh có payload.id là sticker', () => {
        expect(
            normalizeZaloOaAttachments('z1', 'user_send_image', {
                attachments: [{ type: 'image', payload: { id: 'abc', url: 'https://photo.zdn.vn/a.jpg', thumbnail: 'https://photo.zdn.vn/t.jpg' } }],
            })[0],
        ).toMatchObject({ type: 'IMAGE', url: 'https://photo.zdn.vn/a.jpg', thumbnailUrl: 'https://photo.zdn.vn/t.jpg' });

        expect(
            normalizeZaloOaAttachments('z2', 'user_send_audio', { attachments: [{ type: 'audio', payload: { url: 'https://v.zdn.vn/a.aac', duration: 15 } }] })[0],
        ).toMatchObject({ type: 'AUDIO', duration: '0:15' });

        expect(normalizeZaloOaAttachments('z3', 'user_send_gif', { attachments: [{ type: 'gif', payload: { url: 'https://g.zdn.vn/x.gif' } }] })[0].type).toBe('IMAGE');

        expect(
            normalizeZaloOaAttachments('z4', 'user_send_sticker', { attachments: [{ type: 'sticker', payload: { id: '123', url: 'https://zalo-api.zadn.vn/s.png' } }] })[0],
        ).toMatchObject({ type: 'STICKER', stickerId: '123' });
    });

    it('bỏ qua link / vị trí vì không phải media', () => {
        expect(normalizeZaloOaAttachments('z5', 'user_send_link', { attachments: [{ type: 'link', payload: { url: 'https://a.vn' } }] })).toEqual([]);
        expect(normalizeZaloOaAttachments('z6', 'user_send_location', { attachments: [{ type: 'location', payload: {} }] })).toEqual([]);
    });
});

describe('normalizeZaloPersonalAttachments (zca-js)', () => {
    it('ảnh lấy bản HD trong params', () => {
        const [att] = normalizeZaloPersonalAttachments('p1', {
            msgType: 'chat.photo',
            content: { href: 'https://f.zdn.vn/n.jpg', thumb: 'https://f.zdn.vn/t.jpg', params: JSON.stringify({ hd: 'https://f.zdn.vn/hd.jpg' }) },
        });
        expect(att).toMatchObject({ id: 'p1_0', type: 'IMAGE', url: 'https://f.zdn.vn/hd.jpg', thumbnailUrl: 'https://f.zdn.vn/t.jpg' });
    });

    it('voice, video, file và sticker', () => {
        expect(
            normalizeZaloPersonalAttachments('p2', { msgType: 'chat.voice', content: { href: 'https://v.zdn.vn/a.m4a', params: '{"duration":7000}' } })[0],
        ).toMatchObject({ type: 'AUDIO', duration: '0:07', mimeType: 'audio/mp4' });
        expect(normalizeZaloPersonalAttachments('p3', { msgType: 'chat.video.msg', content: { href: 'https://v.zdn.vn/v.mp4' } })[0].type).toBe('VIDEO');
        expect(
            normalizeZaloPersonalAttachments('p4', {
                msgType: 'share.file',
                content: { title: 'Bang diem.xlsx', href: 'https://f.zdn.vn/f', params: '{"fileSize":"20480","fileExt":"xlsx"}' },
            })[0],
        ).toMatchObject({ type: 'FILE', name: 'Bang diem.xlsx', size: '20.0 KB' });
        expect(normalizeZaloPersonalAttachments('p5', { msgType: 'chat.sticker', content: { id: 4321, catId: 10 } })[0]).toMatchObject({
            type: 'STICKER',
            stickerId: '4321',
        });
    });

    it('tin chữ và link không có đính kèm', () => {
        expect(normalizeZaloPersonalAttachments('p6', { msgType: 'webchat', content: 'xin chào' })).toEqual([]);
        expect(normalizeZaloPersonalAttachments('p7', { msgType: 'chat.recommended', content: { href: 'https://a.vn' } })).toEqual([]);
    });
});

describe('attachmentsFromRawPayload', () => {
    it('suy ra đúng nguồn từ payload Facebook, Zalo OA, zca-js', () => {
        expect(attachmentsFromRawPayload('m_9', { message: { attachments: [{ type: 'image', payload: { url: 'https://x/a.jpg' } }] } })[0].type).toBe('IMAGE');
        expect(
            attachmentsFromRawPayload('z9', { event_name: 'user_send_audio', message: { attachments: [{ type: 'audio', payload: { url: 'https://x/a.aac' } }] } })[0].type,
        ).toBe('AUDIO');
        expect(attachmentsFromRawPayload('p9', { msgType: 'chat.photo', content: { href: 'https://x/p.jpg' } })[0].type).toBe('IMAGE');
        expect(attachmentsFromRawPayload('t', { text: 'hi' })).toEqual([]);
    });

    it('giữ nguyên danh sách adapter đã chuẩn hóa', () => {
        const normalized = [{ id: 'a', type: 'IMAGE', url: 'https://x/a.jpg' }];
        expect(attachmentsFromRawPayload('x', { attachments: normalized })).toBe(normalized);
    });
});

describe('định dạng & tóm tắt', () => {
    it('formatDuration / formatBytes', () => {
        expect(formatDuration(75)).toBe('1:15');
        expect(formatDuration(7000)).toBe('0:07');
        expect(formatDuration('x')).toBeUndefined();
        expect(formatBytes(1536)).toBe('1.5 KB');
    });

    it('summarizeAttachments', () => {
        expect(summarizeAttachments([])).toBeNull();
        expect(summarizeAttachments(normalizeFacebookAttachments('m', [{ type: 'image', payload: { url: 'u1' } }, { type: 'image', payload: { url: 'u2' } }]))).toBe('[Hình ảnh] (+1)');
        expect(summarizeAttachments(normalizeFacebookAttachments('m', [{ type: 'audio', payload: { url: 'u' } }]))).toBe('[Tin nhắn thoại]');
    });
});
