import { Logger } from '@nestjs/common';

export interface ImageOptimizeOptions {
    /** Cạnh dài tối đa sau khi thu nhỏ (px) */
    maxDimension: number;
    /** Chất lượng WebP 1–100 */
    quality: number;
}

export interface OptimizedImage {
    buffer: Buffer;
    contentType: string;
    /** false khi giữ nguyên tệp gốc (không phải ảnh, lỗi giải mã, hoặc WebP không nhỏ hơn) */
    converted: boolean;
}

const logger = new Logger('ImageOptimizer');
const CONVERTIBLE = /^image\/(jpeg|jpg|png|webp|gif|bmp|tiff|avif|heic|heif)$/i;

/** Phần API của sharp đang dùng (khai báo tối thiểu để không phụ thuộc kiểu ESM/CJS của gói) */
interface SharpPipeline {
    rotate(): SharpPipeline;
    resize(opts: { width: number; height: number; fit: 'inside'; withoutEnlargement: boolean }): SharpPipeline;
    webp(opts: { quality: number; effort: number }): SharpPipeline;
    toBuffer(): Promise<Buffer>;
}
type SharpModule = (input: Buffer, opts?: { animated?: boolean; limitInputPixels?: number }) => SharpPipeline;
let sharpLoader: Promise<SharpModule | null> | null = null;

/** Nạp sharp lười: thiếu binary trên máy chủ thì vẫn chạy được, chỉ bỏ qua bước nén. */
function loadSharp(): Promise<SharpModule | null> {
    sharpLoader ??= import('sharp')
        .then((m) => ((m as { default?: unknown }).default ?? m) as SharpModule)
        .catch((err: Error) => {
            logger.warn(`Không nạp được sharp, lưu ảnh nguyên bản: ${err.message}`);
            return null;
        });
    return sharpLoader;
}

/**
 * Nén ảnh sang WebP trước khi lưu bản sao:
 * - Thu nhỏ để cạnh dài ≤ maxDimension (không phóng to ảnh nhỏ), xoay theo EXIF rồi bỏ metadata (GPS, máy chụp).
 * - GIF động giữ chuyển động (WebP animated).
 * - Nếu WebP không nhỏ hơn bản gốc thì giữ bản gốc.
 */
export async function optimizeImage(input: Buffer, contentType: string, opts: ImageOptimizeOptions): Promise<OptimizedImage> {
    const original: OptimizedImage = { buffer: input, contentType, converted: false };
    if (!CONVERTIBLE.test(contentType.split(';')[0].trim())) return original;

    const sharp = await loadSharp();
    if (!sharp) return original;

    try {
        const animated = /gif|webp/i.test(contentType);
        const output = await sharp(input, { animated, limitInputPixels: 100_000_000 })
            .rotate()
            .resize({ width: opts.maxDimension, height: opts.maxDimension, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: opts.quality, effort: 4 })
            .toBuffer();
        if (output.length >= input.length) return original;
        return { buffer: output, contentType: 'image/webp', converted: true };
    } catch (err) {
        logger.warn(`Không nén được ảnh (${contentType}), lưu nguyên bản: ${(err as Error).message}`);
        return original;
    }
}

export interface PreparedOutboundImage {
    buffer: Buffer;
    mimeType: string;
    extension: string;
    width?: number;
    height?: number;
}

/**
 * Chuẩn hóa ảnh tư vấn viên tải lên trước khi gửi cho khách:
 * - JPEG (mọi kênh đều nhận), cạnh dài ≤ 2048px, xoay theo EXIF, bỏ metadata (vị trí GPS trong ảnh chụp điện thoại).
 * - Ảnh trong suốt được trải nền trắng. GIF giữ nguyên để không mất chuyển động.
 */
export async function prepareOutboundImage(input: Buffer, mimeType: string): Promise<PreparedOutboundImage> {
    const sharp = await loadSharp();
    if (!sharp || mimeType === 'image/gif') {
        return { buffer: input, mimeType, extension: mimeType === 'image/gif' ? 'gif' : mimeType.split('/')[1] ?? 'jpg' };
    }
    const pipeline = sharp(input, { limitInputPixels: 100_000_000 }) as unknown as SharpOutboundPipeline;
    const { data, info } = await pipeline
        .rotate()
        .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer({ resolveWithObject: true });
    return { buffer: data, mimeType: 'image/jpeg', extension: 'jpg', width: info.width, height: info.height };
}

/** Nén JPEG đến khi ≤ maxBytes (giảm chất lượng trước, sau đó giảm kích thước) — dùng cho Zalo OA (≤ 1MB). */
export async function shrinkJpeg(input: Buffer, maxBytes: number): Promise<Buffer> {
    if (input.length <= maxBytes) return input;
    const sharp = await loadSharp();
    if (!sharp) return input;
    const steps: Array<{ size: number; quality: number }> = [
        { size: 2048, quality: 75 },
        { size: 1600, quality: 75 },
        { size: 1280, quality: 70 },
        { size: 1024, quality: 65 },
        { size: 800, quality: 60 },
    ];
    let best = input;
    for (const step of steps) {
        const out = await (sharp(input) as unknown as SharpOutboundPipeline)
            .resize({ width: step.size, height: step.size, fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: step.quality, mozjpeg: true })
            .toBuffer({ resolveWithObject: true });
        best = out.data;
        if (best.length <= maxBytes) break;
    }
    return best;
}

interface SharpOutboundPipeline {
    rotate(): SharpOutboundPipeline;
    resize(opts: { width: number; height: number; fit: 'inside'; withoutEnlargement: boolean }): SharpOutboundPipeline;
    flatten(opts: { background: string }): SharpOutboundPipeline;
    jpeg(opts: { quality: number; mozjpeg: boolean }): SharpOutboundPipeline;
    toBuffer(opts: { resolveWithObject: true }): Promise<{ data: Buffer; info: { width: number; height: number } }>;
}
