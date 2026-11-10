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
import { Readable } from "node:stream";

@SkipCsrf()
@Controller('messaging/media-proxy')
export class MediaProxyController {
    private readonly logger = new Logger(MediaProxyController.name);

    /**
     * Proxy stream đa phương tiện on-the-fly (Ảnh, File, Sticker) từ Zalo/Meta CDN.
     * Nguyên tắc Zero-Storage: Tuyệt đối không ghi đĩa, không ghi DB.
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

        let targetUrl: URL;
        try {
            targetUrl = new URL(rawUrl);
        } catch {
            throw new BadRequestException('URL không hợp lệ.');
        }

        if (!['http:', 'https:'].includes(targetUrl.protocol)) {
            throw new BadRequestException('Chỉ hỗ trợ giao thức HTTP/HTTPS.');
        }

        // Phòng chống SSRF: Chặn truy vấn tới IP nội bộ / private subnet
        const hostname = targetUrl.hostname.toLowerCase();
        if (
            hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname === '0.0.0.0' ||
            hostname.startsWith('192.168.') ||
            hostname.startsWith('10.') ||
            hostname.startsWith('172.16.') ||
            hostname.startsWith('169.254.')
        ) {
            throw new BadRequestException('Không được phép truy cập địa chỉ IP nội bộ.');
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

            const response = await fetch(targetUrl.toString(), {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': '*/*',
                },
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                this.logger.warn(`Media upstream trả về mã lỗi ${response.status} cho URL: ${targetUrl}`);
                res.status(response.status === 404 ? HttpStatus.NOT_FOUND : HttpStatus.BAD_GATEWAY);
                res.send({
                    statusCode: response.status,
                    message: 'Không thể tải tệp từ máy chủ gốc của mạng xã hội (tệp có thể đã hết hạn hoặc bị xóa).',
                });
                return;
            }

            const contentType = response.headers.get('content-type') || 'application/octet-stream';
            const contentLength = response.headers.get('content-length');

            res.header('Content-Type', contentType);
            res.header('Cache-Control', 'public, max-age=86400, s-maxage=86400');
            res.header('Access-Control-Allow-Origin', '*');

            const filename = customFilename || targetUrl.pathname.split('/').pop() || 'attachment';
            if (customFilename) {
                res.header('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
            }

            // Đọc trực tiếp dữ liệu nhị phân vào buffer trong bộ nhớ (Zero-Storage: không ghi đĩa, không ghi DB)
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            res.header('Content-Length', buffer.length);
            return res.send(buffer);
        } catch (err) {
            const error = err as Error;
            this.logger.error(`Lỗi khi stream media proxy từ ${targetUrl.toString()}: ${error.message}`);
            res.status(HttpStatus.BAD_GATEWAY).send({
                statusCode: HttpStatus.BAD_GATEWAY,
                message: `Lỗi kết nối tải đa phương tiện: ${error.message}`,
            });
        }
    }
}
