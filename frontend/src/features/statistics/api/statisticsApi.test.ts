import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { saveSession, type AuthSession } from '@/features/auth/session';
import { ApiRequestError } from '@/lib/apiClient';
import { server } from '@/test/server';
import { statisticsApi } from './statisticsApi';

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

describe('statisticsApi.getPersonalStatistics', () => {
  it('returns the per-difficulty metrics from the response', async () => {
    saveSession(session());
    server.use(
      http.get(`${API_URL}/api/solo-attempts/statistics`, () =>
        HttpResponse.json({
          data: {
            difficulties: [
              {
                averageCpm: 250,
                averageDurationMs: 30_000,
                difficulty: 'EASY',
                fastestDurationMs: 20_000,
                highestCpm: 300,
              },
            ],
          },
        }),
      ),
    );

    const stats = await statisticsApi.getPersonalStatistics();

    expect(stats).toEqual([
      {
        averageCpm: 250,
        averageDurationMs: 30_000,
        difficulty: 'EASY',
        fastestDurationMs: 20_000,
        highestCpm: 300,
      },
    ]);
  });

  it('rejects with a session-expired error when unauthorized', async () => {
    saveSession(session());
    server.use(
      http.get(`${API_URL}/api/solo-attempts/statistics`, () =>
        HttpResponse.json(
          {
            code: 'AUTHENTICATION_REQUIRED',
            instance: '/api/solo-attempts/statistics',
            message: 'expired',
            status: 401,
          },
          { status: 401 },
        ),
      ),
    );

    await expect(statisticsApi.getPersonalStatistics()).rejects.toMatchObject({
      code: 'AUTHENTICATION_REQUIRED',
    });
  });

  it('rejects with a network error when the request fails', async () => {
    saveSession(session());
    server.use(
      http.get(`${API_URL}/api/solo-attempts/statistics`, () =>
        HttpResponse.error(),
      ),
    );

    await expect(statisticsApi.getPersonalStatistics()).rejects.toBeInstanceOf(
      ApiRequestError,
    );
  });
});

describe('statisticsApi.getGlobalLeaderboard', () => {
  it('returns the ranked entries from the response, requesting the given difficulty', async () => {
    saveSession(session());
    let requestUrl: URL | undefined;
    server.use(
      http.get(`${API_URL}/api/solo-attempts/global-leaderboard`, ({ request }) => {
        requestUrl = new URL(request.url);
        return HttpResponse.json({
          data: {
            difficulty: 'EASY',
            entries: [
              { cpm: 600, durationMs: 17_000, rank: 1, username: 'zoomer' },
              { cpm: 500, durationMs: 18_000, rank: 2, username: 'racer' },
            ],
          },
        });
      }),
    );

    const entries = await statisticsApi.getGlobalLeaderboard('EASY');

    expect(entries).toEqual([
      { cpm: 600, durationMs: 17_000, rank: 1, username: 'zoomer' },
      { cpm: 500, durationMs: 18_000, rank: 2, username: 'racer' },
    ]);
    expect(requestUrl?.searchParams.get('difficulty')).toBe('EASY');
  });

  it('returns an empty list for a difficulty with no completed attempts', async () => {
    saveSession(session());
    server.use(
      http.get(`${API_URL}/api/solo-attempts/global-leaderboard`, () =>
        HttpResponse.json({ data: { difficulty: 'HARD', entries: [] } }),
      ),
    );

    await expect(statisticsApi.getGlobalLeaderboard('HARD')).resolves.toEqual(
      [],
    );
  });

  it('rejects with a session-expired error when unauthorized', async () => {
    saveSession(session());
    server.use(
      http.get(`${API_URL}/api/solo-attempts/global-leaderboard`, () =>
        HttpResponse.json(
          {
            code: 'AUTHENTICATION_REQUIRED',
            instance: '/api/solo-attempts/global-leaderboard',
            message: 'expired',
            status: 401,
          },
          { status: 401 },
        ),
      ),
    );

    await expect(
      statisticsApi.getGlobalLeaderboard('EASY'),
    ).rejects.toMatchObject({ code: 'AUTHENTICATION_REQUIRED' });
  });

  it('rejects with a network error when the request fails', async () => {
    saveSession(session());
    server.use(
      http.get(`${API_URL}/api/solo-attempts/global-leaderboard`, () =>
        HttpResponse.error(),
      ),
    );

    await expect(
      statisticsApi.getGlobalLeaderboard('EASY'),
    ).rejects.toBeInstanceOf(ApiRequestError);
  });
});

