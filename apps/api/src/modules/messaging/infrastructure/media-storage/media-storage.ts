import { createHash, createHmac } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { guessMimeType } from '../../domain/media/attachment-normalizer.js';

/**
 * Nơi lưu bản sao media (ảnh / voice) — tách khỏi Postgres để DB và bản backup không phình.
 * - `s3`: mọi dịch vụ tương thích S3 (Cloudflare R2, MinIO, AWS S3, Backblaze B2). Ký SigV4 trực tiếp, không cần SDK.
 * - `local`: thư mục trên đĩa (dev / máy chủ đơn).
 * - `none`: tắt lưu trữ, chỉ giữ link gốc của kênh.
 */
export const MEDIA_STORAGE = Symbol('MEDIA_STORAGE');

export interface StoredMediaObject {
    body: Readable;
    contentType?: string;
    contentLength?: number;
}

export interface MediaStorage {
    readonly driver: 's3' | 'local' | 'none';
    readonly enabled: boolean;
    put(key: string, data: Buffer, contentType: string): Promise<void>;
    get(key: string): Promise<StoredMediaObject | null>;
    delete(key: string): Promise<void>;
}

/** Khóa chỉ gồm ký tự an toàn, không có ".." (chặn path traversal ở driver local) */
export function assertSafeKey(key: string): void {
    if (!/^[A-Za-z0-9_\-./]+$/.test(key) || key.includes('..') || key.startsWith('/')) {
        throw new Error(`Khóa media không hợp lệ: ${key}`);
    }
}

export class DisabledMediaStorage implements MediaStorage {
    readonly driver = 'none' as const;
    readonly enabled = false;
    async put(): Promise<void> {
        throw new Error('Lưu trữ media đang tắt (MEDIA_STORAGE_DRIVER=none).');
    }
    async get(): Promise<StoredMediaObject | null> {
        return null;
    }
    async delete(): Promise<void> {}
}

export class LocalMediaStorage implements MediaStorage {
    readonly driver = 'local' as const;
    readonly enabled = true;

    constructor(private readonly rootDir: string) {}

    private resolve(key: string): string {
        assertSafeKey(key);
        const full = path.resolve(this.rootDir, key);
        if (!full.startsWith(path.resolve(this.rootDir) + path.sep)) throw new Error('Khóa media nằm ngoài thư mục lưu trữ.');
        return full;
    }

    async put(key: string, data: Buffer, _contentType?: string): Promise<void> {
        const full = this.resolve(key);
        await mkdir(path.dirname(full), { recursive: true });
        await writeFile(full, data);
    }

    async get(key: string): Promise<StoredMediaObject | null> {
        const full = this.resolve(key);
        try {
            const info = await stat(full);
            return { body: createReadStream(full), contentLength: info.size, contentType: guessMimeType(key) };
        } catch {
            return null;
        }
    }

    async delete(key: string): Promise<void> {
        await unlink(this.resolve(key)).catch(() => undefined);
    }
}

export interface S3MediaStorageOptions {
    endpoint: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    /** R2 / MinIO cần path-style: https://endpoint/bucket/key */
    forcePathStyle?: boolean;
}

