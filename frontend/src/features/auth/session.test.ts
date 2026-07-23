import { describe, expect, it } from 'vitest';
import {
  clearSession,
  loadSession,
  saveSession,
  type AuthSession,
} from './session';

function session(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    accessToken: 'jwt-token',
    expiresAt: Date.now() + 60_000,
    tokenType: 'Bearer',
    user: {
      createdAt: '2026-07-16T12:00:00Z',
      email: 'player@example.com',
      emailVerified: true,
      id: '019f66a0-981f-7368-aec1-4e814cc269f1',
      role: 'USER',
      updatedAt: '2026-07-16T12:00:00Z',
      username: 'player',
    },
    ...overrides,
  };
}

describe('auth session storage', () => {
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
});
