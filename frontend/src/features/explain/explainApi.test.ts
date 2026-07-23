import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { saveSession } from '@/features/auth/session';
import { server } from '@/test/server';
import {
  ExplainError,
  fetchExplanation,
  type ExplanationData,
} from './explainApi';

const API_URL = 'http://localhost:8080';

const EXPLANATION: ExplanationData = {
  bestPractices: ['Use constants for magic numbers'],
  concepts: ['for-each loop', 'modulo operator'],
  stepByStep: ['Iterate over the array', 'Check divisibility'],
  summary: 'This code prints FizzBuzz.',
};

beforeEach(() => {
  saveSession({
    accessToken: 'jwt-token',
    expiresAt: Date.now() + 60_000,
    tokenType: 'Bearer',
    user: {
      createdAt: '2026-07-16T12:00:00Z',
      email: 'admin@example.com',
      emailVerified: true,
      id: 'u1',
      role: 'ADMIN',
      updatedAt: '2026-07-16T12:00:00Z',
      username: 'admin',
    },
  });
});

describe('fetchExplanation', () => {
  it('returns explanation data on success', async () => {
    server.use(
      http.get(`${API_URL}/api/admin/snippets/s1/explanation`, () =>
        HttpResponse.json({ data: EXPLANATION }),
      ),
    );

    const result = await fetchExplanation('s1');
    expect(result).toEqual(EXPLANATION);
  });

  it('throws auth-expired for 401', async () => {
    server.use(
      http.get(`${API_URL}/api/admin/snippets/s1/explanation`, () =>
        HttpResponse.json({ message: 'Unauthorized' }, { status: 401 }),
      ),
    );

    await expect(fetchExplanation('s1')).rejects.toThrow(ExplainError);
    try {
      await fetchExplanation('s1');
    } catch (e) {
      expect((e as ExplainError).kind).toBe('auth-expired');
    }
  });

  it('throws forbidden for 403', async () => {
    server.use(
      http.get(`${API_URL}/api/admin/snippets/s1/explanation`, () =>
        HttpResponse.json({ message: 'Forbidden' }, { status: 403 }),
      ),
    );

    try {
      await fetchExplanation('s1');
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ExplainError);
      expect((e as ExplainError).kind).toBe('forbidden');
    }
  });

  it('throws not-found for 404', async () => {
    server.use(
      http.get(`${API_URL}/api/admin/snippets/s1/explanation`, () =>
        HttpResponse.json({ message: 'Not found' }, { status: 404 }),
      ),
    );

    try {
      await fetchExplanation('s1');
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ExplainError);
      expect((e as ExplainError).kind).toBe('not-found');
    }
  });

  it('throws rate-limited for 429', async () => {
    server.use(
      http.get(`${API_URL}/api/admin/snippets/s1/explanation`, () =>
        HttpResponse.json({ message: 'Too many' }, { status: 429 }),
      ),
    );

    try {
      await fetchExplanation('s1');
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ExplainError);
      expect((e as ExplainError).kind).toBe('rate-limited');
    }
  });

  it('throws provider-unavailable for 503', async () => {
    server.use(
      http.get(`${API_URL}/api/admin/snippets/s1/explanation`, () =>
        HttpResponse.json({ message: 'Down' }, { status: 503 }),
      ),
    );

    try {
      await fetchExplanation('s1');
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ExplainError);
      expect((e as ExplainError).kind).toBe('provider-unavailable');
    }
  });

  it('throws generic for network errors', async () => {
    server.use(
      http.get(`${API_URL}/api/admin/snippets/s1/explanation`, () =>
        HttpResponse.error(),
      ),
    );

    try {
      await fetchExplanation('s1');
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ExplainError);
      expect((e as ExplainError).kind).toBe('generic');
    }
  });
});
