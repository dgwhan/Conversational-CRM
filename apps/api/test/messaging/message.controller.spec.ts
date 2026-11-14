import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MessageController } from '../../src/modules/messaging/presentation/message.controller.js';
import type { MessageRepository } from '../../src/modules/messaging/infrastructure/message.repository.js';

describe('MessageController', () => {
    let controller: MessageController;
    let mockRepo: Partial<MessageRepository>;

    beforeEach(() => {
        mockRepo = {
            findMany: vi.fn().mockResolvedValue({
                items: [
                    { id: 'msg-1', content: 'Xin chào', channel: 'ZALO' },
                    { id: 'msg-2', content: 'Tư vấn học phí', channel: 'FACEBOOK' },
                ],
                total: 2,
            }),
        };
        controller = new MessageController(mockRepo as MessageRepository);
    });

    it('lấy danh sách tin nhắn đã lưu (getSavedMessages)', async () => {
        const result = await controller.getSavedMessages('1', '10');
        expect(result.items).toHaveLength(2);
        expect(result.total).toBe(2);
        expect(result.page).toBe(1);
        expect(result.totalPages).toBe(1);
        expect(mockRepo.findMany).toHaveBeenCalled();
    });

    it('lấy workspace và vai trò từ phiên đăng nhập, không tin header client', async () => {
        const req = { user: { id: 'u-1' }, workspace: { id: 'ws-auth', role: 'STAFF' } };
        await controller.getSavedMessages('2', '5', 'ZALO', 'học phí', 'ws-query', 'ws-header', req);
        expect(mockRepo.findMany).toHaveBeenCalledWith({
            workspaceId: 'ws-auth',
            limit: 5,
            offset: 5,
            channel: 'ZALO',
            search: 'học phí',
            role: 'STAFF',
            staffId: 'u-1',
        });
    });

    it('trả danh sách rỗng khi truy vấn lỗi', async () => {
        (mockRepo.findMany as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('db down'));
        const result = await controller.getSavedMessages();
        expect(result).toMatchObject({ items: [], total: 0, totalPages: 0 });
    });
});
