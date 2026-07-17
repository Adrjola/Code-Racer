import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/server';
import {
  apiRequest,
  ApiRequestError,
  clearSession,
  loadSession,
  readableAuthError,
  saveSession,
  type AuthSession,
} from './auth';

function session(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    accessToken: 'jwt-token',
    expiresAt: Date.now() + 60_000,
    tokenType: 'Bearer',
    user: {
      createdAt: '2026-07-16T12:00:00Z',
      email: 'player@example.com',
      emailVerified: true,
      enabled: true,
      id: '019f66a0-981f-7368-aec1-4e814cc269f1',
      role: 'USER',
      updatedAt: '2026-07-16T12:00:00Z',
      username: 'player',
    },
    ...overrides,
  };
}

describe('auth utilities', () => {
  it('saves, loads, clears, and expires browser-session auth state', () => {
    expect(loadSession()).toBeNull();

    saveSession(session());
    expect(loadSession()?.accessToken).toBe('jwt-token');

    saveSession(session({ expiresAt: Date.now() - 1 }));
    expect(loadSession()).toBeNull();

    saveSession(session());
    clearSession();
    expect(loadSession()).toBeNull();
  });

  it('drops malformed stored sessions', () => {
    window.sessionStorage.setItem('code-racer.auth-session', 'not-json');

    expect(loadSession()).toBeNull();
    expect(window.sessionStorage.getItem('code-racer.auth-session')).toBeNull();
  });

  it('maps known API errors to user-safe messages', () => {
    expect(
      readableAuthError(
        new ApiRequestError(
          'Invalid email, username, or password',
          'INVALID_CREDENTIALS',
          401,
        ),
      ),
    ).toMatch(/email, username, or password/i);
    expect(
      readableAuthError(
        new ApiRequestError(
          'Too many attempts',
          'TOO_MANY_LOGIN_ATTEMPTS',
          429,
        ),
      ),
    ).toMatch(/too many/i);
    expect(
      readableAuthError(
        new ApiRequestError('Duplicate', 'USER_ALREADY_EXISTS', 409),
      ),
    ).toMatch(/already exists/i);
    expect(
      readableAuthError(
        new ApiRequestError(
          'Email verification link is invalid or expired',
          'EMAIL_VERIFICATION_FAILED',
          400,
        ),
      ),
    ).toMatch(/verification link is invalid or expired/i);
    expect(
      readableAuthError(
        new ApiRequestError('Validation failed', 'INVALID_INPUT', 400),
      ),
    ).toBe('Validation failed');
    expect(readableAuthError(new ApiRequestError('Server error'))).toBe(
      'Server error',
    );
    expect(readableAuthError(new Error('offline'))).toMatch(/cannot reach/i);
  });

  it('attaches an Authorization header for authenticated requests', async () => {
    let receivedAuth: string | null = null;
    server.use(
      http.get('http://localhost:8080/api/secure', ({ request }) => {
        receivedAuth = request.headers.get('Authorization');
        return HttpResponse.json({ data: 'ok' });
      }),
    );
    saveSession(session());

    await apiRequest('/api/secure', { authenticated: true });

    expect(receivedAuth).toBe('Bearer jwt-token');
  });

  it('rejects authenticated requests locally when there is no session', async () => {
    await expect(
      apiRequest('/api/secure', { authenticated: true }),
    ).rejects.toMatchObject({
      code: 'AUTHENTICATION_REQUIRED',
      status: 401,
    });
  });
});
