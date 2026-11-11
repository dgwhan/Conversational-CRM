import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { RealtimeService } from '../../src/modules/realtime/realtime.service.js';
import { RealtimeController } from '../../src/modules/realtime/realtime.controller.js';
import { firstValueFrom, take, timeout } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';

const WS_A = '11111111-1111-4111-8111-111111111111';
const WS_B = '22222222-2222-4222-8222-222222222222';
const SECRET = 'realtime-test-jwt-access-secret-0123456789ab';

const ownerReq = { user: { id: 'owner-1' }, workspace: { id: WS_A, role: 'OWNER' } };
const staffReq = { user: { id: 'staff-1' }, workspace: { id: WS_A, role: 'STAFF' } };

/** Thu các sự kiện SSE của một workspace trong lúc chạy `action` */
function collect(service: RealtimeService, workspaceId: string, action: () => void): MessageEvent[] {
  const received: MessageEvent[] = [];
  const sub = service.getEventsObservable(workspaceId).subscribe((e) => received.push(e));
  action();
  sub.unsubscribe();
  return received.filter((e) => e.type !== 'heartbeat');
}

describe('RealtimeService & SSE Engine', () => {
  const previousSecret = process.env.JWT_ACCESS_SECRET;

  beforeEach(() => {
    process.env.JWT_ACCESS_SECRET = SECRET;
  });

  afterEach(() => {
    if (previousSecret === undefined) delete process.env.JWT_ACCESS_SECRET;
    else process.env.JWT_ACCESS_SECRET = previousSecret;
  });

  it('should initialize with dynamic staff presences and register staff dynamically', () => {
    const service = new RealtimeService();
    expect(service.getAllStaffPresences(WS_A)).toHaveLength(0);

    service.updateStaffPresence('staff-1', 'ONLINE', { name: 'Tư vấn viên chính', role: 'Tư vấn viên' }, WS_A);

    const presences = service.getAllStaffPresences(WS_A);
    expect(presences).toHaveLength(1);
    expect(presences[0]?.staffId).toBe('staff-1');
    expect(presences[0]?.status).toBe('ONLINE');
  });

  it('presence được tách theo workspace (không lộ nhân viên của tenant khác)', () => {
    const service = new RealtimeService();
    service.updateStaffPresence('staff-a', 'ONLINE', undefined, WS_A);
    service.updateStaffPresence('staff-b', 'BUSY', undefined, WS_B);

    expect(service.getAllStaffPresences(WS_A).map((p) => p.staffId)).toEqual(['staff-a']);
    expect(service.getAllStaffPresences(WS_B).map((p) => p.staffId)).toEqual(['staff-b']);
  });

  it('should update staff presence and emit presence:updated event to the same workspace', async () => {
    const service = new RealtimeService();
    const eventPromise = firstValueFrom(service.getEventsObservable(WS_A).pipe(take(1), timeout(2000)));

    service.updateStaffPresence('staff-1', 'BUSY', undefined, WS_A);

    const event = await eventPromise;
    expect(event.type).toBe('presence:updated');
    expect((event.data as any).data.staffId).toBe('staff-1');
    expect((event.data as any).data.status).toBe('BUSY');

    const updated = service.getAllStaffPresences(WS_A).find((p) => p.staffId === 'staff-1');
    expect(updated?.status).toBe('BUSY');
  });

  it('should broadcast new message received event', async () => {
    const service = new RealtimeService();
    const eventPromise = firstValueFrom(service.getEventsObservable(WS_A).pipe(take(1), timeout(2000)));

    service.broadcastNewMessage({
      id: 'msg-realtime-1',
      conversationId: 'conv-realtime-1',
      channel: 'FACEBOOK',
      direction: 'INBOUND',
      content: 'Tư vấn Fullstack React',
      senderName: 'Nguyễn Văn An',
      sentAt: 'Vừa xong',
      workspaceId: WS_A,
    });

    const event = await eventPromise;
    expect(event.type).toBe('message:received');
    expect((event.data as any).data.content).toBe('Tư vấn Fullstack React');
    expect((event.data as any).data.senderName).toBe('Nguyễn Văn An');
  });

  it('sự kiện chỉ tới client của đúng workspace (cô lập tenant)', () => {
    const service = new RealtimeService();
    const payload = {
      id: 'm1',
      conversationId: 'c1',
      channel: 'ZALO' as const,
      direction: 'INBOUND' as const,
      content: 'bí mật của tenant A',
      senderName: 'Khách',
      sentAt: 'now',
    };

    let toA: MessageEvent[] = [];
    const toB = collect(service, WS_B, () => {
      toA = collect(service, WS_A, () => service.broadcastNewMessage({ ...payload, workspaceId: WS_A }));
    });

    expect(toA).toHaveLength(1);
    expect(toB).toHaveLength(0);
  });

  it('sự kiện không có workspaceId không được gửi cho bất kỳ client nào', () => {
    const service = new RealtimeService();
    const received = collect(service, WS_A, () => {
      service.emit('custom:event', { hello: 'world' });
      service.broadcastNewMessage({
        id: 'm2',
        conversationId: 'c2',
        channel: 'FACEBOOK',
        direction: 'INBOUND',
        content: 'x',
        senderName: 'y',
        sentAt: 'now',
      });
    });
    expect(received).toHaveLength(0);
  });

  it('emit lấy workspaceId từ data khi không truyền tham số riêng', () => {
    const service = new RealtimeService();
    const received = collect(service, WS_A, () => service.emit('deal:created', { workspaceId: WS_A, deal: { id: 'd1' } }));
    expect(received).toHaveLength(1);
    expect(received[0]?.type).toBe('deal:created');
  });

  describe('ticket realtime', () => {
    it('phát hành rồi tiêu thụ ticket đúng một lần', () => {
      const service = new RealtimeService();
      const { ticket, expiresInSeconds } = service.issueTicket({ userId: 'u1', workspaceId: WS_A });

      expect(expiresInSeconds).toBeGreaterThan(0);
      expect(service.consumeTicket(ticket)).toEqual({ userId: 'u1', workspaceId: WS_A });
      // Dùng lại -> bị từ chối
      expect(service.consumeTicket(ticket)).toBeNull();
    });

    it('từ chối ticket bị sửa nội dung hoặc sai chữ ký', () => {
      const service = new RealtimeService();
      const { ticket } = service.issueTicket({ userId: 'u1', workspaceId: WS_A });
      const [body, sig] = ticket.split('.');

      // Đổi workspace trong payload nhưng giữ chữ ký cũ
      const tamperedPayload = JSON.parse(Buffer.from(body!, 'base64url').toString('utf-8'));
      tamperedPayload.wid = WS_B;
      const tampered = `${Buffer.from(JSON.stringify(tamperedPayload)).toString('base64url')}.${sig}`;

      expect(service.consumeTicket(tampered)).toBeNull();
      expect(service.consumeTicket(`${body}.abc`)).toBeNull();
      expect(service.consumeTicket('rác')).toBeNull();
      expect(service.consumeTicket(undefined)).toBeNull();
    });

    it('từ chối ticket đã hết hạn', () => {
      const service = new RealtimeService();
      const { ticket } = service.issueTicket({ userId: 'u1', workspaceId: WS_A });

      const realNow = Date.now;
      Date.now = () => realNow() + 120_000;
      try {
        expect(service.consumeTicket(ticket)).toBeNull();
      } finally {
        Date.now = realNow;
      }
    });

    it('từ chối ticket ký bằng secret khác', () => {
      const issuer = new RealtimeService();
      const { ticket } = issuer.issueTicket({ userId: 'u1', workspaceId: WS_A });

      process.env.JWT_ACCESS_SECRET = 'another-secret-another-secret-another-1234';
      expect(new RealtimeService().consumeTicket(ticket)).toBeNull();
    });
  });

  describe('controller', () => {
    it('trả presence của workspace đã xác minh và chặn request không thuộc workspace nào', () => {
      const service = new RealtimeService();
      const controller = new RealtimeController(service);
      service.updateStaffPresence('x', 'ONLINE', undefined, WS_B);

      const result = controller.getPresences(ownerReq);
      expect(result.status).toBe('ok');
      expect(result.data).toEqual([]);

      expect(() => controller.getPresences({ user: { id: 'u' } })).toThrow(ForbiddenException);
    });

    it('updatePresence luôn dùng danh tính từ token (bỏ qua staffId do client gửi)', () => {
      const service = new RealtimeService();
      const controller = new RealtimeController(service);

      const result = controller.updatePresence({ staffId: 'someone-else', status: 'BUSY' }, staffReq);
      expect(result.data.staffId).toBe('staff-1');
      expect(service.getAllStaffPresences(WS_A).map((p) => p.staffId)).toEqual(['staff-1']);
    });

    it('updatePresence từ chối trạng thái không hợp lệ', () => {
      const controller = new RealtimeController(new RealtimeService());
      expect(() => controller.updatePresence({ status: 'HACKED' as any }, staffReq)).toThrow();
    });

    it('POST ticket cấp ticket gắn với workspace của người gọi', () => {
      const service = new RealtimeService();
      const controller = new RealtimeController(service);

      const { data } = controller.issueTicket(ownerReq);
      expect(service.consumeTicket(data.ticket)).toEqual({ userId: 'owner-1', workspaceId: WS_A });
      expect(() => controller.issueTicket({})).toThrow(UnauthorizedException);
    });

    it('SSE stream từ chối khi thiếu hoặc sai ticket, và lọc theo workspace của ticket', () => {
      const service = new RealtimeService();
      const controller = new RealtimeController(service);

      expect(() => controller.streamEvents(undefined)).toThrow(UnauthorizedException);
      expect(() => controller.streamEvents('ticket-gia')).toThrow(UnauthorizedException);

      const { ticket } = service.issueTicket({ userId: 'u1', workspaceId: WS_A });
      const received: MessageEvent[] = [];
      const sub = controller.streamEvents(ticket).subscribe((e) => received.push(e));
      service.emit('notification:new', { n: 1 }, WS_B);
      service.emit('notification:new', { n: 2 }, WS_A);
      sub.unsubscribe();

      expect(received.filter((e) => e.type === 'notification:new')).toHaveLength(1);
    });

    it('simulate-inbound / pipeline-change chỉ cho OWNER và chỉ phát trong workspace của OWNER', () => {
      const service = new RealtimeService();
      const controller = new RealtimeController(service);

      expect(() => controller.simulateInboundMessage({ channel: 'ZALO' }, staffReq)).toThrow(ForbiddenException);

      let toB: MessageEvent[] = [];
      const toA = collect(service, WS_A, () => {
        toB = collect(service, WS_B, () => {
          const sim = controller.simulateInboundMessage({ channel: 'ZALO', content: 'Chào trung tâm!' }, ownerReq);
          expect(sim.status).toBe('ok');
          expect(sim.data.channel).toBe('ZALO');
          expect(sim.data.content).toBe('Chào trung tâm!');
        });
      });
      expect(toA).toHaveLength(1);
      expect(toB).toHaveLength(0);
    });

    it('các endpoint giả lập / kiểm thử bị ẩn (404) ở production', () => {
      const service = new RealtimeService();
      const controller = new RealtimeController(service);
      const previous = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        expect(() => controller.simulateInboundMessage({}, ownerReq)).toThrow(NotFoundException);
        expect(() =>
          controller.broadcastPipelineChange(
            { customerId: 'c', customerName: 'n', newStage: 'a', previousStage: 'b' },
            ownerReq,
          ),
        ).toThrow(NotFoundException);
        expect(() => controller.sendSocketTestPing({}, ownerReq)).toThrow(NotFoundException);
        expect(() => controller.getTestClientHtml({ header: () => undefined } as any)).toThrow(NotFoundException);
      } finally {
        process.env.NODE_ENV = previous;
      }
    });
  });
});
