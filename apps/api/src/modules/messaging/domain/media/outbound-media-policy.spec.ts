import { describe, it, expect } from 'vitest';
import { assertSendable, detectFileType, safeFileName, OutboundMediaRuleError } from './outbound-media-policy.js';

const bytes = (...b: number[]) => Buffer.from([...b, ...Array(32).fill(0)]);
const text = (s: string) => Buffer.from(s.padEnd(64, ' '));

describe('detectFileType', () => {
    it.each([
        [bytes(0xff, 0xd8, 0xff, 0xe0), 'a.png', 'image/jpeg'],
        [bytes(0x89, 0x50, 0x4e, 0x47), 'a.jpg', 'image/png'],
        [text('GIF89a'), 'a.gif', 'image/gif'],
        [Buffer.concat([text('RIFF').subarray(0, 4), Buffer.alloc(4), Buffer.from('WEBPVP8 '), Buffer.alloc(20)]), 'a.webp', 'image/webp'],
        [text('%PDF-1.7'), 'hoso.pdf', 'application/pdf'],
        [bytes(0x50, 0x4b, 0x03, 0x04), 'bang-diem.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        [bytes(0x50, 0x4b, 0x03, 0x04), 'goi.zip', 'application/zip'],
        [bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1), 'cu.doc', 'application/msword'],
        [text('ID3'), 'nhac.mp3', 'audio/mpeg'],
        [text('OggS'), 'voice.ogg', 'audio/ogg'],
        [Buffer.concat([Buffer.alloc(4), Buffer.from('ftypM4A '), Buffer.alloc(20)]), 'voice.m4a', 'audio/mp4'],
        [Buffer.concat([Buffer.alloc(4), Buffer.from('ftypisom'), Buffer.alloc(20)]), 'clip.mp4', 'video/mp4'],
        [text('Họ tên,SĐT\nAn,0912'), 'ds.csv', 'text/csv'],
    ])('nhận dạng theo nội dung chứ không theo đuôi (%#)', (buf, name, mime) => {
        expect(detectFileType(buf, name)?.mimeType).toBe(mime);
    });

    it('chặn HTML / SVG / tệp thực thi kể cả khi đổi đuôi', () => {
        expect(detectFileType(text('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), 'anh.png')).toBeNull();
        expect(detectFileType(text('<!DOCTYPE html><html>'), 'ghi-chu.txt')).toBeNull();
        expect(detectFileType(bytes(0x4d, 0x5a, 0x90, 0x00), 'setup.pdf')).toBeNull();
    });
});

describe('assertSendable', () => {
    it('Zalo OA không gửi được voice / video và chỉ nhận PDF/Word', () => {
        expect(() => assertSendable('ZALO_OA', 'AUDIO', 'audio/mp4', 1000)).toThrow(/không hỗ trợ gửi tin nhắn thoại/);
        expect(() => assertSendable('ZALO_OA', 'FILE', 'application/zip', 1000)).toThrow(OutboundMediaRuleError);
        expect(() => assertSendable('ZALO_OA', 'FILE', 'application/pdf', 6 * 1024 * 1024)).toThrow(/tối đa 5MB/);
        expect(() => assertSendable('ZALO_OA', 'FILE', 'application/pdf', 1024)).not.toThrow();
    });

    it('Facebook và Zalo cá nhân nhận voice', () => {
        expect(() => assertSendable('FACEBOOK', 'AUDIO', 'audio/webm', 50_000)).not.toThrow();
        expect(() => assertSendable('ZALO_PERSONAL', 'AUDIO', 'audio/mp4', 50_000)).not.toThrow();
    });
});

describe('safeFileName', () => {
    it('loại ký tự nguy hiểm và đặt đúng đuôi thật', () => {
        expect(safeFileName('../../etc/passwd.png', 'jpg')).toBe('.._.._etc_passwd.jpg');
        expect(safeFileName('Brochure "2026".PDF', 'pdf')).toBe('Brochure _2026_.pdf');
        expect(safeFileName('', 'pdf')).toBe('tep.pdf');
    });
});
