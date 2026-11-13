import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { optimizeImage } from './image-optimizer.js';

const opts = { maxDimension: 1600, quality: 80 };

/** Ảnh PNG nhiễu Gauss (khó nén không mất dữ liệu) để mô phỏng ảnh chụp thật */
async function noisyPng(width: number, height: number): Promise<Buffer> {
    return sharp({ create: { width, height, channels: 3, background: '#808080', noise: { type: 'gaussian', mean: 128, sigma: 30 } } })
        .png()
        .toBuffer();
}

describe('optimizeImage', () => {
    it('chuyển ảnh lớn sang WebP, thu nhỏ về cạnh dài 1600px và giảm dung lượng', async () => {
        const input = await noisyPng(3000, 2000);
        const out = await optimizeImage(input, 'image/png', opts);

        expect(out.converted).toBe(true);
        expect(out.contentType).toBe('image/webp');
        expect(out.buffer.length).toBeLessThan(input.length);
        const meta = await sharp(out.buffer).metadata();
        expect(meta.format).toBe('webp');
        expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBe(1600);
    }, 20000);

    it('giữ bản gốc khi WebP không nhỏ hơn (ảnh đồ họa phẳng đã nén tốt)', async () => {
        const raw = Buffer.alloc(600 * 400 * 3);
        for (let i = 0; i < raw.length; i++) raw[i] = (i * 2654435761) >>> 24;
        const input = await sharp(raw, { raw: { width: 600, height: 400, channels: 3 } }).png().toBuffer();
        const out = await optimizeImage(input, 'image/png', opts);
        if (!out.converted) expect(out.buffer).toBe(input);
        else expect(out.buffer.length).toBeLessThan(input.length);
    });

    it('không phóng to ảnh nhỏ', async () => {
        const input = await sharp({ create: { width: 200, height: 100, channels: 3, background: '#3366ff' } }).jpeg({ quality: 100 }).toBuffer();
        const out = await optimizeImage(input, 'image/jpeg', opts);
        const meta = await sharp(out.buffer).metadata();
        expect(meta.width).toBe(200);
    });

    it('giữ nguyên tệp không phải ảnh hoặc ảnh hỏng', async () => {
        const pdf = Buffer.from('%PDF-1.4');
        expect(await optimizeImage(pdf, 'application/pdf', opts)).toEqual({ buffer: pdf, contentType: 'application/pdf', converted: false });

        const broken = Buffer.from('không phải ảnh');
        expect(await optimizeImage(broken, 'image/jpeg', opts)).toMatchObject({ buffer: broken, converted: false });
    });
});
