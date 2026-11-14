import { Controller, Get, HttpStatus, Logger, NotFoundException, Param, ParseIntPipe, Req, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { SkipCsrf } from '../../../common/decorators/skip-csrf.decorator.js';
import { requireWorkspaceId } from '../../../common/auth/request-identity.js';
import { MediaArchiveService, MediaExpiredError } from '../application/media-archive.service.js';

/** Chỉ các kiểu này được hiển thị inline; còn lại ép tải về (chống XSS qua HTML/SVG) */
const INLINE_SAFE_TYPE = /^(image\/(png|jpe?g|gif|webp|avif|bmp)|audio\/[\w.+-]+|video\/[\w.+-]+|application\/pdf)$/i;

/**
 * Điểm phát media thống nhất cho Inbox: frontend chỉ cần (mã tin, thứ tự tệp), server tự chọn nguồn:
 * bản sao trong object storage → link gốc của kênh → link mới từ Graph API (Facebook).
 * Yêu cầu đăng nhập; chỉ phát media của tin thuộc workspace hiện tại.
 */
@SkipCsrf()
@Controller('messaging/media')
export class MediaController {
    private readonly logger = new Logger(MediaController.name);

    constructor(private readonly media: MediaArchiveService) {}

    @Get(':messageRef/:index')
    async getMedia(
        @Req() req: unknown,
        @Param('messageRef') messageRef: string,
        @Param('index', ParseIntPipe) index: number,
        @Res() res: FastifyReply,
    ): Promise<void> {
        const workspaceId = requireWorkspaceId(req);
        if (!messageRef || messageRef.length > 200 || index < 0 || index > 50) {
            throw new NotFoundException('Không tìm thấy tệp.');
        }

        try {
            const media = await this.media.open(messageRef, index, workspaceId);
            if (!media) throw new NotFoundException('Không tìm thấy tệp.');

            const baseType = media.contentType.split(';')[0].trim();
            const inline = INLINE_SAFE_TYPE.test(baseType);
            const fileName = media.fileName.replace(/[\r\n"\\]/g, '_').slice(0, 200);

            res.header('Content-Type', inline ? media.contentType : 'application/octet-stream');
            res.header('X-Content-Type-Options', 'nosniff');
            res.header('Content-Security-Policy', "default-src 'none'; sandbox");
            res.header('Cross-Origin-Resource-Policy', 'same-site');
            // Bản sao trong storage không đổi theo thời gian → cache lâu hơn link gốc
            res.header('Cache-Control', media.source === 'storage' ? 'private, max-age=86400' : 'private, max-age=3600');
            res.header('X-Media-Source', media.source);
            res.header('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(fileName)}`);
            if (media.contentLength !== undefined) res.header('Content-Length', media.contentLength);

            media.body.on('error', (e) => this.logger.warn(`Dừng luồng media: ${e.message}`));
            res.raw.on('close', () => media.body.destroy());
            return res.send(media.body);
        } catch (err) {
            if (err instanceof MediaExpiredError) {
                res.status(HttpStatus.GONE).send({ statusCode: HttpStatus.GONE, code: 'MEDIA_EXPIRED', message: err.message });
                return;
            }
            throw err;
        }
    }
}
