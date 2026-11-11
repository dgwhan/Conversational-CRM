import { Injectable, Logger, MessageEvent, OnModuleDestroy, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { Observable, Subject, filter, interval, map, merge } from 'rxjs';
import { WebSocketServer, WebSocket } from 'ws';

export type StaffPresenceStatus = 'ONLINE' | 'AWAY' | 'BUSY';

export interface StaffPresenceItem {
  staffId: string;
  name: string;
  avatar: string;
  role: string;
  status: StaffPresenceStatus;
  updatedAt: string;
  /** Workspace mà trạng thái này thuộc về (presence được tách theo tenant) */
  workspaceId?: string;
}

export interface RealtimeEventPayload<T = unknown> {
  type:
    | 'message:received'
    | 'presence:updated'
    | 'pipeline:updated'
    | 'heartbeat'
    | 'socket:test_ping'
    | 'connection:established'
    | 'notification:new'
    | 'channel:session_expired'
    | string;
  data: T;
  timestamp: string;
  /** Workspace sở hữu sự kiện. Chỉ client thuộc workspace này mới nhận được. */
  workspaceId?: string;
}

export interface SocketHealthInfo {
  status: 'healthy' | 'ready_to_attach';
  activeConnections: number;
  totalBroadcastedEvents: number;
  uptimeSeconds: number;
  lastActivityAt: string;
  supportedTransports: string[];
}

/** Danh tính của một kết nối realtime (đã xác thực bằng ticket ngắn hạn) */
export interface RealtimeAuthContext {
  userId: string;
  workspaceId: string;
}

const TICKET_PURPOSE = 'realtime-ticket';
export const REALTIME_TICKET_TTL_SECONDS = 60;

@Injectable()
export class RealtimeService implements OnModuleDestroy {
  private readonly logger = new Logger(RealtimeService.name);
  private readonly eventSubject = new Subject<{ workspaceId?: string; event: MessageEvent }>();

  // WebSocket Server quản lý các kết nối trực tiếp (kèm danh tính đã xác thực của từng kết nối)
  private wss: WebSocketServer | null = null;
  private readonly socketClients = new Map<WebSocket, RealtimeAuthContext | undefined>();
  private readonly startTime = Date.now();
  private lastActivityAt = new Date().toISOString();
  private totalBroadcastedEvents = 0;
  private readonly warnedUnscopedTypes = new Set<string>();

  // Ticket đã dùng (jti -> hết hạn) để mỗi ticket chỉ dùng được 1 lần
  private readonly usedTickets = new Map<string, number>();

  // Danh sách trạng thái nhân viên lưu trong bộ nhớ, key = `${workspaceId}:${staffId}`
  private readonly staffPresences = new Map<string, StaffPresenceItem>();

  constructor(@Optional() private readonly configService?: ConfigService) {}

  // ---------------------------------------------------------------------------
  // Ticket ngắn hạn: EventSource / WebSocket của trình duyệt không gửi được header Authorization,
  // nên client gọi POST /realtime/ticket (có Access Token) để đổi lấy ticket dùng 1 lần trong 60 giây.
  // ---------------------------------------------------------------------------

  private getTicketSecret(): string | undefined {
    return this.configService?.get<string>('JWT_ACCESS_SECRET') ?? process.env.JWT_ACCESS_SECRET ?? undefined;
  }

  private signTicketBody(body: string, secret: string): string {
    return createHmac('sha256', secret).update(`${TICKET_PURPOSE}.${body}`).digest('base64url');
  }

  /** Phát hành ticket gắn với (user, workspace). Ném lỗi nếu thiếu JWT_ACCESS_SECRET. */
  issueTicket(auth: RealtimeAuthContext): { ticket: string; expiresInSeconds: number } {
    const secret = this.getTicketSecret();
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET chưa cấu hình: không thể phát hành ticket realtime.');
    }
    const payload = {
      uid: auth.userId,
      wid: auth.workspaceId,
      jti: randomUUID(),
      exp: Math.floor(Date.now() / 1000) + REALTIME_TICKET_TTL_SECONDS,
    };
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return {
      ticket: `${body}.${this.signTicketBody(body, secret)}`,
      expiresInSeconds: REALTIME_TICKET_TTL_SECONDS,
    };
  }

  /** Xác minh và tiêu thụ ticket (dùng 1 lần). Trả về null nếu sai chữ ký / hết hạn / đã dùng. */
  consumeTicket(ticket: unknown): RealtimeAuthContext | null {
    const secret = this.getTicketSecret();
    if (!secret || typeof ticket !== 'string') return null;

    const [body, signature, ...rest] = ticket.split('.');
    if (!body || !signature || rest.length > 0) return null;

    const expected = Buffer.from(this.signTicketBody(body, secret));
    const received = Buffer.from(signature);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

    try {
      const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8')) as {
        uid?: unknown;
        wid?: unknown;
        jti?: unknown;
        exp?: unknown;
      };
      const nowSec = Math.floor(Date.now() / 1000);
      if (
        typeof payload.uid !== 'string' ||
        typeof payload.wid !== 'string' ||
        typeof payload.jti !== 'string' ||
        typeof payload.exp !== 'number' ||
        payload.exp < nowSec
      ) {
        return null;
      }

      // Dọn các ticket đã hết hạn rồi chặn dùng lại
      for (const [jti, exp] of this.usedTickets) {
        if (exp < nowSec) this.usedTickets.delete(jti);
      }
      if (this.usedTickets.has(payload.jti)) return null;
      this.usedTickets.set(payload.jti, payload.exp);

      return { userId: payload.uid, workspaceId: payload.wid };
    } catch {
      return null;
    }
  }

  private extractTicketFromRequest(req: IncomingMessage): string | undefined {
    try {
      const url = new URL(req.url ?? '', 'http://localhost');
      return url.searchParams.get('ticket') ?? undefined;
    } catch {
      return undefined;
    }
  }

  // ---------------------------------------------------------------------------
  // WebSocket
  // ---------------------------------------------------------------------------

  /**
   * Khởi tạo và gắn WebSocketServer vào HTTP Server của Fastify / Node.js
   * Endpoint mặc định: /api/realtime/ws?ticket=<ticket>
   * Kết nối không có ticket hợp lệ bị từ chối ngay ở bước handshake (HTTP 401).
   */
  attachHttpServer(server: any, path: string = '/api/realtime/ws'): WebSocketServer {
    if (this.wss) {
      return this.wss;
    }

    try {
      this.wss = new WebSocketServer({
        server,
        path,
        verifyClient: (info: { req: IncomingMessage }, done: (ok: boolean, code?: number, message?: string) => void) => {
          const auth = this.consumeTicket(this.extractTicketFromRequest(info.req));
          if (!auth) {
            done(false, 401, 'Unauthorized');
            return;
          }
          (info.req as IncomingMessage & { realtimeAuth?: RealtimeAuthContext }).realtimeAuth = auth;
          done(true);
        },
      });

      this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
        const auth = (req as IncomingMessage & { realtimeAuth?: RealtimeAuthContext }).realtimeAuth;
        if (!auth) {
          ws.close(1008, 'Unauthorized');
          return;
        }
        this.handleSocketConnection(ws, auth);
      });

      this.logger.log(`WebSocket server initialized on path ${path}`);
      return this.wss;
    } catch (err) {
      this.logger.error('Failed to attach WebSocketServer', err);
      throw err;
    }
  }

  /**
   * Xử lý một kết nối WebSocket từ client (phục vụ cả môi trường live lẫn unit test).
   * `auth` là danh tính đã xác thực; kết nối không có `auth` sẽ không nhận bất kỳ sự kiện nghiệp vụ nào.
   */
  handleSocketConnection(ws: WebSocket, auth?: RealtimeAuthContext): void {
    this.socketClients.set(ws, auth);
    this.lastActivityAt = new Date().toISOString();
    this.logger.log(`[WebSocket] Client connected. Active clients: ${this.socketClients.size}`);

    // Gửi gói tin handshake ban đầu
    try {
      ws.send(
        JSON.stringify({
          type: 'connection:established',
          data: {
            status: 'connected',
            serverTime: new Date().toISOString(),
            activeClients: this.socketClients.size,
            transport: 'websocket',
          },
          timestamp: new Date().toISOString(),
        }),
      );
    } catch (e) {
      this.logger.error('Failed to send handshake to client', e);
    }

    // Nhận gói tin từ client (Ping / Test / Event)
    ws.on('message', (messageBuffer: Buffer | string) => {
      try {
        this.lastActivityAt = new Date().toISOString();
        const messageStr = messageBuffer.toString();
        const parsed = JSON.parse(messageStr);

        if (parsed.type === 'ping') {
          ws.send(
            JSON.stringify({
              type: 'pong',
              data: {
                timestamp: new Date().toISOString(),
                server: 'PolarisX-CRM-WS',
              },
              timestamp: new Date().toISOString(),
            }),
          );
        }
      } catch (err) {
        this.logger.warn(`Failed to process incoming WebSocket message: ${err}`);
      }
    });

    ws.on('close', () => {
      this.socketClients.delete(ws);
      this.logger.log(`[WebSocket] Client disconnected. Active clients: ${this.socketClients.size}`);
    });

    ws.on('error', (err) => {
      this.logger.warn(`[WebSocket] Client error: ${err.message}`);
      this.socketClients.delete(ws);
    });
  }

  /**
   * Đẩy dữ liệu tới các client WebSocket THUỘC CÙNG workspace với sự kiện.
   * Sự kiện không có workspaceId sẽ không được gửi cho bất kỳ client nào (tránh rò rỉ giữa các tenant).
   */
  broadcastToSockets(payload: RealtimeEventPayload<unknown>): number {
    if (!payload.workspaceId) return 0;

    let sentCount = 0;
    const messageString = JSON.stringify(payload);

    for (const [client, auth] of this.socketClients) {
      if (!auth || auth.workspaceId !== payload.workspaceId) continue;
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageString);
          sentCount++;
        } catch (err) {
          this.logger.error('Failed to dispatch message to socket client', err);
        }
      }
    }

    return sentCount;
  }

  // ---------------------------------------------------------------------------
  // SSE
  // ---------------------------------------------------------------------------

  /**
   * Trả về Observable SSE stream cho client của MỘT workspace.
   * Bao gồm các sự kiện phát sinh của workspace đó và định kỳ gửi heartbeat (mỗi 25s) để giữ kết nối.
   */
  getEventsObservable(workspaceId: string): Observable<MessageEvent> {
    const heartbeat$ = interval(25000).pipe(
      map(
        (): MessageEvent => ({
          type: 'heartbeat',
          data: { timestamp: new Date().toISOString(), server: 'PolarisX-CRM-SSE' },
        }),
      ),
    );

    const events$ = this.eventSubject.asObservable().pipe(
      filter((item) => item.workspaceId === workspaceId),
      map((item) => item.event),
    );

    return merge(events$, heartbeat$);
  }

  /**
   * Phát một sự kiện realtime đến WebSocket clients và SSE clients của đúng workspace.
   * workspaceId lấy từ tham số, hoặc từ `data.workspaceId` nếu có.
   */
  emit<T>(type: RealtimeEventPayload<T>['type'], data: T, workspaceId?: string): void {
    const resolvedWorkspaceId =
      workspaceId ??
      (typeof (data as { workspaceId?: unknown } | null | undefined)?.workspaceId === 'string'
        ? ((data as { workspaceId: string }).workspaceId)
        : undefined);

    const payload: RealtimeEventPayload<T> = {
      type,
      data,
      timestamp: new Date().toISOString(),
      ...(resolvedWorkspaceId ? { workspaceId: resolvedWorkspaceId } : {}),
    };

    this.lastActivityAt = payload.timestamp;
    this.totalBroadcastedEvents++;

    if (!resolvedWorkspaceId) {
      if (!this.warnedUnscopedTypes.has(type)) {
        this.warnedUnscopedTypes.add(type);
        this.logger.warn(`Sự kiện realtime "${type}" thiếu workspaceId nên không được gửi tới client nào.`);
      }
      return;
    }

    // 1. Gửi qua WebSocket cho các client của workspace
    this.broadcastToSockets(payload);

    // 2. Gửi qua Server-Sent Events (SSE) cho client của workspace
    this.eventSubject.next({
      workspaceId: resolvedWorkspaceId,
      event: { type, data: payload },
    });
  }

  /**
   * Đẩy tin nhắn mới nhận được từ Webhook Facebook / Zalo xuống Frontend qua Socket
   * Ngay khi khách vừa gửi, client nhận được tức thì mà không cần polling hay gửi request lại.
   */
  broadcastNewMessage(messageData: {
    id: string;
    conversationId: string;
    channel: 'FACEBOOK' | 'ZALO' | 'TIKTOK' | 'MANUAL';
    direction: 'INBOUND' | 'OUTBOUND';
    content: string;
    senderName: string;
    senderAvatar?: string;
    customerPhone?: string;
    customerEmail?: string;
    attachments?: Array<{
      id: string;
      type: string;
      url: string;
      name?: string;
      size?: string;
      duration?: string;
      stickerId?: string | number;
    }>;
    sentAt: string;
    workspaceId?: string;
  }): void {
    this.emit('message:received', messageData);
  }

  broadcastNotification(notificationData: any): void {
    this.emit('notification:new', notificationData);
  }

  /**
   * Lấy thông tin sức khỏe và trạng thái hoạt động của Socket.
   * Khi truyền workspaceId, số kết nối chỉ tính trong workspace đó.
   */
  getSocketHealth(workspaceId?: string): SocketHealthInfo {
    let activeConnections = this.socketClients.size;
    if (workspaceId) {
      activeConnections = 0;
      for (const auth of this.socketClients.values()) {
        if (auth?.workspaceId === workspaceId) activeConnections++;
      }
    }
    return {
      status: this.wss || this.socketClients.size > 0 ? 'healthy' : 'ready_to_attach',
      activeConnections,
      totalBroadcastedEvents: this.totalBroadcastedEvents,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      lastActivityAt: this.lastActivityAt,
      supportedTransports: ['websocket', 'sse'],
    };
  }

  /**
   * Gửi gói tin Ping kiểm thử đến các client Socket của workspace
   */
  testBroadcastPing(
    workspaceId: string,
    customMessage?: string,
  ): {
    status: string;
    deliveredCount: number;
    sentAt: string;
    message: string;
  } {
    const sentAt = new Date().toISOString();
    const message = customMessage || 'PolarisX-CRM Socket Diagnostic Heartbeat Test';

    const payload: RealtimeEventPayload<{ message: string; timestamp: string }> = {
      type: 'socket:test_ping',
      data: { message, timestamp: sentAt },
      timestamp: sentAt,
      workspaceId,
    };

    const count = this.broadcastToSockets(payload);
    this.lastActivityAt = sentAt;

    return {
      status: 'ok',
      deliveredCount: count,
      sentAt,
      message,
    };
  }

  // ---------------------------------------------------------------------------
  // Presence (tách theo workspace)
  // ---------------------------------------------------------------------------

  private presenceKey(workspaceId: string | undefined, staffId: string): string {
    return `${workspaceId ?? ''}:${staffId}`;
  }

  /**
   * Cập nhật trạng thái trực tuyến của nhân viên (Online / Away / Busy) trong một workspace
   */
  updateStaffPresence(
    staffId: string,
    status: StaffPresenceStatus,
    extraInfo?: { name?: string; avatar?: string; role?: string },
    workspaceId?: string,
  ): StaffPresenceItem {
    const key = this.presenceKey(workspaceId, staffId);
    const existing = this.staffPresences.get(key) || {
      staffId,
      name: extraInfo?.name || `Nhân viên #${staffId}`,
      avatar: extraInfo?.avatar || 'NV',
      role: extraInfo?.role || 'Tư vấn viên',
      status: 'ONLINE' as StaffPresenceStatus,
      updatedAt: new Date().toISOString(),
      ...(workspaceId ? { workspaceId } : {}),
    };

    const updated: StaffPresenceItem = {
      ...existing,
      status,
      updatedAt: new Date().toISOString(),
      name: extraInfo?.name || existing.name,
      avatar: extraInfo?.avatar || existing.avatar,
    };

    this.staffPresences.set(key, updated);
    this.emit('presence:updated', updated, workspaceId);

    return updated;
  }

  /**
   * Lấy danh sách trạng thái của nhân viên trong một workspace
   */
  getAllStaffPresences(workspaceId?: string): StaffPresenceItem[] {
    return Array.from(this.staffPresences.values()).filter(
      (item) => (workspaceId ? item.workspaceId === workspaceId : true),
    );
  }

  /**
   * Đồng bộ thay đổi giai đoạn phễu chăm sóc tuyển sinh
   */
  broadcastPipelineChange(payload: {
    customerId: string;
    customerName: string;
    newStage: string;
    previousStage: string;
    updatedBy: string;
    phone?: string;
    email?: string;
    avatarUrl?: string;
    channel?: string;
    channelAccountName?: string;
    estimatedValue?: number;
    interestCourses?: string[];
    tags?: string[];
    conversationId?: string;
    workspaceId?: string;
  }): void {
    this.emit('pipeline:updated', payload);
  }

  /**
   * Dọn dẹp tài nguyên khi module bị hủy
   */
  onModuleDestroy(): void {
    for (const client of this.socketClients.keys()) {
      try {
        client.close();
      } catch {
        // ignore
      }
    }
    this.socketClients.clear();

    if (this.wss) {
      try {
        this.wss.close();
      } catch {
        // ignore
      }
      this.wss = null;
    }
  }
}
