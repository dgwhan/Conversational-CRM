import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionContext, HttpException, HttpStatus, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import {
  RateLimiterService,
  RateLimitGuard,
  SecurityHeadersInterceptor,
  CsrfGuard,
  RATE_LIMIT_KEY,
  SKIP_RATE_LIMIT_KEY,
  SKIP_CSRF_KEY,
} from '../../src/common/security/index.js';
import { of } from 'rxjs';

describe('Security Protection Layer (DDoS, XSS, CSRF)', () => {
  // ==========================================
  // 1. DDoS & RATE LIMITING
  // ==========================================
  describe('DDoS Protection (RateLimiterService & RateLimitGuard)', () => {
    let rateLimiter: RateLimiterService;

    beforeEach(() => {
      rateLimiter = new RateLimiterService();
    });

    it('cho phép các request trong giới hạn rate limit', () => {
      const key = 'ip-test-1';
      const res1 = rateLimiter.checkLimit(key, 3, 1000);
      expect(res1.allowed).toBe(true);
      expect(res1.remaining).toBe(2);

      const res2 = rateLimiter.checkLimit(key, 3, 1000);
      expect(res2.allowed).toBe(true);
      expect(res2.remaining).toBe(1);

      const res3 = rateLimiter.checkLimit(key, 3, 1000);
      expect(res3.allowed).toBe(true);
      expect(res3.remaining).toBe(0);
    });

    it('chặn và trả về allowed: false khi vượt quá ngưỡng request (DDoS flood)', () => {
      const key = 'ip-test-2';
      rateLimiter.checkLimit(key, 2, 1000);
      rateLimiter.checkLimit(key, 2, 1000);

      const blockedRes = rateLimiter.checkLimit(key, 2, 1000);
      expect(blockedRes.allowed).toBe(false);
      expect(blockedRes.remaining).toBe(0);
      expect(blockedRes.resetInSeconds).toBeGreaterThanOrEqual(1);
    });

    it('tự động giải phóng dung lượng sau khi cửa sổ thời gian (TTL) trôi qua', () => {
      const key = 'ip-test-3';
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      rateLimiter.checkLimit(key, 1, 1000);
      expect(rateLimiter.checkLimit(key, 1, 1000).allowed).toBe(false);

      // Tua thời gian về phía trước 1001ms
      vi.spyOn(Date, 'now').mockReturnValue(now + 1001);
      const afterWindow = rateLimiter.checkLimit(key, 1, 1000);
      expect(afterWindow.allowed).toBe(true);

      vi.restoreAllMocks();
    });

    it('RateLimitGuard ném HttpException 429 khi vượt ngưỡng và thiết lập header chuẩn RFC', async () => {
      const reflector = new Reflector();
      const guard = new RateLimitGuard(reflector, rateLimiter);

      const headersSet: Record<string, string> = {};
      const mockReq = {
        headers: { 'x-forwarded-for': '203.0.113.195', 'x-test-rate-limit': 'true' },
        ip: '203.0.113.195',
      };
      const mockRes = {
        header: (name: string, val: string) => {
          headersSet[name] = val;
        },
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockReq,
          getResponse: () => mockRes,
        }),
        getHandler: () => () => {},
        getClass: () => class TestController {},
      } as unknown as ExecutionContext;

      vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
        if (key === RATE_LIMIT_KEY) return { limit: 2, ttlMs: 60000 };
        return null;
      });

      // Request 1: OK
      await expect(guard.canActivate(mockContext)).resolves.toBe(true);
      expect(headersSet['X-RateLimit-Limit']).toBe('2');
      expect(headersSet['X-RateLimit-Remaining']).toBe('1');

      // Request 2: OK
      await expect(guard.canActivate(mockContext)).resolves.toBe(true);
      expect(headersSet['X-RateLimit-Remaining']).toBe('0');

      // Request 3: Bị chặn với lỗi 429
      await expect(guard.canActivate(mockContext)).rejects.toThrow(HttpException);
      try {
        await guard.canActivate(mockContext);
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        expect(headersSet['Retry-After']).toBeDefined();
      }
    });

    it('RateLimitGuard không tin X-Forwarded-For do client tự đặt (không né giới hạn bằng giả IP)', async () => {
      const reflector = new Reflector();
      const guard = new RateLimitGuard(reflector, rateLimiter);
      let forwarded = '1.1.1.1';
      const mockContext = {
        switchToHttp: () => ({
          // req.ip là IP kết nối thật (Fastify chỉ dùng X-Forwarded-For khi cấu hình TRUST_PROXY)
          getRequest: () => ({ headers: { 'x-forwarded-for': forwarded, 'x-test-rate-limit': 'true' }, ip: '198.51.100.7' }),
          getResponse: () => ({ header: vi.fn() }),
        }),
        getHandler: () => () => {},
        getClass: () => class SpoofController {},
      } as unknown as ExecutionContext;

      vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
        if (key === RATE_LIMIT_KEY) return { limit: 1, ttlMs: 60000 };
        return null;
      });

      await expect(guard.canActivate(mockContext)).resolves.toBe(true);
      forwarded = '2.2.2.2'; // đổi header giả IP
      await expect(guard.canActivate(mockContext)).rejects.toThrow(HttpException);
    });

    it('RateLimitGuard bỏ qua kiểm tra khi có decorator @SkipRateLimit', async () => {
      const reflector = new Reflector();
      const guard = new RateLimitGuard(reflector, rateLimiter);
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({ headers: {} }),
          getResponse: () => ({ header: vi.fn() }),
        }),
        getHandler: () => () => {},
        getClass: () => class TestController {},
      } as unknown as ExecutionContext;

      vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
        if (key === SKIP_RATE_LIMIT_KEY) return true;
        return null;
      });

      await expect(guard.canActivate(mockContext)).resolves.toBe(true);
    });
  });

  // ==========================================
  // 2. XSS DEFENSE
  // ==========================================
  describe('XSS Protection (SecurityHeadersInterceptor)', () => {
    it('SecurityHeadersInterceptor thiết lập đầy đủ các HTTP Security Headers theo khuyến nghị OWASP', async () => {
      const interceptor = new SecurityHeadersInterceptor();
      const headersSet: Record<string, string> = {};
      const mockRes = {
        header: (name: string, val: string) => {
          headersSet[name] = val;
        },
      };
      const mockContext = {
        switchToHttp: () => ({
          getResponse: () => mockRes,
        }),
      } as unknown as ExecutionContext;

      const callHandler = {
        handle: () => of('test-response'),
      };

      await interceptor.intercept(mockContext, callHandler).toPromise();

      expect(headersSet['Content-Security-Policy']).toContain("default-src 'none'");
      expect(headersSet['Content-Security-Policy']).not.toContain('unsafe-inline');
      expect(headersSet['Content-Security-Policy']).not.toContain('unsafe-eval');
      expect(headersSet['X-Content-Type-Options']).toBe('nosniff');
      expect(headersSet['X-Frame-Options']).toBe('DENY');
      expect(headersSet['X-XSS-Protection']).toBe('1; mode=block');
      expect(headersSet['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
      expect(headersSet['Permissions-Policy']).toBe('camera=(), microphone=(), geolocation=()');
    });

    it('SecurityHeadersInterceptor gửi HSTS ở production', async () => {
      const previous = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        const interceptor = new SecurityHeadersInterceptor();
        const headersSet: Record<string, string> = {};
        const mockContext = {
          switchToHttp: () => ({
            getResponse: () => ({ header: (name: string, val: string) => { headersSet[name] = val; } }),
          }),
        } as unknown as ExecutionContext;
        await interceptor.intercept(mockContext, { handle: () => of('ok') }).toPromise();
        expect(headersSet['Strict-Transport-Security']).toContain('max-age=');
      } finally {
        process.env.NODE_ENV = previous;
      }
    });
  });

  // ==========================================
  // 3. CSRF PROTECTION
  // ==========================================
  describe('CSRF Protection (CsrfGuard)', () => {
    let reflector: Reflector;
    let configService: ConfigService;
    let csrfGuard: CsrfGuard;

    beforeEach(() => {
      reflector = new Reflector();
      configService = new ConfigService({
        FRONTEND_URL: 'https://crm.cusc.vn,http://localhost:5173',
      });
      csrfGuard = new CsrfGuard(reflector, configService);
    });

    const createMockContext = (method: string, headers: Record<string, string> = {}, url: string = '/api/customers') => {
      const req = {
        method,
        headers,
        url,
      };
      return {
        switchToHttp: () => ({
          getRequest: () => req,
        }),
        getHandler: () => () => {},
        getClass: () => class TestController {},
      } as unknown as ExecutionContext;
    };

    it('cho phép mọi HTTP Safe Methods (GET, HEAD, OPTIONS) đi qua', () => {
      expect(csrfGuard.canActivate(createMockContext('GET'))).toBe(true);
      expect(csrfGuard.canActivate(createMockContext('HEAD'))).toBe(true);
      expect(csrfGuard.canActivate(createMockContext('OPTIONS'))).toBe(true);
    });

    it('cho phép bỏ qua CSRF với decorator @SkipCsrf() hoặc route webhook', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
        if (key === SKIP_CSRF_KEY) return true;
        return null;
      });

      expect(csrfGuard.canActivate(createMockContext('POST'))).toBe(true);

      // Webhook route tự động bypass
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
      const webhookContext = createMockContext('POST', {}, '/api/webhook/facebook');
      expect(csrfGuard.canActivate(webhookContext)).toBe(true);
    });

    it('chấp nhận request POST từ Origin hợp lệ trong danh sách cấu hình', () => {
      const ctx = createMockContext('POST', {
        origin: 'https://crm.cusc.vn',
      });
      expect(csrfGuard.canActivate(ctx)).toBe(true);
    });

    it('chấp nhận request POST từ localhost trong môi trường phát triển', () => {
      const ctx = createMockContext('POST', {
        origin: 'http://localhost:5173',
      });
      expect(csrfGuard.canActivate(ctx)).toBe(true);
    });

    it('chặn và ném ForbiddenException khi phát hiện Origin giả mạo từ trang độc hại', () => {
      const ctx = createMockContext('POST', {
        origin: 'https://attacker-evil-site.com',
      });
      expect(() => csrfGuard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('chặn và ném ForbiddenException khi phát hiện Referer giả mạo từ trang độc hại', () => {
      const ctx = createMockContext('POST', {
        referer: 'https://phishing-domain.xyz/attack.html',
      });
      expect(() => csrfGuard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('cho phép request có Custom Header chống CSRF (Authorization, x-workspace-id, X-Requested-With) hoặc JSON Content-Type', () => {
      const ctxAuth = createMockContext('POST', {
        authorization: 'Bearer sample-access-token-123',
      });
      expect(csrfGuard.canActivate(ctxAuth)).toBe(true);

      const ctxJson = createMockContext('POST', {
        'content-type': 'application/json',
      });
      expect(csrfGuard.canActivate(ctxJson)).toBe(true);

      const ctxCustom = createMockContext('POST', {
        'x-requested-with': 'XMLHttpRequest',
      });
      expect(csrfGuard.canActivate(ctxCustom)).toBe(true);
    });

    it('từ chối POST request thuần từ form HTML không có Origin, Referer hay Custom Header hợp lệ', () => {
      const ctxPlain = createMockContext('POST', {
        'content-type': 'application/x-www-form-urlencoded',
      });
      expect(() => csrfGuard.canActivate(ctxPlain)).toThrow(ForbiddenException);
    });
  });
});
