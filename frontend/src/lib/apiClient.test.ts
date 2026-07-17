import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { apiRequest, ApiRequestError } from './apiClient';
import { saveSession, type AuthSession } from '@/features/auth/session';
import { server } from '@/test/server';

const API_URL = 'http://localhost:8080';

function storeSession(overrides: Partial<AuthSession> = {}) {
  saveSession({
    accessToken: 'jwt-token',
    expiresAt: Date.now() + 60_000,
    tokenType: 'Bearer',
    user: {
      createdAt: '2026-07-16T12:00:00Z',
      email: 'admin@example.com',
      emailVerified: true,
      enabled: true,
      id: '019f66a0-981f-7368-aec1-4e814cc269f1',
      role: 'ADMIN',
      updatedAt: '2026-07-16T12:00:00Z',
      username: 'admin',
    },
    ...overrides,
  });
}

describe('apiRequest', () => {
  it('sends the bearer token when the request is authenticated', async () => {
    storeSession();
    let authorization: string | null = null;
    server.use(
      http.get(`${API_URL}/api/admin/categories`, ({ request }) => {
        authorization = request.headers.get('Authorization');
        return HttpResponse.json({ data: 'ok' });
      }),
    );

    await apiRequest('/api/admin/categories', { auth: true });

    expect(authorization).toBe('Bearer jwt-token');
  });

  it('omits the authorization header for public requests', async () => {
    storeSession();
    let authorization: string | null = 'unset';
    server.use(
      http.get(`${API_URL}/api/public`, ({ request }) => {
        authorization = request.headers.get('Authorization');
        return HttpResponse.json({ data: 'ok' });
      }),
    );

    await apiRequest('/api/public');

    expect(authorization).toBeNull();
  });

  it('fails fast when an authenticated request has no session', async () => {
    await expect(
      apiRequest('/api/admin/categories', { auth: true }),
    ).rejects.toMatchObject({ code: 'SESSION_EXPIRED', status: 401 });
  });

  it('fails fast when the stored session has expired', async () => {
    storeSession({ expiresAt: Date.now() - 1 });

    await expect(
      apiRequest('/api/admin/categories', { auth: true }),
    ).rejects.toMatchObject({ code: 'SESSION_EXPIRED' });
  });

  it('returns nothing for a 204 response without parsing a body', async () => {
    storeSession();
    server.use(
      http.delete(`${API_URL}/api/admin/categories/1`, () =>
        HttpResponse.text(null, { status: 204 }),
      ),
    );

    await expect(
      apiRequest('/api/admin/categories/1', { auth: true, method: 'DELETE' }),
    ).resolves.toBeUndefined();
  });

  it('maps an ApiError body to ApiRequestError', async () => {
    server.use(
      http.get(`${API_URL}/api/admin/snippets`, () =>
        HttpResponse.json(
          {
            code: 'VERSION_CONFLICT',
            message: 'Snippet was changed by someone else',
            status: 409,
          },
          { status: 409 },
        ),
      ),
    );

    await expect(apiRequest('/api/admin/snippets')).rejects.toMatchObject({
      code: 'VERSION_CONFLICT',
      message: 'Snippet was changed by someone else',
      status: 409,
    });
  });

  it('falls back to the status text when the error body is not JSON', async () => {
    server.use(
      http.get(`${API_URL}/api/admin/snippets`, () =>
        HttpResponse.text('boom', { status: 500 }),
      ),
    );

    await expect(apiRequest('/api/admin/snippets')).rejects.toBeInstanceOf(
      ApiRequestError,
    );
  });

  it('reports a network failure without leaking the cause', async () => {
    server.use(
      http.get(`${API_URL}/api/admin/snippets`, () => HttpResponse.error()),
    );

    await expect(apiRequest('/api/admin/snippets')).rejects.toMatchObject({
      message: 'Network request failed',
    });
  });
});
