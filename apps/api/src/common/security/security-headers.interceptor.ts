import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Interceptor thiết lập các HTTP Security Headers tiêu chuẩn của OWASP:
 * - Content-Security-Policy (CSP): API chỉ trả JSON nên khóa chặt hoàn toàn (không script, không nhúng frame)
 * - Strict-Transport-Security (HSTS): bắt buộc HTTPS ở production
 * - X-Content-Type-Options: Ngăn chặn trình duyệt đoán định sai MIME-type (MIME-sniffing)
 * - X-Frame-Options: Chống tấn công Clickjacking
 * - X-XSS-Protection: Kích hoạt bộ lọc chống XSS phản xạ ở trình duyệt cũ
 * - Referrer-Policy: Ngăn lộ thông tin URL nhạy cảm qua Referer
 * - Permissions-Policy: Vô hiệu hóa các API phần cứng không cần thiết (camera, micro, geolocation)
 */
@Injectable()
export class SecurityHeadersInterceptor implements NestInterceptor {
  // API không phục vụ HTML/JS: không cho phép bất kỳ nguồn tài nguyên nào (không 'unsafe-inline' / 'unsafe-eval').
  // Route nào thực sự trả HTML (trang chẩn đoán chỉ dùng ở dev) tự đặt CSP riêng.
  private readonly cspPolicy = [
    "default-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');

  private readonly hstsPolicy = 'max-age=31536000; includeSubDomains';

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const res = context.switchToHttp().getResponse();

    this.setHeader(res, 'Content-Security-Policy', this.cspPolicy);
    this.setHeader(res, 'X-Content-Type-Options', 'nosniff');
    this.setHeader(res, 'X-Frame-Options', 'DENY');
    if (process.env.NODE_ENV === 'production') {
      this.setHeader(res, 'Strict-Transport-Security', this.hstsPolicy);
    }
    this.setHeader(res, 'X-XSS-Protection', '1; mode=block');
    this.setHeader(res, 'Referrer-Policy', 'strict-origin-when-cross-origin');
    this.setHeader(res, 'Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    return next.handle();
  }

  private setHeader(res: any, name: string, value: string): void {
    if (!res) return;
    if (typeof res.header === 'function') {
      res.header(name, value);
    } else if (typeof res.setHeader === 'function') {
      res.setHeader(name, value);
    }
  }
}
