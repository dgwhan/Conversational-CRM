import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
    Req,
    Res,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { getRequestIdentity, requireWorkspaceId } from '../../../common/auth/request-identity.js';
import { OutboundMediaService, type MediaAssetContext, type MediaAssetPurpose } from '../application/outbound-media.service.js';
import { UPLOAD_MAX_BYTES } from '../domain/media/outbound-media-policy.js';

type MultipartFile = { filename: string; toBuffer(): Promise<Buffer>; file: { truncated?: boolean } };
type MultipartRequest = FastifyRequest & {
    isMultipart?: () => boolean;
    file?: (opts?: { limits?: { fileSize?: number } }) => Promise<MultipartFile | undefined>;
};

/**
 * Tệp gửi đi trong hội thoại và thư viện tài liệu.
 * - POST /messaging/outbound-media           (multipart "file") → tệp chờ gửi, dùng `id` trong send-message
 * - GET  /messaging/assets/:id/content       → xem trước / tải về (cần đăng nhập)
 * - DELETE /messaging/outbound-media/:id     → bỏ tệp chưa gửi
 * - GET/POST/PATCH/DELETE /messaging/media-library → thư viện tài liệu dùng lại
 */
@Controller('messaging')
export class OutboundMediaController {
    constructor(private readonly media: OutboundMediaService) {}

    @Post('outbound-media')
    async uploadOutbound(@Req() req: MultipartRequest, @Query('kind') kindHint?: string) {
        const file = await this.readFile(req);
        return this.media.upload(this.ctx(req), file, { purpose: 'OUTBOUND', kindHint });
    }

    @Delete('outbound-media/:id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async removeOutbound(@Req() req: unknown, @Param('id', ParseUUIDPipe) id: string) {
        await this.media.remove(this.ctx(req), id);
    }

    @Get('assets/:id/content')
    async content(@Req() req: unknown, @Param('id', ParseUUIDPipe) id: string, @Res() res: FastifyReply) {
        const { object, asset } = await this.media.openContent(this.ctx(req), id);
        const inline = /^(image\/(jpeg|png|gif|webp)|audio\/|video\/|application\/pdf)/.test(asset.mimeType);
        res.header('Content-Type', inline ? asset.mimeType : 'application/octet-stream');
        res.header('X-Content-Type-Options', 'nosniff');
        res.header('Content-Security-Policy', "default-src 'none'; sandbox");
        res.header('Cache-Control', 'private, max-age=86400');
        res.header('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(asset.fileName)}`);
        if (object.contentLength !== undefined) res.header('Content-Length', object.contentLength);
        res.raw.on('close', () => object.body.destroy());
        return res.send(object.body);
    }

    @Get('media-library')
    list(@Req() req: unknown, @Query('search') search?: string) {
        return this.media.listLibrary(this.ctx(req), search);
    }

    @Post('media-library')
    async uploadLibrary(@Req() req: MultipartRequest, @Query('title') title?: string) {
        const file = await this.readFile(req);
        return this.media.upload(this.ctx(req), file, { purpose: 'LIBRARY' as MediaAssetPurpose, title });
    }

    @Patch('media-library/:id')
    rename(@Req() req: unknown, @Param('id', ParseUUIDPipe) id: string, @Body() body: { title?: string }) {
        return this.media.renameLibraryItem(this.ctx(req), id, String(body?.title ?? ''));
    }

    @Delete('media-library/:id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async removeLibrary(@Req() req: unknown, @Param('id', ParseUUIDPipe) id: string) {
        await this.media.remove(this.ctx(req), id);
    }

    private async readFile(req: MultipartRequest): Promise<{ buffer: Buffer; fileName: string }> {
        if (typeof req.isMultipart !== 'function' || !req.isMultipart() || typeof req.file !== 'function') {
            throw new BadRequestException('Yêu cầu phải gửi dạng multipart/form-data với trường "file".');
        }
        const part = await req.file({ limits: { fileSize: UPLOAD_MAX_BYTES } });
        if (!part) throw new BadRequestException('Thiếu tệp tải lên (trường "file").');
        const buffer = await part.toBuffer().catch((err: Error & { code?: string }) => {
            if (err.code === 'FST_REQ_FILE_TOO_LARGE') {
                throw new BadRequestException(`Tệp vượt quá ${Math.round(UPLOAD_MAX_BYTES / 1024 / 1024)}MB.`);
            }
            throw err;
        });
        if (part.file.truncated) throw new BadRequestException(`Tệp vượt quá ${Math.round(UPLOAD_MAX_BYTES / 1024 / 1024)}MB.`);
        return { buffer, fileName: part.filename || 'tep' };
    }

    private ctx(req: unknown): MediaAssetContext {
        const identity = getRequestIdentity(req);
        return { workspaceId: requireWorkspaceId(req), userId: identity.userId, role: identity.role };
    }
}
