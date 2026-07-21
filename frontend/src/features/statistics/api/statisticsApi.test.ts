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
