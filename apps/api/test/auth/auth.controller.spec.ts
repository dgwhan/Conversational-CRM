import { describe, expect, it, vi } from 'vitest';
import { AuthController } from '../../src/modules/auth/presentation/controllers/auth.controller.js';

describe('AuthController Remember me cookie behavior', () => {
  const result = {
    response: {
      accessToken: 'access-token',
      user: {
        id: 'user-1',
        email: 'user@example.com',
        fullName: 'User',
        mustChangePassword: false,
      },
    },
    refreshToken: 'refresh-token',
    refreshTokenMaxAgeSeconds: 604800,
  };

  function createController() {
    const setCookie = vi.fn();
    const loginService = { login: vi.fn().mockResolvedValue(result) };
    const refreshTokenService = { refresh: vi.fn().mockResolvedValue(result) };
    const controller = new AuthController(
      loginService as never,
      {} as never,
      refreshTokenService as never,
      {} as never,
      { httpAdapter: { setCookie } } as never,
      { getOrThrow: vi.fn().mockReturnValue('test') } as never,
    );

    return { controller, setCookie };
  }

  it.each([
    { rememberMe: false, persistent: false },
    { rememberMe: true, persistent: true },
  ])('sets login cookie persistence from rememberMe=$rememberMe', async ({ rememberMe, persistent }) => {
    const { controller, setCookie } = createController();

    await controller.login(
      { identifier: 'user@example.com', password: 'password', rememberMe },
      '127.0.0.1',
      undefined,
      {},
    );

    const options = setCookie.mock.calls[0][3] as Record<string, unknown>;
    expect(options).toHaveProperty('httpOnly', true);
    if (persistent) {
      expect(options).toHaveProperty('maxAge', 604800);
    } else {
      expect(options).not.toHaveProperty('maxAge');
    }
  });

  it.each([
    { rememberMe: false, persistent: false },
    { rememberMe: true, persistent: true },
  ])('preserves rememberMe when rotating the refresh cookie', async ({ rememberMe, persistent }) => {
    const { controller, setCookie } = createController();

    await controller.refresh(
      'refresh_token=old-token',
      undefined,
      rememberMe,
      '127.0.0.1',
      undefined,
      {},
    );

    const options = setCookie.mock.calls[0][3] as Record<string, unknown>;
    if (persistent) {
      expect(options).toHaveProperty('maxAge', 604800);
    } else {
      expect(options).not.toHaveProperty('maxAge');
    }
  });
});
