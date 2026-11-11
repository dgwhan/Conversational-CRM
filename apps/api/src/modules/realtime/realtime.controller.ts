import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Query,
  Req,
  Res,
  Sse,
  MessageEvent,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { Observable } from 'rxjs';
import { Public } from '../../common/decorators/public.decorator.js';
import { getRequestIdentity } from '../../common/auth/request-identity.js';
import { WorkspaceRole } from '../../contracts/roles.js';
import { RealtimeService, StaffPresenceStatus } from './realtime.service.js';

class UpdatePresenceDto {
  /** Bị bỏ qua: danh tính nhân viên luôn lấy từ Access Token, không tin dữ liệu client gửi lên */
  staffId?: string;
  status!: StaffPresenceStatus;
  name?: string;
  avatar?: string;
  role?: string;
}

class SimulateInboundDto {
  channel?: 'FACEBOOK' | 'ZALO' | 'TIKTOK' | 'MANUAL';
  conversationId?: string;
  senderName?: string;
  senderAvatar?: string;
  content?: string;
  customerPhone?: string;
  customerEmail?: string;
}

class PipelineChangeDto {
  customerId!: string;
  customerName!: string;
  newStage!: string;
  previousStage!: string;
  updatedBy?: string;
}

class SocketTestPingDto {
  message?: string;
}

const VALID_PRESENCE: StaffPresenceStatus[] = ['ONLINE', 'AWAY', 'BUSY'];

/** Các endpoint chẩn đoán / giả lập chỉ tồn tại ngoài môi trường production */
function assertNotProduction(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new NotFoundException();
  }
}

function requireWorkspace(req: unknown) {
  const identity = getRequestIdentity(req);
  if (!identity.userId) throw new UnauthorizedException();
  if (!identity.workspaceId) {
    throw new ForbiddenException('Không xác định được workspace của người dùng.');
  }
  return { ...identity, workspaceId: identity.workspaceId, userId: identity.userId };
}

function requireOwner(req: unknown) {
  const identity = requireWorkspace(req);
  if (identity.role !== WorkspaceRole.OWNER) {
    throw new ForbiddenException('Chỉ chủ workspace mới được thực hiện thao tác này.');
  }
  return identity;
}

