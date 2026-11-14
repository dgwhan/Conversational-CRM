import {
    BadRequestException,
    Controller,
    ForbiddenException,
    Get,
    HttpCode,
    HttpStatus,
    Injectable,
    Logger,
    Optional,
    Param,
    PipeTransform,
    Post,
    Req,
    Res,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { ReceiveInboundMessage } from "../application/receive-inbound-message.usecase.js";
import { ChannelAdapterRegistry } from "../application/channel-adapter.registry.js";
import { Channel } from "../domain/channel.js";
import { FacebookAdapter } from "../infrastructure/adapters/facebook.adapter.js";
import { SkipCsrf } from "../../../common/decorators/skip-csrf.decorator.js";
import { Public } from "../../../common/decorators/public.decorator.js";
import { SkipRateLimit } from "../../../common/decorators/rate-limit.decorator.js";

/**
 * Pipe chuẩn hóa channel không phân biệt hoa thường (hỗ trợ cả /facebook và /FACEBOOK)
 */
@Injectable()
export class ChannelPipe implements PipeTransform<string, Channel> {
    transform(value: string): Channel {
        const normalized = value ? value.toUpperCase().trim() : '';
        if (normalized === Channel.MANUAL_IMPORT) {
            // MANUAL_IMPORT chỉ còn cho dữ liệu cũ (chức năng import tin nhắn đã gỡ), không nhận từ webhook công khai
            throw new BadRequestException(`Validation failed: channel "${value}" is not available via webhook`);
        }
        if (normalized && Object.values(Channel).includes(normalized as Channel)) {
            return normalized as Channel;
        }
        throw new BadRequestException(`Validation failed: unsupported channel "${value}"`);
    }
}

// Webhook từ Meta / Zalo: không có Access Token, được xác thực bằng chữ ký HMAC trong ReceiveInboundMessage.
// Không áp rate limit theo IP: Meta/Zalo gửi dồn từ một dải IP nhỏ, chặn 429 sẽ làm rơi tin.
// Bảo vệ thực sự là chữ ký HMAC (request giả bị trả 401 trước khi đụng tới DB).
@Public()
@SkipRateLimit()
@SkipCsrf()
@Controller('webhook')
export class WebhookController {
    private readonly logger = new Logger(WebhookController.name);

    constructor(
        private readonly receive: ReceiveInboundMessage,
        @Optional() private readonly adapters?: ChannelAdapterRegistry,
    ) {}

    /**
     * Xác thực Webhook GET từ Meta Facebook (Hub challenge handshake)
     * Meta gửi các query param: hub.mode=subscribe, hub.verify_token, hub.challenge
     * - Khớp verify token: trả về hub.challenge dạng plain text, HTTP 200
     * - Sai verify token hoặc mode: trả về HTTP 403 Forbidden
     */
    @Get(':channel')
    @HttpCode(HttpStatus.OK)
    async verify(
        @Param('channel', new ChannelPipe()) channel: Channel,
        @Req() req: FastifyRequest,
        @Res({ passthrough: true }) res: FastifyReply,
    ): Promise<string | { status: string }> {
        if (channel === Channel.FACEBOOK) {
            const adapter = this.adapters?.get(Channel.FACEBOOK);
            if (adapter && 'verifySubscription' in adapter && typeof (adapter as FacebookAdapter).verifySubscription === 'function') {
                const query = (req.query ?? {}) as Record<string, unknown>;
                const challenge = (adapter as FacebookAdapter).verifySubscription(query);

                if (challenge !== null) {
                    if (res && typeof res.header === 'function') {
                        res.header('content-type', 'text/plain');
                    }
                    return challenge;
                }
                throw new ForbiddenException('Invalid verify token or subscription mode');
            }
        }

        return { status: 'ok' };
    }

    /**
     * Nhận sự kiện Webhook POST từ Meta / Zalo
     * - Kiểm tra chữ ký X-Hub-Signature-256 (HMAC SHA-256). Nếu sai chữ ký -> trả 401 Unauthorized.
     * - Trong request chỉ: xác thực chữ ký, lưu tin (chống trùng) và đưa job vào hàng đợi. Phần xử lý nặng
     *   chạy ở worker nên phản hồi nhanh (mục tiêu < 500 ms).
     * - Nếu lưu tin thất bại thì trả lỗi (5xx) để nền tảng GỬI LẠI, thay vì trả 200 rồi làm mất tin.
     */
    @Post(':channel')
    @HttpCode(HttpStatus.OK)
    async handle(
        @Param('channel', new ChannelPipe()) channel: Channel,
        @Req() req: FastifyRequest & { rawBody?: Buffer },
    ) {
        if (!req.rawBody) {
            throw new BadRequestException('Missing raw body');
        }

        const startedAt = Date.now();
        await this.receive.execute({
            channel,
            rawBody: req.rawBody,
            headers: req.headers,
            query: (req.query ?? {}) as Record<string, unknown>,
        });

        const elapsed = Date.now() - startedAt;
        if (elapsed > 500) {
            this.logger.warn(`Webhook ${channel} took ${elapsed}ms (target < 500ms)`);
        }

        return { status: 'ok' };
    }
}