const sha256Hex = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
const hmac = (key: Buffer | string, data: string) => createHmac('sha256', key).update(data).digest();
/** Mã hóa từng đoạn đường dẫn theo RFC 3986 như S3 yêu cầu */
const encodeKey = (key: string) =>
    key
        .split('/')
        .map((seg) => encodeURIComponent(seg).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`))
        .join('/');

export class S3MediaStorage implements MediaStorage {
    readonly driver = 's3' as const;
    readonly enabled = true;

    constructor(
        private readonly opts: S3MediaStorageOptions,
        private readonly fetchImpl: typeof fetch = fetch,
    ) {}

    private objectUrl(key: string): URL {
        assertSafeKey(key);
        const base = new URL(this.opts.endpoint);
        if (this.opts.forcePathStyle !== false) {
            base.pathname = `${base.pathname.replace(/\/$/, '')}/${this.opts.bucket}/${encodeKey(key)}`;
        } else {
            base.hostname = `${this.opts.bucket}.${base.hostname}`;
            base.pathname = `/${encodeKey(key)}`;
        }
        return base;
    }

    /** Chữ ký AWS Signature Version 4 cho một request không có query string */
    signHeaders(
        method: string,
        url: URL,
        payloadHash: string,
        extra: Record<string, string> = {},
        now = new Date(),
    ): Record<string, string> {
        const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
        const dateStamp = amzDate.slice(0, 8);
        const headers: Record<string, string> = {
            host: url.host,
            'x-amz-content-sha256': payloadHash,
            'x-amz-date': amzDate,
            ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k.toLowerCase(), v])),
        };
        const signedHeaders = Object.keys(headers).sort().join(';');
        const canonicalHeaders = Object.keys(headers)
            .sort()
            .map((k) => `${k}:${headers[k].trim()}\n`)
            .join('');
        const canonicalRequest = [method, url.pathname, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
        const scope = `${dateStamp}/${this.opts.region}/s3/aws4_request`;
        const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256Hex(canonicalRequest)].join('\n');
        const kDate = hmac(`AWS4${this.opts.secretAccessKey}`, dateStamp);
        const kSigning = hmac(hmac(hmac(kDate, this.opts.region), 's3'), 'aws4_request');
        const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex');
        const { host: _host, ...rest } = headers;
        return {
            ...rest,
            Authorization: `AWS4-HMAC-SHA256 Credential=${this.opts.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
        };
    }

    async put(key: string, data: Buffer, contentType: string): Promise<void> {
        const url = this.objectUrl(key);
        const headers = this.signHeaders('PUT', url, sha256Hex(data), { 'content-type': contentType });
        const res = await this.fetchImpl(url, { method: 'PUT', headers, body: new Uint8Array(data) });
        if (!res.ok) throw new Error(`S3 PUT ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
    }

    async get(key: string): Promise<StoredMediaObject | null> {
        const url = this.objectUrl(key);
        const headers = this.signHeaders('GET', url, 'UNSIGNED-PAYLOAD');
        const res = await this.fetchImpl(url, { method: 'GET', headers });
        if (res.status === 404) return null;
        if (!res.ok || !res.body) throw new Error(`S3 GET ${res.status}`);
        const length = Number(res.headers.get('content-length'));
        return {
            body: Readable.fromWeb(res.body as unknown as WebReadableStream),
            contentType: res.headers.get('content-type') ?? undefined,
            contentLength: Number.isFinite(length) ? length : undefined,
        };
    }

    async delete(key: string): Promise<void> {
        const url = this.objectUrl(key);
        const headers = this.signHeaders('DELETE', url, sha256Hex(''));
        const res = await this.fetchImpl(url, { method: 'DELETE', headers });
        if (!res.ok && res.status !== 404) throw new Error(`S3 DELETE ${res.status}`);
    }
}

/** Đọc cấu hình từ biến môi trường. Mặc định: `local` ngoài production, `none` trong production. */
export function createMediaStorageFromEnv(env: Record<string, string | undefined> = process.env): MediaStorage {
    const driver = (env.MEDIA_STORAGE_DRIVER || (env.NODE_ENV === 'production' ? 'none' : 'local')).toLowerCase();
    if (driver === 's3') {
        const required = ['MEDIA_S3_ENDPOINT', 'MEDIA_S3_BUCKET', 'MEDIA_S3_ACCESS_KEY_ID', 'MEDIA_S3_SECRET_ACCESS_KEY'];
        const missing = required.filter((k) => !env[k]);
        if (missing.length > 0) throw new Error(`MEDIA_STORAGE_DRIVER=s3 nhưng thiếu: ${missing.join(', ')}`);
        return new S3MediaStorage({
            endpoint: env.MEDIA_S3_ENDPOINT!,
            region: env.MEDIA_S3_REGION || 'auto',
            bucket: env.MEDIA_S3_BUCKET!,
            accessKeyId: env.MEDIA_S3_ACCESS_KEY_ID!,
            secretAccessKey: env.MEDIA_S3_SECRET_ACCESS_KEY!,
            forcePathStyle: env.MEDIA_S3_FORCE_PATH_STYLE !== 'false',
        });
    }
    if (driver === 'local') {
        return new LocalMediaStorage(path.resolve(env.MEDIA_STORAGE_DIR || 'storage/media'));
    }
    return new DisabledMediaStorage();
}
