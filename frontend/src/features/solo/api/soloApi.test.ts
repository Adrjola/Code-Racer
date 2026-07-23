import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { saveSession, type AuthSession } from '@/features/auth/session';
import { ApiRequestError } from '@/lib/apiClient';
import { server } from '@/test/server';
import {
  fetchCategories,
  fetchRandomSnippet,
  readableSoloError,
  startSoloAttempt,
  type CategoryOption,
  type SnippetPreview,
} from './soloApi';

const API_URL = 'http://localhost:8080';

function session(): AuthSession {
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
  };
}

const category: CategoryOption = {
  category: 'JAVA',
  displayName: 'Java',
};

const snippet: SnippetPreview = {
  category: 'JAVA',
  createdAt: '2026-07-01T00:00:00Z',
  difficulty: 'EASY',
  id: 'snippet-1',
  lifecycle: 'ACTIVE',
  source: 'public class Main {}',
  title: 'Hello World',
  updatedAt: '2026-07-01T00:00:00Z',
};

describe('soloApi', () => {
  it('fetches the fixed category list', async () => {
    server.use(
      http.get(`${API_URL}/api/categories`, () =>
        HttpResponse.json({ data: [category] }),
      ),
    );

    const categories = await fetchCategories();

    expect(categories).toEqual([category]);
  });

  it('requests a random snippet with the given filters and excludeId', async () => {
    const captured: { auth: string | null; url: string } = {
      auth: null,
      url: '',
    };
    server.use(
      http.get(`${API_URL}/api/snippets/random`, ({ request }) => {
        captured.url = request.url;
        captured.auth = request.headers.get('Authorization');
        return HttpResponse.json({ data: snippet });
      }),
    );
    saveSession(session());

    const result = await fetchRandomSnippet({
      category: 'JAVA',
      difficulty: 'EASY',
      excludeId: 'snippet-0',
    });

    expect(result).toEqual(snippet);
    expect(captured.auth).toBe('Bearer jwt-token');
    const params = new URL(captured.url).searchParams;
    expect(params.get('category')).toBe('JAVA');
    expect(params.get('difficulty')).toBe('EASY');
    expect(params.get('excludeId')).toBe('snippet-0');
  });

  it('requests a random snippet with no query params when no filters are given', async () => {
    const captured: { url: string } = { url: '' };
    server.use(
      http.get(`${API_URL}/api/snippets/random`, ({ request }) => {
        captured.url = request.url;
        return HttpResponse.json({ data: snippet });
      }),
    );
    saveSession(session());

    await fetchRandomSnippet();

    expect(new URL(captured.url).search).toBe('');
  });

  it('starts a solo attempt with the selected snippet id', async () => {
    let capturedBody: unknown;
    server.use(
      http.post(`${API_URL}/api/solo-attempts`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(
          {
            data: {
              attemptId: 'attempt-1',
              codeSnippetId: 'snippet-1',
              difficulty: 'EASY',
              startedAt: '2026-07-17T12:00:03Z',
            },
          },
          { status: 201 },
        );
      }),
    );
    saveSession(session());

    const result = await startSoloAttempt('snippet-1');

    expect(capturedBody).toEqual({ codeSnippetId: 'snippet-1' });
    expect(result.attemptId).toBe('attempt-1');
    expect(result.startedAt).toBe('2026-07-17T12:00:03Z');
  });

  it('maps known solo error codes to user-safe messages', () => {
    expect(
      readableSoloError(
        new ApiRequestError('none', 'NO_ELIGIBLE_SNIPPET', 404),
      ),
    ).toMatch(/no snippets match/i);
    expect(
      readableSoloError(
        new ApiRequestError('stale', 'SOLO_ATTEMPT_SNIPPET_UNAVAILABLE', 409),
      ),
    ).toMatch(/no longer available/i);
    expect(
      readableSoloError(
        new ApiRequestError('conflict', 'ONE_ACTIVE_ATTEMPT_ALLOWED', 409),
      ),
    ).toMatch(/already have an attempt/i);
    expect(
      readableSoloError(
        new ApiRequestError('expired', 'AUTHENTICATION_REQUIRED', 401),
      ),
    ).toMatch(/session has expired/i);
    expect(readableSoloError(new ApiRequestError('boom'))).toBe('boom');
    expect(readableSoloError(new Error('offline'))).toMatch(/cannot reach/i);
  });
});
