import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { RealtimeService, type RealtimeAuthContext } from './realtime.service.js';

/**
 * Tiêu thụ ticket realtime (?ticket=) trước khi mở luồng SSE.
 * Chạy ở guard (bất đồng bộ) để có thể đánh dấu ticket "đã dùng" trên Redis, nhờ đó ticket
 * không dùng lại được ở instance khác. Request không có ticket hợp lệ nhận 401 như bình thường.
 */
@Injectable()
export class RealtimeTicketGuard implements CanActivate {
  constructor(private readonly realtimeService: RealtimeService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ query?: Record<string, unknown>; realtimeAuth?: RealtimeAuthContext }>();
    const auth = await this.realtimeService.consumeTicketShared(req.query?.ticket);
    if (!auth) {
      throw new UnauthorizedException('Ticket realtime không hợp lệ hoặc đã hết hạn.');
    }
    req.realtimeAuth = auth;
    return true;
  }
}
