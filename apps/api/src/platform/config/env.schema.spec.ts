import { describe, it, expect } from 'vitest';
import { validateEnv } from './env.schema.js';

const baseEnv = {
  NODE_ENV: 'test',
  TOKEN_ENCRYPTION_KEY: 'test_token_encryption_key_0123456789ab',
};

const recoveryKeys = {
  PASSWORD_RECOVERY_EMAIL_HMAC_KEY: Buffer.alloc(32, 1).toString('base64'),
  PASSWORD_RECOVERY_OTP_HMAC_KEY: Buffer.alloc(32, 2).toString('base64'),
  PASSWORD_RECOVERY_OTP_ENCRYPTION_KEY: Buffer.alloc(32, 3).toString('base64'),
};

describe('validateEnv (Security & Configuration Integrity)', () => {
  it('should throw an error with clear message when DATABASE_URL is missing', () => {
    const invalidConfig = {
      NODE_ENV: 'development',
      PORT: '3000',
    };

    expect(() => validateEnv(invalidConfig)).toThrowError(
      /DATABASE_URL is required/,
    );
  });

  it('should throw an error when DATABASE_URL is empty', () => {
    const invalidConfig = {
      DATABASE_URL: '',
    };

    expect(() => validateEnv(invalidConfig)).toThrowError(
      /DATABASE_URL cannot be empty/,
    );
  });

  it('should validate and parse valid environment configuration successfully in development', () => {
    const validConfig = {
      ...baseEnv,
      ...recoveryKeys,
      DATABASE_URL:
        'postgresql://postgres:postgres@localhost:5432/crm?schema=public',
      PORT: '4000',
      NODE_ENV: 'development',
      JWT_ACCESS_SECRET: 'daylasecretkeysieucapbimat32kytu',
    };

    const parsed = validateEnv(validConfig);
    expect(parsed.DATABASE_URL).toBe(
      'postgresql://postgres:postgres@localhost:5432/crm?schema=public',
    );
    expect(parsed.PORT).toBe(4000);
    expect(parsed.NODE_ENV).toBe('development');
    expect(parsed.JWT_ACCESS_SECRET).toBe('daylasecretkeysieucapbimat32kytu');
  });

  it('should strictly reject default sample keys in production environment', () => {
    const insecureProdConfig = {
      ...baseEnv,
      ...recoveryKeys,
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/crm?schema=public',
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: 'daylasecretkeysieucapbimat32kytu', // default sample key
    };

    expect(() => validateEnv(insecureProdConfig)).toThrowError(
      /In production, JWT_ACCESS_SECRET must not use the default sample key/,
    );
  });

  it('should accept secure, unique secrets in production mode', () => {
    const secureProdConfig = {
      ...recoveryKeys,
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/crm?schema=public',
      PORT: '3000',
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: 'production_super_strong_jwt_access_secret_key_12345',
      TOKEN_ENCRYPTION_KEY: 'production_super_strong_token_encryption_key_12345',
      FRONTEND_URL: 'https://crm.cusc.vn',
      APP_BASE_URL: 'https://api.crm.cusc.vn',
      REDIS_URL: 'redis://redis:6379',
    };

    const parsed = validateEnv(secureProdConfig);
    expect(parsed.NODE_ENV).toBe('production');
    expect(parsed.JWT_ACCESS_SECRET).toBe('production_super_strong_jwt_access_secret_key_12345');
    expect(parsed.TOKEN_ENCRYPTION_KEY).toBe('production_super_strong_token_encryption_key_12345');
    expect(parsed.FRONTEND_URL).toBe('https://crm.cusc.vn');
    expect(parsed.PASSWORD_RECOVERY_DELIVERY_POLL_INTERVAL_SECONDS).toBe(5);
    expect(parsed.PASSWORD_RECOVERY_IP_VERIFY_LIMIT).toBe(20);
    expect(parsed.PASSWORD_RECOVERY_DELIVERY_LEASE_SECONDS).toBe(60);
    expect(parsed.PASSWORD_RECOVERY_DELIVERY_MAX_ATTEMPTS).toBe(5);
    expect(parsed.PASSWORD_RECOVERY_DELIVERY_RETRY_BASE_SECONDS).toBe(30);
    expect(parsed.PASSWORD_RECOVERY_DELIVERY_BATCH_SIZE).toBe(20);
    expect(parsed.PASSWORD_RECOVERY_DELIVERY_MAX_RETRY_DELAY_SECONDS).toBe(3600);
    expect(parsed.PASSWORD_RECOVERY_CHALLENGE_STATE_RETRY_LIMIT).toBe(20);
    expect(parsed.PASSWORD_RECOVERY_RATE_LIMIT_SERIALIZATION_RETRY_LIMIT).toBe(3);
    expect(parsed.MAIL_SECURE).toBe(false);
  });

  it('should accept a complete SMTP configuration', () => {
    const parsed = validateEnv({
      ...baseEnv,
      ...recoveryKeys,
      DATABASE_URL:
        'postgresql://postgres:postgres@localhost:5432/crm?schema=public',
      JWT_ACCESS_SECRET: 'a'.repeat(32),
      MAIL_HOST: 'smtp.example.com',
      MAIL_PORT: '587',
      MAIL_SECURE: 'false',
      MAIL_USER: 'mailer',
      MAIL_PASSWORD: 'test-password',
      MAIL_FROM: 'Recruitment CRM <no-reply@example.com>',
    });

    expect(parsed.MAIL_HOST).toBe('smtp.example.com');
    expect(parsed.MAIL_PORT).toBe(587);
    expect(parsed.MAIL_SECURE).toBe(false);
    expect(parsed.MAIL_USER).toBe('mailer');
    expect(parsed.MAIL_FROM).toBe('Recruitment CRM <no-reply@example.com>');
  });

  it('should reject incomplete SMTP configuration', () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        ...recoveryKeys,
        DATABASE_URL:
          'postgresql://postgres:postgres@localhost:5432/crm?schema=public',
        JWT_ACCESS_SECRET: 'a'.repeat(32),
        MAIL_HOST: 'smtp.example.com',
      }),
    ).toThrowError(/MAIL_PORT is required when SMTP is configured/);
  });

  it('should require SMTP username and password together', () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        ...recoveryKeys,
        DATABASE_URL:
          'postgresql://postgres:postgres@localhost:5432/crm?schema=public',
        JWT_ACCESS_SECRET: 'a'.repeat(32),
        MAIL_HOST: 'smtp.example.com',
        MAIL_PORT: '587',
        MAIL_FROM: 'no-reply@example.com',
        MAIL_USER: 'mailer',
      }),
    ).toThrowError(/MAIL_USER and MAIL_PASSWORD must be provided together/);
  });

  it('should treat blank SMTP settings as disabled', () => {
    const parsed = validateEnv({
      ...baseEnv,
      ...recoveryKeys,
      DATABASE_URL:
        'postgresql://postgres:postgres@localhost:5432/crm?schema=public',
      JWT_ACCESS_SECRET: 'a'.repeat(32),
      MAIL_HOST: '',
      MAIL_PORT: '',
      MAIL_SECURE: 'false',
      MAIL_USER: '',
      MAIL_PASSWORD: '',
      MAIL_FROM: '',
    });

    expect(parsed.MAIL_HOST).toBeUndefined();
    expect(parsed.MAIL_PORT).toBeUndefined();
    expect(parsed.MAIL_SECURE).toBe(false);
  });

  it('should require recovery keys to decode to exactly 32 bytes', () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        ...recoveryKeys,
        DATABASE_URL:
          'postgresql://postgres:postgres@localhost:5432/crm?schema=public',
        JWT_ACCESS_SECRET: 'a'.repeat(32),
        PASSWORD_RECOVERY_EMAIL_HMAC_KEY: 'not-a-32-byte-key',
      }),
    ).toThrowError(/base64-encoded 32-byte key/);
  });
  describe('fail-secure defaults', () => {
    const common = {
      ...recoveryKeys,
      DATABASE_URL:
        'postgresql://postgres:postgres@localhost:5432/crm?schema=public',
      JWT_ACCESS_SECRET: 'a'.repeat(32),
    };

    it('should require NODE_ENV instead of silently defaulting to development', () => {
      expect(() =>
        validateEnv({
          ...common,
          TOKEN_ENCRYPTION_KEY: baseEnv.TOKEN_ENCRYPTION_KEY,
        }),
      ).toThrowError(/NODE_ENV is required/);
    });

    it('should require TOKEN_ENCRYPTION_KEY (no built-in default key)', () => {
      expect(() => validateEnv({ ...common, NODE_ENV: 'development' })).toThrowError(
        /TOKEN_ENCRYPTION_KEY is required/,
      );
    });

    it('should reject the leaked sample TOKEN_ENCRYPTION_KEY in production', () => {
      expect(() =>
        validateEnv({
          ...common,
          NODE_ENV: 'production',
          JWT_ACCESS_SECRET: 'production_super_strong_jwt_access_secret_key_12345',
          TOKEN_ENCRYPTION_KEY:
            '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        }),
      ).toThrowError(/TOKEN_ENCRYPTION_KEY must be a unique/);
    });

    it('should require a Zalo webhook secret in production when Zalo is enabled', () => {
      const prod = {
        ...common,
        NODE_ENV: 'production',
        JWT_ACCESS_SECRET: 'production_super_strong_jwt_access_secret_key_12345',
        TOKEN_ENCRYPTION_KEY: 'production_super_strong_token_encryption_key_12345',
        ZALO_APP_ID: '1234567890',
        REDIS_URL: 'redis://redis:6379',
      };
      expect(() => validateEnv(prod)).toThrowError(/ZALO_OA_SECRET_KEY/);
      expect(() => validateEnv({ ...prod, ZALO_OA_SECRET_KEY: 'zalo-webhook-secret' })).not.toThrow();
    });
  });

  describe('Redis & JWT TTL', () => {
    const prodBase = {
      ...recoveryKeys,
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/crm?schema=public',
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: 'production_super_strong_jwt_access_secret_key_12345',
      TOKEN_ENCRYPTION_KEY: 'production_super_strong_token_encryption_key_12345',
    };

    it('bắt buộc REDIS_URL ở production (hàng đợi bền vững, scale ngang)', () => {
      expect(() => validateEnv(prodBase)).toThrowError(/REDIS_URL/);
      expect(() => validateEnv({ ...prodBase, REDIS_URL: 'redis://redis:6379' })).not.toThrow();
    });

    it('JWT_EXPIRES_IN_MINUTES không còn giá trị mặc định che mất JWT_ACCESS_TTL', () => {
      const parsed = validateEnv({ ...prodBase, REDIS_URL: 'redis://redis:6379', JWT_ACCESS_TTL: '1h' });
      expect(parsed.JWT_ACCESS_TTL).toBe('1h');
      expect(parsed.JWT_EXPIRES_IN_MINUTES).toBeUndefined();
    });

    it('từ chối JWT_ACCESS_TTL sai định dạng', () => {
      expect(() => validateEnv({ ...prodBase, REDIS_URL: 'redis://redis:6379', JWT_ACCESS_TTL: 'forever' })).toThrowError(/JWT_ACCESS_TTL/);
    });
  });
});
