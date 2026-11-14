import { describe, it, expect, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { LocalMediaStorage, S3MediaStorage, assertSafeKey, createMediaStorageFromEnv } from './media-storage.js';

async function readAll(stream: NodeJS.ReadableStream): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const c of stream) chunks.push(Buffer.from(c as Buffer));
    return Buffer.concat(chunks).toString();
}

describe('assertSafeKey', () => {
    it.each(['../etc/passwd', '/abs/key', 'a/../../b', 'có dấu.jpg'])('từ chối "%s"', (key) => {
        expect(() => assertSafeKey(key)).toThrow();
    });
    it('chấp nhận khóa chuẩn', () => {
        expect(() => assertSafeKey('ws-1/2026/11/msg-uuid/0.jpg')).not.toThrow();
    });
});

describe('LocalMediaStorage', () => {
    it('ghi, đọc, xóa tệp trong thư mục gốc', async () => {
        const dir = await mkdtemp(path.join(os.tmpdir(), 'media-'));
        try {
            const storage = new LocalMediaStorage(dir);
            await storage.put('ws/2026/11/m/0.jpg', Buffer.from('anh'), 'image/jpeg');
            const obj = await storage.get('ws/2026/11/m/0.jpg');
            expect(obj).toMatchObject({ contentType: 'image/jpeg', contentLength: 3 });
            expect(await readAll(obj!.body)).toBe('anh');
            await storage.delete('ws/2026/11/m/0.jpg');
            expect(await storage.get('ws/2026/11/m/0.jpg')).toBeNull();
        } finally {
            await rm(dir, { recursive: true, force: true });
        }
    });
});

describe('S3MediaStorage', () => {
    const opts = {
        endpoint: 'https://acc.r2.cloudflarestorage.com',
        region: 'auto',
        bucket: 'crm-media',
        accessKeyId: 'AKIDEXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY',
    };

    it('PUT tới URL path-style kèm chữ ký SigV4', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 200 }));
        const storage = new S3MediaStorage(opts, fetchMock as unknown as typeof fetch);
        await storage.put('ws/2026/11/m/0.jpg', Buffer.from('abc'), 'image/jpeg');

        const [url, init] = fetchMock.mock.calls[0];
        expect(String(url)).toBe('https://acc.r2.cloudflarestorage.com/crm-media/ws/2026/11/m/0.jpg');
        expect(init.method).toBe('PUT');
        expect(init.headers['x-amz-content-sha256']).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
        expect(init.headers.Authorization).toMatch(
            /^AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE\/\d{8}\/auto\/s3\/aws4_request, SignedHeaders=content-type;host;x-amz-content-sha256;x-amz-date, Signature=[0-9a-f]{64}$/,
        );
    });

    it('chữ ký ổn định với cùng thời điểm và thay đổi khi khóa bí mật khác', () => {
        const at = new Date('2026-11-13T00:00:00Z');
        const url = new URL('https://acc.r2.cloudflarestorage.com/crm-media/a.jpg');
        const a = new S3MediaStorage(opts).signHeaders('GET', url, 'UNSIGNED-PAYLOAD', {}, at);
        const b = new S3MediaStorage(opts).signHeaders('GET', url, 'UNSIGNED-PAYLOAD', {}, at);
        const c = new S3MediaStorage({ ...opts, secretAccessKey: 'khac' }).signHeaders('GET', url, 'UNSIGNED-PAYLOAD', {}, at);
        expect(a.Authorization).toBe(b.Authorization);
        expect(a.Authorization).not.toBe(c.Authorization);
        expect(a['x-amz-date']).toBe('20261113T000000Z');
    });

    it('GET trả null khi 404', async () => {
        const storage = new S3MediaStorage(opts, vi.fn().mockResolvedValue(new Response('', { status: 404 })) as unknown as typeof fetch);
        expect(await storage.get('x.jpg')).toBeNull();
    });
});

describe('createMediaStorageFromEnv', () => {
    it('mặc định local ngoài production, none trong production', () => {
        expect(createMediaStorageFromEnv({ NODE_ENV: 'development' }).driver).toBe('local');
        expect(createMediaStorageFromEnv({ NODE_ENV: 'production' }).driver).toBe('none');
    });
    it('s3 thiếu cấu hình thì báo lỗi rõ ràng', () => {
        expect(() => createMediaStorageFromEnv({ MEDIA_STORAGE_DRIVER: 's3', MEDIA_S3_BUCKET: 'b' })).toThrow(/MEDIA_S3_ENDPOINT/);
    });
});
