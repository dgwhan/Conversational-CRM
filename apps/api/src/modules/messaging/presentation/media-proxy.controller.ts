import {
    BadRequestException,
    Controller,
    Get,
    HttpStatus,
    Logger,
    Query,
    Res,
} from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { SkipCsrf } from "../../../common/decorators/skip-csrf.decorator.js";
import {
    SafeFetchError,
    createSizeLimiter,
    safeGet,
} from "../../../common/security/safe-fetch.js";

/** Dung lượng tối đa của một tệp proxy (mặc định 25MB, chỉnh bằng MEDIA_PROXY_MAX_BYTES) */
const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;

/** Chỉ các kiểu nội dung này được hiển thị inline; còn lại luôn ép tải về (chống XSS qua HTML/SVG) */
const INLINE_SAFE_TYPE = /^(image\/(png|jpe?g|gif|webp|avif|bmp)|audio\/[\w.+-]+|video\/[\w.+-]+|application\/pdf)$/i;

function getMaxBytes(): number {
    const parsed = Number(process.env.MEDIA_PROXY_MAX_BYTES);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_BYTES;
}

function getAllowedHostSuffixes(): string[] | undefined {
    const raw = process.env.MEDIA_PROXY_ALLOWED_HOSTS;
    if (!raw) return undefined;
    const list = raw.split(',').map((s) => s.trim()).filter(Boolean);
    return list.length > 0 ? list : undefined;
}

/**
 * Endpoint này yêu cầu đăng nhập (JwtAuthGuard toàn cục). Frontend phải gọi bằng fetch kèm
 * Authorization rồi dùng blob URL — thẻ <img src> thuần không gửi được header xác thực.
 */
@SkipCsrf()
@Controller('messaging/media-proxy')
export class MediaProxyController {
    private readonly logger = new Logger(MediaProxyController.name);

    /**
     * Proxy stream đa phương tiện on-the-fly (Ảnh, File, Sticker) từ Zalo/Meta CDN.
     * Nguyên tắc Zero-Storage: không ghi đĩa, không ghi DB, và không nạp cả tệp vào RAM (stream + giới hạn dung lượng).
     */
    @Get()
    async proxyMedia(
        @Query('url') rawUrl: string,
        @Query('filename') customFilename: string | undefined,
        @Res() res: FastifyReply,
    ): Promise<void> {
        if (!rawUrl || typeof rawUrl !== 'string') {
            throw new BadRequestException('Tham số url là bắt buộc.');
        }
        if (rawUrl.length > 4096) {
            throw new BadRequestException('URL quá dài.');
        }

        let targetUrl: URL;
        try {
            targetUrl = new URL(rawUrl);
        } catch {
            throw new BadRequestException('URL không hợp lệ.');
        }

        const maxBytes = getMaxBytes();

        try {
            const upstream = await safeGet(targetUrl, {
                allowedHostSuffixes: getAllowedHostSuffixes(),
            });

            if (upstream.statusCode < 200 || upstream.statusCode >= 300) {
                upstream.stream.resume();
                this.logger.warn(`Media upstream trả về mã lỗi ${upstream.statusCode} cho host: ${upstream.finalUrl.hostname}`);
                res.status(upstream.statusCode === 404 ? HttpStatus.NOT_FOUND : HttpStatus.BAD_GATEWAY);
                res.send({
                    statusCode: upstream.statusCode,
                    message: 'Không thể tải tệp từ máy chủ gốc của mạng xã hội (tệp có thể đã hết hạn hoặc bị xóa).',
                });
                return;
            }

            const declaredLength = Number(upstream.headers['content-length']);
            if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
                upstream.stream.destroy();
                res.status(HttpStatus.PAYLOAD_TOO_LARGE).send({
                    statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
                    message: 'Tệp vượt quá dung lượng cho phép.',
                });
                return;
            }

            const contentType = String(upstream.headers['content-type'] || 'application/octet-stream');
            const baseType = contentType.split(';')[0].trim();
            const inlineSafe = INLINE_SAFE_TYPE.test(baseType);

            const filename = (customFilename || upstream.finalUrl.pathname.split('/').pop() || 'attachment')
                .replace(/[\r\n"\\]/g, '_')
                .slice(0, 200);

            res.header('Content-Type', inlineSafe ? contentType : 'application/octet-stream');
            res.header('X-Content-Type-Options', 'nosniff');
            res.header('Content-Security-Policy', "default-src 'none'; sandbox");
            res.header('Cross-Origin-Resource-Policy', 'same-site');
            // private: không cho cache dùng chung vì endpoint cần xác thực
            res.header('Cache-Control', 'private, max-age=3600');
            res.header(
                'Content-Disposition',
                `${inlineSafe ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(filename)}`,
            );
            if (Number.isFinite(declaredLength) && declaredLength >= 0) {
                res.header('Content-Length', declaredLength);
            }

            const limited = upstream.stream.pipe(createSizeLimiter(maxBytes));
            upstream.stream.on('error', (e) => limited.destroy(e));
            limited.on('error', (e) => {
                this.logger.warn(`Media proxy dừng luồng: ${e.message}`);
                upstream.stream.destroy();
            });
            res.raw.on('close', () => upstream.stream.destroy());

            return res.send(limited);
        } catch (err) {
            const error = err as Error;
            this.logger.warn(`Lỗi media proxy (${targetUrl.hostname}): ${error.message}`);

            if (error instanceof SafeFetchError) {
                const status =
                    error.code === 'INVALID_URL' || error.code === 'BLOCKED'
                        ? HttpStatus.BAD_REQUEST
                        : error.code === 'TIMEOUT'
                          ? HttpStatus.GATEWAY_TIMEOUT
                          : HttpStatus.BAD_GATEWAY;
                res.status(status).send({ statusCode: status, message: error.message });
                return;
            }

            res.status(HttpStatus.BAD_GATEWAY).send({
                statusCode: HttpStatus.BAD_GATEWAY,
                message: 'Lỗi kết nối tải đa phương tiện.',
            });
        }
    }
}
