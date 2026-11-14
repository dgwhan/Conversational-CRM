import { BadRequestException } from '@nestjs/common';
import type { OutboundMediaPayload } from '../../messaging/application/outbound-media.service.js';
import { ZALO_OA_IMAGE_MAX_BYTES } from '../../messaging/domain/media/outbound-media-policy.js';
import { shrinkJpeg } from '../../messaging/infrastructure/media-storage/image-optimizer.js';

/**
 * Gửi tệp đính kèm qua API chính thức của từng kênh.
 * Kết quả trả về cùng dạng với gửi chữ để dispatcher lưu tin chiều đi giống nhau.
 */
export interface AttachmentSendResult {
    externalMessageId: string;
    rawPayload: Record<string, unknown>;
    /** attachment_id Facebook (is_reusable) để lần sau gửi lại tài liệu thư viện không cần tải lên */
    facebookAttachmentId?: string;
}

const FB_TYPE: Record<OutboundMediaPayload['kind'], string> = {
    IMAGE: 'image',
    AUDIO: 'audio',
    VIDEO: 'video',
    FILE: 'file',
};

type FetchLike = typeof fetch;

function graphError(json: { error?: { message?: string; code?: number; error_subcode?: number } }, status: number): string {
    const e = json.error;
    if (e?.code === 10 || e?.error_subcode === 2018278 || e?.error_subcode === 2018028) {
        return 'Ngoài khung 24 giờ của Messenger: Fanpage chỉ gửi được tin cho khách trong 24 giờ kể từ tin cuối của khách.';
    }
    if (e?.code === 190) return 'Access Token của Fanpage đã hết hạn. Vui lòng kết nối lại Fanpage.';
    if (e?.code === 100 && /size|large/i.test(e.message ?? '')) return 'Facebook từ chối tệp vì quá lớn.';
    return e?.message || `HTTP ${status}`;
}

/**
 * Facebook Send API: tải tệp lên kèm tin (multipart `filedata`), không cần URL công khai.
 * Tài liệu thư viện đã có attachment_id thì gửi lại bằng id (nhanh, không tốn băng thông).
 */
export async function sendFacebookAttachment(
    token: string,
    psid: string,
    media: OutboundMediaPayload,
    fetchImpl: FetchLike = fetch,
): Promise<AttachmentSendResult> {
    const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${encodeURIComponent(token)}`;
    const type = FB_TYPE[media.kind];

    const call = async (reuseId?: string) => {
        let res: Response;
        if (reuseId) {
            res = await fetchImpl(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient: { id: psid },
                    messaging_type: 'RESPONSE',
                    message: { attachment: { type, payload: { attachment_id: reuseId } } },
                }),
            });
        } else {
            const form = new FormData();
            form.append('recipient', JSON.stringify({ id: psid }));
            form.append('messaging_type', 'RESPONSE');
            form.append('message', JSON.stringify({ attachment: { type, payload: { is_reusable: true } } }));
            form.append('filedata', new Blob([new Uint8Array(media.buffer)], { type: media.mimeType }), media.fileName);
            res = await fetchImpl(url, { method: 'POST', body: form });
        }
        const json = (await res.json().catch(() => ({}))) as {
            message_id?: string;
            attachment_id?: string;
            error?: { message?: string; code?: number; error_subcode?: number };
        };
        return { res, json };
    };

    let { res, json } = await call(media.facebookAttachmentId);
    // attachment_id cũ có thể đã hết hiệu lực → tải lên lại
    if ((!res.ok || json.error) && media.facebookAttachmentId) ({ res, json } = await call());
    if (!res.ok || json.error) {
        throw new BadRequestException(`Gửi ${media.fileName} qua Facebook thất bại: ${graphError(json, res.status)}`);
    }
    return {
        externalMessageId: json.message_id || `fb_att_${Date.now()}`,
        rawPayload: { ...json, recipient: { id: psid } },
        facebookAttachmentId: json.attachment_id ?? media.facebookAttachmentId,
    };
}

/**
 * Zalo OA: tải tệp lên kho của OA rồi gửi tin tư vấn (CS) tham chiếu tệp.
 * - Ảnh jpg/png ≤ 1MB (tự nén lại nếu lớn hơn) → upload/image → template "media".
 * - GIF ≤ 5MB → upload/gif → template "media" (media_type gif).
 * - PDF / DOC / DOCX ≤ 5MB → upload/file → attachment "file" (token).
 */
export async function sendZaloOaAttachment(
    token: string,
    userId: string,
    media: OutboundMediaPayload,
    fetchImpl: FetchLike = fetch,
): Promise<AttachmentSendResult> {
    if (media.kind === 'AUDIO' || media.kind === 'VIDEO') {
        throw new BadRequestException('Zalo OA không hỗ trợ gửi tin nhắn thoại / video qua API.');
    }

    const isGif = media.mimeType === 'image/gif';
    let buffer = media.buffer;
    if (media.kind === 'IMAGE' && !isGif && buffer.length > ZALO_OA_IMAGE_MAX_BYTES) {
        buffer = await shrinkJpeg(buffer, ZALO_OA_IMAGE_MAX_BYTES);
        if (buffer.length > ZALO_OA_IMAGE_MAX_BYTES) {
            throw new BadRequestException('Ảnh vẫn lớn hơn 1MB sau khi nén; Zalo OA không nhận ảnh này.');
        }
    }

    const endpoint = media.kind === 'FILE' ? 'file' : isGif ? 'gif' : 'image';
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(buffer)], { type: media.kind === 'IMAGE' && !isGif ? 'image/jpeg' : media.mimeType }), media.fileName);
    const upRes = await fetchImpl(`https://openapi.zalo.me/v2.0/oa/upload/${endpoint}`, {
        method: 'POST',
        headers: { access_token: token },
        body: form,
    });
    const up = (await upRes.json().catch(() => ({}))) as { error?: number; message?: string; data?: { attachment_id?: string; token?: string } };
    if (up.error !== 0 || !(up.data?.attachment_id || up.data?.token)) {
        throw new BadRequestException(`Zalo OA không nhận tệp ${media.fileName}: ${up.message ?? `HTTP ${upRes.status}`} (mã ${up.error ?? '?'})`);
    }

    const message =
        media.kind === 'FILE'
            ? { attachment: { type: 'file', payload: { token: up.data!.token } } }
            : {
                  attachment: {
                      type: 'template',
                      payload: {
                          template_type: 'media',
                          elements: [{ media_type: isGif ? 'gif' : 'image', attachment_id: up.data!.attachment_id }],
                      },
                  },
              };

    const sendRes = await fetchImpl('https://openapi.zalo.me/v3.0/oa/message/cs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', access_token: token },
        body: JSON.stringify({ recipient: { user_id: userId }, message }),
    });
    const sent = (await sendRes.json().catch(() => ({}))) as { error?: number; message?: string; data?: { message_id?: string } };
    if (sent.error !== 0) {
        const reason =
            sent.error === -201
                ? 'Khách chưa tương tác với OA trong 7 ngày qua.'
                : sent.error === -216
                  ? 'Access Token Zalo OA không hợp lệ hoặc đã hết hạn.'
                  : sent.message ?? `HTTP ${sendRes.status}`;
        throw new BadRequestException(`Gửi ${media.fileName} qua Zalo OA thất bại: ${reason}`);
    }
    return {
        externalMessageId: sent.data?.message_id || `zalo_att_${Date.now()}`,
        rawPayload: { ...sent, upload: up.data, recipient: { id: userId } },
    };
}