@Controller('realtime')
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  /**
   * Đổi Access Token (header Authorization) lấy ticket dùng 1 lần, sống 60 giây,
   * để mở SSE / WebSocket (trình duyệt không gửi được header Authorization cho 2 kênh này).
   * URL: POST /api/realtime/ticket
   */
  @Post('ticket')
  @HttpCode(HttpStatus.OK)
  issueTicket(@Req() req: unknown) {
    const identity = requireWorkspace(req);
    const issued = this.realtimeService.issueTicket({
      userId: identity.userId,
      workspaceId: identity.workspaceId,
    });
    return { status: 'ok', data: issued };
  }

  /**
   * Kết nối Server-Sent Events (SSE) để đẩy tin nhắn và trạng thái thời gian thực.
   * Xác thực bằng ?ticket= (xem POST /realtime/ticket); chỉ nhận sự kiện của workspace trong ticket.
   * URL: GET /api/realtime/stream?ticket=...
   */
  @Public()
  @Sse('stream')
  streamEvents(@Query('ticket') ticket?: string): Observable<MessageEvent> {
    const auth = this.realtimeService.consumeTicket(ticket);
    if (!auth) {
      throw new UnauthorizedException('Ticket realtime không hợp lệ hoặc đã hết hạn.');
    }
    return this.realtimeService.getEventsObservable(auth.workspaceId);
  }

  /**
   * Kiểm tra tình trạng hoạt động và số lượng client kết nối Socket (Bộ kiểm thử Socket Health)
   * URL: GET /api/realtime/socket/status
   */
  @Get('socket/status')
  getSocketStatus(@Req() req?: unknown) {
    const identity = requireOwner(req);
    return {
      status: 'ok',
      data: this.realtimeService.getSocketHealth(identity.workspaceId),
    };
  }

  /**
   * Gửi gói tin Ping kiểm thử đến tất cả các client Socket để xác nhận socket còn hoạt động
   * URL: POST /api/realtime/socket/test-ping
   */
  @Post('socket/test-ping')
  @HttpCode(HttpStatus.OK)
  sendSocketTestPing(@Body() body?: SocketTestPingDto, @Req() req?: unknown) {
    assertNotProduction();
    const identity = requireOwner(req);
    const result = this.realtimeService.testBroadcastPing(identity.workspaceId, body?.message);
    return {
      status: 'ok',
      message: 'Đã phát tín hiệu Ping kiểm tra socket',
      data: result,
    };
  }

  /**
   * Trang giao diện kiểm thử trực quan Socket dành cho lập trình viên và kiểm thử viên
   * URL: GET /api/realtime/socket/test-client
   */
  @Public()
  @Get('socket/test-client')
  getTestClientHtml(@Res({ passthrough: true }) res: FastifyReply) {
    assertNotProduction();
    if (res && typeof res.header === 'function') {
      res.header('content-type', 'text/html; charset=utf-8');
    }

    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>PolarisX CRM - Bộ Kiểm Thử Hoạt Động WebSocket</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
    .card { background: #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid #334155; }
    h1 { font-size: 20px; margin-top: 0; color: #38bdf8; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 13px; font-weight: bold; }
    .connected { background: #15803d; color: #dcfce7; }
    .disconnected { background: #b91c1c; color: #fee2e2; }
    .connecting { background: #ca8a04; color: #fef08a; }
    button { background: #0284c7; color: white; border: none; padding: 10px 18px; border-radius: 8px; cursor: pointer; font-weight: 600; margin-right: 8px; }
    button:hover { background: #0369a1; }
    #logs { background: #090d16; border-radius: 8px; padding: 16px; font-family: monospace; font-size: 13px; height: 350px; overflow-y: auto; border: 1px solid #1e293b; }
    .log-item { margin-bottom: 6px; padding: 4px 8px; border-radius: 4px; border-left: 3px solid #38bdf8; background: rgba(56, 189, 248, 0.05); }
    .inbound { border-left-color: #22c55e; background: rgba(34, 197, 94, 0.05); }
    .outbound { border-left-color: #a855f7; background: rgba(168, 85, 247, 0.05); }
  </style>
</head>
<body>
  <h1>⚡ PolarisX Recruitment CRM - WebSocket Diagnostic & Test Kit</h1>
  <div class="card">
    <p>Trạng thái kết nối Socket: <span id="statusBadge" class="badge connecting">ĐANG KẾT NỐI...</span></p>
    <p>Độ trễ Ping/Pong: <strong id="latencyText">-- ms</strong> | Số sự kiện nhận được: <strong id="eventCount">0</strong></p>
    <p>
      <input id="tokenInput" type="password" placeholder="Dán Access Token (JWT) của bạn" style="width: 70%; padding: 8px; border-radius: 6px; border: 1px solid #334155; background: #0f172a; color: #f8fafc;">
      <button onclick="connect()">Kết nối</button>
    </p>
    <div>
      <button onclick="sendPing()">Gửi Ping qua Socket</button>
      <button onclick="clearLogs()" style="background: #475569;">Xóa Nhật Ký</button>
    </div>
  </div>

  <div class="card">
    <h3>Nhật Ký Tin Nhắn Realtime (Tự động nhận khi Facebook Webhook gửi đến):</h3>
    <div id="logs"></div>
  </div>

  <script>
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsBase = protocol + '//' + window.location.host + '/api/realtime/ws';
    let ws = null;
    let reconnectTimer = null;
    let eventCount = 0;
    let pingSentTime = 0;

    const statusBadge = document.getElementById('statusBadge');
    const logsDiv = document.getElementById('logs');
    const latencyText = document.getElementById('latencyText');
    const eventCountText = document.getElementById('eventCount');

    function log(message, type = '') {
      const el = document.createElement('div');
      el.className = 'log-item ' + type;
      el.textContent = '[' + new Date().toLocaleTimeString() + '] ' + message;
      logsDiv.prepend(el);
    }

    async function connect() {
      const token = document.getElementById('tokenInput').value.trim();
      if (!token) {
        log('Hãy dán Access Token trước khi kết nối.');
        return;
      }
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
      if (ws) { ws.onclose = null; try { ws.close(); } catch (e) {} }

      statusBadge.className = 'badge connecting';
      statusBadge.textContent = 'ĐANG KẾT NỐI...';
      log('Đang xin ticket realtime...');

      let ticket;
      try {
        const res = await fetch('/api/realtime/ticket', { method: 'POST', headers: { Authorization: 'Bearer ' + token } });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        ticket = (await res.json()).data.ticket;
      } catch (e) {
        statusBadge.className = 'badge disconnected';
        statusBadge.textContent = 'KHÔNG XÁC THỰC ĐƯỢC';
        log('Không lấy được ticket: ' + e.message);
        return;
      }

      log('Đang kết nối đến WebSocket...');
      ws = new WebSocket(wsBase + '?ticket=' + encodeURIComponent(ticket));

      ws.onopen = () => {
        statusBadge.className = 'badge connected';
        statusBadge.textContent = 'ĐÃ KẾT NỐI (ACTIVE)';
        log('Kết nối WebSocket thành công! Sẵn sàng nhận tin nhắn realtime.', 'inbound');
      };

      ws.onmessage = (event) => {
        eventCount++;
        eventCountText.textContent = eventCount;
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'pong') {
            const rtt = Date.now() - pingSentTime;
            latencyText.textContent = rtt + ' ms';
            log('Nhận Pong từ Server CRM! RTT: ' + rtt + 'ms', 'outbound');
          } else if (payload.type === 'message:received') {
            const data = payload.data;
            const dir = data.direction === 'OUTBOUND' ? '[Page Echo]' : '[Khách đến]';
            const logType = data.direction === 'OUTBOUND' ? 'outbound' : 'inbound';
            log(dir + ' [' + data.channel + '] ' + data.senderName + ': "' + data.content + '" (ID: ' + data.id + ')', logType);
          } else {
            log('Sự kiện ' + payload.type + ': ' + JSON.stringify(payload.data));
          }
        } catch (e) {
          log('Nhận raw: ' + event.data);
        }
      };

      ws.onclose = () => {
        statusBadge.className = 'badge disconnected';
        statusBadge.textContent = 'NGẮT KẾT NỐI (OFFLINE)';
        log('Kết nối WebSocket đã bị ngắt. Đang thử lại sau 3s...');
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        log('Lỗi WebSocket: ' + JSON.stringify(err));
      };
    }

    function sendPing() {
      if (ws && ws.readyState === WebSocket.OPEN) {
        pingSentTime = Date.now();
        ws.send(JSON.stringify({ type: 'ping' }));
        log('Đã gửi Ping đến server...', 'outbound');
      } else {
        log('Socket chưa kết nối!');
      }
    }

    function clearLogs() {
      logsDiv.innerHTML = '';
    }

  </script>
</body>
</html>`;
  }

  /**
   * Lấy danh sách trạng thái trực tuyến của toàn bộ nhân viên
   * URL: GET /api/realtime/presence
   */
  @Get('presence')
  getPresences(@Req() req?: unknown) {
    const identity = requireWorkspace(req);
    return {
      status: 'ok',
      data: this.realtimeService.getAllStaffPresences(identity.workspaceId),
    };
  }

  /**
   * Cập nhật trạng thái trực tuyến của nhân viên (Online / Away / Busy)
   * URL: POST /api/realtime/presence
   */
  @Post('presence')
  @HttpCode(HttpStatus.OK)
  updatePresence(@Body() body: UpdatePresenceDto, @Req() req?: unknown) {
    const identity = requireWorkspace(req);
    if (!VALID_PRESENCE.includes(body?.status)) {
      throw new BadRequestException('Trạng thái không hợp lệ.');
    }
    // staffId luôn là người đang đăng nhập; role hiển thị lấy từ tư cách thành viên đã xác minh
    const updated = this.realtimeService.updateStaffPresence(
      identity.userId,
      body.status,
      {
        name: body.name,
        avatar: body.avatar,
        role: identity.role,
      },
      identity.workspaceId,
    );

    return {
      status: 'ok',
      data: updated,
    };
  }

  /**
   * Giả lập gửi tin nhắn Inbound (dành cho kiểm thử realtime khi chưa cấu hình webhook live)
   * URL: POST /api/realtime/simulate-inbound
   */
  @Post('simulate-inbound')
  @HttpCode(HttpStatus.OK)
  simulateInboundMessage(@Body() body: SimulateInboundDto, @Req() req?: unknown) {
    assertNotProduction();
    const identity = requireOwner(req);
    const channel = body.channel || 'FACEBOOK';
    const conversationId = body.conversationId || `conv-sim-${Date.now()}`;
    const senderName = body.senderName || `Khách hàng (${channel})`;
    const content = body.content || 'Tin nhắn thử nghiệm từ khách hàng';

    const newMsg = {
      id: `msg-${Date.now()}`,
      conversationId,
      channel,
      direction: 'INBOUND' as const,
      content,
      senderName,
      senderAvatar: body.senderAvatar || '',
      customerPhone: body.customerPhone || '',
      customerEmail: body.customerEmail || '',
      sentAt: 'Vừa xong',
    };

    this.realtimeService.broadcastNewMessage({ ...newMsg, workspaceId: identity.workspaceId });

    return {
      status: 'ok',
      message: 'Đã phát sự kiện tin nhắn realtime thành công',
      data: newMsg,
    };
  }

  /**
   * Phát sự kiện cập nhật giai đoạn phễu tuyển sinh (Kanban)
   * URL: POST /api/realtime/pipeline-change
   */
  @Post('pipeline-change')
  @HttpCode(HttpStatus.OK)
  broadcastPipelineChange(@Body() body: PipelineChangeDto, @Req() req?: unknown) {
    assertNotProduction();
    const identity = requireOwner(req);
    this.realtimeService.broadcastPipelineChange({
      workspaceId: identity.workspaceId,
      customerId: body.customerId,
      customerName: body.customerName,
      newStage: body.newStage,
      previousStage: body.previousStage,
      updatedBy: body.updatedBy || 'Tư vấn viên',
    });

    return {
      status: 'ok',
      message: 'Đã phát sự kiện cập nhật phễu tuyển sinh thành công',
    };
  }
}
