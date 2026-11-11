import { describe, expect, it, vi } from 'vitest';
import { InboundJobHandler } from '../../src/modules/messaging/application/inbound-job.handler.js';
import { InProcessInboundQueue } from '../../src/modules/messaging/infrastructure/in-process-inbound-queue.js';
import { UnprocessedMessageSweeper } from '../../src/modules/messaging/application/unprocessed-message-sweeper.service.js';
import { DistributedLockService } from '../../src/platform/redis/distributed-lock.service.js';
import { Channel, MessageDirection } from '../../src/modules/messaging/domain/channel.js';
import type { InboundJobData } from '../../src/modules/messaging/domain/channel-adapter.port.js';
import { parseTrustProxy } from '../../src/platform/config/trust-proxy.js';

const context = {
    channel: Channel.FACEBOOK,
    externalAccountId: 'page-1',
    externalMessageId: 'mid-1',
    senderExternalId: 'psid-1',
    direction: MessageDirection.INBOUND,
    content: 'Xin chào',
    sentAt: '2026-11-11T01:00:00.000Z',
    conversationId: null,
};

function makeHandler() {
    const processUseCase = { execute: vi.fn().mockResolvedValue(true) };
    const messages = {
        findById: vi.fn().mockResolvedValue({ id: 'msg-1', rawPayload: { customerName: 'Lan' }, conversationId: 'conv-1' }),
    };
    const sideEffects = { run: vi.fn().mockResolvedValue(undefined) };
    const handler = new InboundJobHandler(processUseCase as any, messages as any, sideEffects as any);
    return { handler, processUseCase, messages, sideEffects };
}

describe('InboundJobHandler', () => {
    it('chạy tác vụ phụ với rawPayload đọc từ DB rồi mới xử lý tin', async () => {
        const { handler, processUseCase, sideEffects } = makeHandler();

        await handler.handle({ messageId: 'msg-1', context }, { firstAttempt: true });

        expect(sideEffects.run).toHaveBeenCalledWith(
            expect.objectContaining({ senderExternalId: 'psid-1', rawPayload: { customerName: 'Lan' }, sentAt: new Date(context.sentAt) }),
            { id: 'msg-1', conversationId: 'conv-1' },
        );
        expect(processUseCase.execute).toHaveBeenCalledWith('msg-1');
    });

    it('không chạy lại tác vụ phụ ở lần retry (tránh gửi trùng tin ngoài giờ / realtime)', async () => {
        const { handler, processUseCase, sideEffects } = makeHandler();

        await handler.handle({ messageId: 'msg-1', context }, { firstAttempt: false });

        expect(sideEffects.run).not.toHaveBeenCalled();
        expect(processUseCase.execute).toHaveBeenCalledWith('msg-1');
    });

    it('ném lỗi của bước xử lý để hàng đợi retry', async () => {
        const { handler, processUseCase } = makeHandler();
        processUseCase.execute.mockRejectedValue(new Error('classification down'));

        await expect(handler.handle({ messageId: 'msg-1' }, { firstAttempt: true })).rejects.toThrow('classification down');
    });
});

describe('InProcessInboundQueue', () => {
    it('enqueue trả về ngay, không xử lý trong request', async () => {
        let release!: () => void;
        const handle = vi.fn().mockImplementation(() => new Promise<void>((resolve) => (release = resolve)));
        const queue = new InProcessInboundQueue({ handle } as any);

        await queue.enqueue(['msg-1']);
        expect(handle).not.toHaveBeenCalled(); // chưa chạy đồng bộ trong enqueue

        await new Promise((resolve) => setImmediate(resolve));
        expect(handle).toHaveBeenCalledWith({ messageId: 'msg-1' }, { firstAttempt: true });
        release();
        await queue.drain();
    });

    it('không xếp trùng một tin đang chờ và nuốt lỗi của job', async () => {
        const handle = vi.fn().mockRejectedValue(new Error('boom'));
        const queue = new InProcessInboundQueue({ handle } as any);

        const job: InboundJobData = { messageId: 'msg-dup' };
        await queue.enqueue([job, 'msg-dup']);
        await queue.drain();

        expect(handle).toHaveBeenCalledTimes(1);
    });
});

describe('UnprocessedMessageSweeper', () => {
    it('đưa lại vào hàng đợi các tin chưa xử lý quá hạn', async () => {
        const messages = { findStaleUnprocessedIds: vi.fn().mockResolvedValue(['a', 'b']) };
        const queue = { enqueue: vi.fn().mockResolvedValue(undefined) };
        const sweeper = new UnprocessedMessageSweeper(messages as any, queue, new DistributedLockService());

        await expect(sweeper.sweep()).resolves.toBe(2);
        expect(queue.enqueue).toHaveBeenCalledWith(['a', 'b']);
    });
});

describe('DistributedLockService (không có Redis)', () => {
    it('không chạy chồng cùng một tác vụ', async () => {
        const locks = new DistributedLockService();
        let release!: () => void;
        const first = locks.runExclusive('job', 1000, () => new Promise<string>((resolve) => (release = () => resolve('done'))));

        await expect(locks.runExclusive('job', 1000, async () => 'second')).resolves.toBeUndefined();
        release();
        await expect(first).resolves.toBe('done');
        await expect(locks.runExclusive('job', 1000, async () => 'again')).resolves.toBe('again');
    });
});

describe('parseTrustProxy', () => {
    it('mặc định không tin proxy', () => {
        expect(parseTrustProxy(undefined)).toBe(false);
        expect(parseTrustProxy('')).toBe(false);
        expect(parseTrustProxy('false')).toBe(false);
    });

    it('hỗ trợ số hop và danh sách IP/CIDR', () => {
        const hops = parseTrustProxy('1') as (addr: string, hop: number) => boolean;
        expect(hops('10.0.0.1', 0)).toBe(true);
        expect(hops('10.0.0.2', 1)).toBe(false);
        expect(parseTrustProxy('10.0.0.0/8, 127.0.0.1')).toEqual(['10.0.0.0/8', '127.0.0.1']);
    });
});
