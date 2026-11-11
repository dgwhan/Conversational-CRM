import { randomUUID } from 'node:crypto';
import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { JwtSettings, JwtTokenResult, JwtUser } from './jwt.types.js';

export * from './jwt.types.js';

export const DEFAULT_ACCESS_TTL_MINUTES = 15;
export const DEFAULT_JWT_ISSUER = 'CUSC-Recruitment-CRM';
export const DEFAULT_JWT_AUDIENCE = 'CUSC-Recruitment-CRM-Client';

export function parseTtlToMinutes(ttl?: string | number | null): number | null {
  if (ttl === null || ttl === undefined) return null;
  if (typeof ttl === 'number') return Number.isNaN(ttl) ? null : ttl;
  const match = ttl.toString().trim().match(/^(\d+)\s*(m|h|d|s)?$/i);
  if (!match) return null;
  const val = parseInt(match[1], 10);
  const unit = (match[2] || 'm').toLowerCase();
  if (unit === 's') return Math.max(1, Math.round(val / 60));
  if (unit === 'h') return val * 60;
  if (unit === 'd') return val * 60 * 24;
  return val;
}

@Injectable()
export class JwtTokenService {
  private readonly _jwtSettings: JwtSettings;
  private readonly _jwtService: JwtService;

  constructor(
    @Optional() private readonly configService?: ConfigService,
    @Optional() jwtService?: JwtService,
  ) {
    let key = '';
    if (this.configService) {
      key = this.configService.get<string>('JWT_ACCESS_SECRET') || '';
    }
    if (!key && process.env.JWT_ACCESS_SECRET) {
      key = process.env.JWT_ACCESS_SECRET;
    }
    if (!key) {
      throw new Error(
        'Bảo mật JWT: JWT_ACCESS_SECRET không được để trống hoặc thiếu cấu hình.',
      );
    }

    let issuer = DEFAULT_JWT_ISSUER;
    if (this.configService) {
      const configuredIssuer = this.configService.get<string>('JWT_ISSUER');
      if (configuredIssuer) {
        issuer = configuredIssuer;
      }
    } else if (process.env.JWT_ISSUER) {
      issuer = process.env.JWT_ISSUER;
    }

    let audience = DEFAULT_JWT_AUDIENCE;
    if (this.configService) {
      const configuredAudience =
        this.configService.get<string>('JWT_AUDIENCE');
      if (configuredAudience) {
        audience = configuredAudience;
      }
    } else if (process.env.JWT_AUDIENCE) {
      audience = process.env.JWT_AUDIENCE;
    }

    // JWT_ACCESS_TTL (vd: "15m", "1h") là cấu hình chính. JWT_EXPIRES_IN_MINUTES chỉ còn để tương thích ngược
    // và chỉ được dùng khi JWT_ACCESS_TTL không được đặt. Mặc định an toàn 15 phút.
    const readSetting = (name: string): string | number | undefined => {
      const value = this.configService
        ? this.configService.get<string | number>(name)
        : process.env[name];
      return value === '' || value === null ? undefined : value;
    };

    let expiresInMinutes = DEFAULT_ACCESS_TTL_MINUTES;
    const rawExpires = readSetting('JWT_ACCESS_TTL') ?? readSetting('JWT_EXPIRES_IN_MINUTES');
    if (rawExpires !== undefined) {
      const parsed = parseTtlToMinutes(rawExpires);
      if (parsed === null || Number.isNaN(parsed) || parsed <= 0) {
        throw new Error(`Bảo mật JWT: thời hạn Access Token không hợp lệ: "${String(rawExpires)}"`);
      }
      expiresInMinutes = parsed;
    }

    this._jwtSettings = {
      Key: key,
      Issuer: issuer,
      Audience: audience,
      ExpiresInMinutes: expiresInMinutes,
    };

    if (jwtService) {
      this._jwtService = jwtService;
    } else {
      this._jwtService = new JwtService();
    }
  }

  public getSettings(): JwtSettings {
    return this._jwtSettings;
  }

  public generateToken(user: JwtUser): JwtTokenResult {
    const expires = new Date(
      Date.now() + this._jwtSettings.ExpiresInMinutes * 60 * 1000,
    );

    let uniqueName = user.email;
    if (user.username && user.username.trim().length > 0) {
      uniqueName = user.username.trim();
    } else if (user.fullName && user.fullName.trim().length > 0) {
      uniqueName = user.fullName.trim();
    }

    const claims: Record<string, unknown> = {
      jti: randomUUID(),
      sub: user.id.toString(),
      unique_name: uniqueName,
      email: user.email,
    };

    if (user.role) {
      claims.role = user.role;
    }

    if (typeof user.tokenVersion === 'number') {
      claims.tokenVersion = user.tokenVersion;
    }

    const accessToken = this._jwtService.sign(claims, {
      secret: this._jwtSettings.Key,
      issuer: this._jwtSettings.Issuer,
      audience: this._jwtSettings.Audience,
      expiresIn: `${this._jwtSettings.ExpiresInMinutes}m`,
    });

    const tokenResult: JwtTokenResult = {
      accessToken: accessToken,
      expiresAt: expires,
      ExpiresAt: expires,
    };

    return tokenResult;
  }

  /**
   * Alias for generateToken for backwards compatibility
   */
  public GenerateToken(user: JwtUser): JwtTokenResult {
    return this.generateToken(user);
  }
}