describe('statisticsApi.getSnippetStatistics', () => {
  it('returns the personal-best-per-snippet list from the response', async () => {
    saveSession(session());
    server.use(
      http.get(`${API_URL}/api/solo-attempts/snippet-statistics`, () =>
        HttpResponse.json({
          data: {
            snippets: [
              {
                bestCpm: 452,
                bestDurationMs: 41_000,
                bestFinishedAt: '2026-07-22T12:00:00Z',
                categoryName: 'Java',
                difficulty: 'EASY',
                snippetId: 'snippet-1',
                snippetTitle: 'Two Sum',
              },
            ],
          },
        }),
      ),
    );

    const stats = await statisticsApi.getSnippetStatistics();

    expect(stats).toEqual([
      {
        bestCpm: 452,
        bestDurationMs: 41_000,
        bestFinishedAt: '2026-07-22T12:00:00Z',
        categoryName: 'Java',
        difficulty: 'EASY',
        snippetId: 'snippet-1',
        snippetTitle: 'Two Sum',
      },
    ]);
  });

  it('returns an empty list when the player has no completed attempts', async () => {
    saveSession(session());
    server.use(
      http.get(`${API_URL}/api/solo-attempts/snippet-statistics`, () =>
        HttpResponse.json({ data: { snippets: [] } }),
      ),
    );

    await expect(statisticsApi.getSnippetStatistics()).resolves.toEqual([]);
  });
});

describe('statisticsApi.getAttemptHistory', () => {
  it('returns the page content from the response', async () => {
    saveSession(session());
    server.use(
      http.get(`${API_URL}/api/solo-attempts`, () =>
        HttpResponse.json({
          data: {
            content: [
              {
                attemptId: 'attempt-1',
                cpm: 452,
                difficulty: 'EASY',
                durationMs: 41_201,
                finishedAt: '2026-07-22T12:00:00Z',
                snippet: {
                  category: 'JAVA',
                  snippetId: 'snippet-1',
                  title: 'Two Sum',
                },
              },
            ],
            page: { number: 0, size: 10, totalElements: 1, totalPages: 1 },
          },
        }),
      ),
    );

    const history = await statisticsApi.getAttemptHistory('EASY');

    expect(history).toEqual([
      {
        attemptId: 'attempt-1',
        cpm: 452,
        difficulty: 'EASY',
        durationMs: 41_201,
        finishedAt: '2026-07-22T12:00:00Z',
        snippet: {
          category: 'JAVA',
          snippetId: 'snippet-1',
          title: 'Two Sum',
        },
      },
    ]);
  });

  it('requests only completed attempts for the given difficulty', async () => {
    saveSession(session());
    let requestUrl: URL | undefined;
    server.use(
      http.get(`${API_URL}/api/solo-attempts`, ({ request }) => {
        requestUrl = new URL(request.url);
        return HttpResponse.json({
          data: {
            content: [],
            page: { number: 0, size: 10, totalElements: 0, totalPages: 0 },
          },
        });
      }),
    );

    await statisticsApi.getAttemptHistory('HARD');

    expect(requestUrl?.searchParams.get('state')).toBe('COMPLETED');
    expect(requestUrl?.searchParams.get('difficulty')).toBe('HARD');
  });

  it('rejects with a session-expired error when unauthorized', async () => {
    saveSession(session());
    server.use(
      http.get(`${API_URL}/api/solo-attempts`, () =>
        HttpResponse.json(
          {
            code: 'AUTHENTICATION_REQUIRED',
            instance: '/api/solo-attempts',
            message: 'expired',
            status: 401,
          },
          { status: 401 },
        ),
      ),
    );

    await expect(statisticsApi.getAttemptHistory('EASY')).rejects.toMatchObject(
      { code: 'AUTHENTICATION_REQUIRED' },
    );
  });

  it('returns an empty list when there are no completed attempts', async () => {
    saveSession(session());
    server.use(
      http.get(`${API_URL}/api/solo-attempts`, () =>
        HttpResponse.json({
          data: {
            content: [],
            page: { number: 0, size: 10, totalElements: 0, totalPages: 0 },
          },
        }),
      ),
    );

    await expect(statisticsApi.getAttemptHistory('EASY')).resolves.toEqual([]);
  });
});
