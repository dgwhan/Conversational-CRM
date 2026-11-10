import { describe, expect, it, beforeEach } from 'vitest';
import { ZaloAdapter } from '../../src/modules/messaging/infrastructure/adapters/zalo.adapter.js';
import { MessageDirection } from '../../src/modules/messaging/domain/channel.js';

describe('ZaloAdapter - Rich Media & Zero-Storage Attachments', () => {
    let adapter: ZaloAdapter;

    beforeEach(() => {
        adapter = new ZaloAdapter();
    });

    it('1. Parse đúng tin nhắn Sticker từ khách hàng (user_send_sticker)', () => {
        const payload = {
            event_name: 'user_send_sticker',
            oa_id: 'oa_cusc_001',
            user_id_by_app: 'zalo_user_999',
            timestamp: 1714000000000,
            message: {
                msg_id: 'zalo_msg_sticker_1',
                attachments: [
                    {
                        type: 'sticker',
                        payload: {
                            id: 'sticker_heart_123',
                            url: 'https://stickers.zalo.me/heart_123.png',
                        },
                    },
                ],
            },
        };

        const events = adapter.parseEvents({
            headers: {},
            rawBody: Buffer.from(JSON.stringify(payload)),
        });

        expect(events).toHaveLength(1);
        expect(events[0].content).toBe('[Nhãn dán]');
        expect(events[0].attachments).toBeDefined();
        expect(events[0].attachments![0].type).toBe('STICKER');
        expect(events[0].attachments![0].stickerId).toBe('sticker_heart_123');
        expect(events[0].attachments![0].url).toBe('https://stickers.zalo.me/heart_123.png');
        expect(events[0].direction).toBe(MessageDirection.INBOUND);
    });

    it('2. Parse đúng tin nhắn Hình ảnh từ khách hàng (user_send_image)', () => {
        const payload = {
            event_name: 'user_send_image',
            oa_id: 'oa_cusc_001',
            user_id_by_app: 'zalo_user_999',
            timestamp: 1714000000000,
            message: {
                msg_id: 'zalo_msg_img_1',
                text: 'Em gửi CCCD ạ',
                attachments: [
                    {
                        type: 'image',
                        payload: {
                            url: 'https://res-zalo.zadn.vn/cccd_front.jpg',
                        },
                    },
                ],
            },
        };

        const events = adapter.parseEvents({
            headers: {},
            rawBody: Buffer.from(JSON.stringify(payload)),
        });

        expect(events).toHaveLength(1);
        expect(events[0].content).toBe('Em gửi CCCD ạ');
        expect(events[0].attachments).toBeDefined();
        expect(events[0].attachments![0].type).toBe('IMAGE');
        expect(events[0].attachments![0].url).toBe('https://res-zalo.zadn.vn/cccd_front.jpg');
    });

    it('3. Parse đúng tin nhắn Tệp đính kèm (user_send_file)', () => {
        const payload = {
            event_name: 'user_send_file',
            oa_id: 'oa_cusc_001',
            user_id_by_app: 'zalo_user_999',
            timestamp: 1714000000000,
            message: {
                msg_id: 'zalo_msg_file_1',
                attachments: [
                    {
                        type: 'file',
                        payload: {
                            url: 'https://res-zalo.zadn.vn/bang-diem-thpt.pdf',
                            name: 'Bang_Diem_THPT.pdf',
                            size: 1048576,
                        },
                    },
                ],
            },
        };

        const events = adapter.parseEvents({
            headers: {},
            rawBody: Buffer.from(JSON.stringify(payload)),
        });

        expect(events).toHaveLength(1);
        expect(events[0].content).toBe('[Tệp: Bang_Diem_THPT.pdf]');
        expect(events[0].attachments).toBeDefined();
        expect(events[0].attachments![0].type).toBe('FILE');
        expect(events[0].attachments![0].name).toBe('Bang_Diem_THPT.pdf');
        expect(events[0].attachments![0].url).toBe('https://res-zalo.zadn.vn/bang-diem-thpt.pdf');
    });
});
