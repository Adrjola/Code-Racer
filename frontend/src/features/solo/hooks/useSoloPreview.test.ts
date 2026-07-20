import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveSession, type AuthSession } from '@/features/auth/session';
import { server } from '@/test/server';
import type { SnippetPreview } from '../api/soloApi';
import { useSoloPreview } from './useSoloPreview';

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
      enabled: true,
      id: '019f66a0-981f-7368-aec1-4e814cc269f1',
      role: 'USER',
      updatedAt: '2026-07-16T12:00:00Z',
      username: 'player',
    },
  };
}

function snippet(overrides: Partial<SnippetPreview> = {}): SnippetPreview {
  return {
    categoryId: 'cat-1',
    createdAt: '2026-07-01T00:00:00Z',
    difficulty: 'EASY',
    id: 'snippet-1',
    lifecycle: 'ACTIVE',
    revisionNumber: 1,
    snippetId: 'group-1',
    source: 'public class Main {}',
    title: 'Hello World',
    updatedAt: '2026-07-01T00:00:00Z',
    version: 0,
    ...overrides,
  };
}

function apiError(status: number, code: string, message = 'error') {
  return HttpResponse.json(
    { code, instance: '/x', message, status },
    { status },
  );
}

beforeEach(() => {
  saveSession(session());
});

describe('useSoloPreview', () => {
  it('loads a filtered snippet on mount without creating an attempt', async () => {
    let startCalls = 0;
    const urls: string[] = [];
    server.use(
      http.get(`${API_URL}/api/snippets/random`, ({ request }) => {
        urls.push(request.url);
        return HttpResponse.json({ data: snippet() });
      }),
      http.post(`${API_URL}/api/solo-attempts`, () => {
        startCalls += 1;
        return HttpResponse.json({ data: {} }, { status: 201 });
      }),
    );

    const { result } = renderHook(() =>
      useSoloPreview({ categoryId: 'cat-1', difficulty: 'EASY' }),
    );

    await waitFor(() =>
      expect(result.current.snippetPhase.phase).toBe('ready'),
    );
    expect(new URL(urls[0]).searchParams.get('categoryId')).toBe('cat-1');
    expect(new URL(urls[0]).searchParams.get('difficulty')).toBe('EASY');
    expect(startCalls).toBe(0);
  });

  it('excludes the currently shown snippet id when refreshing', async () => {
    const urls: string[] = [];
    let callCount = 0;
    server.use(
      http.get(`${API_URL}/api/snippets/random`, ({ request }) => {
        urls.push(request.url);
        callCount += 1;
        return HttpResponse.json({
          data: snippet({ id: callCount === 1 ? 'snippet-1' : 'snippet-2' }),
        });
      }),
    );

    const { result } = renderHook(() => useSoloPreview());
    await waitFor(() =>
      expect(result.current.snippetPhase.phase).toBe('ready'),
    );

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(urls.length).toBe(2));
    expect(new URL(urls[1]).searchParams.get('excludeId')).toBe('snippet-1');
  });

  it('shows an empty state when no snippet matches the filters', async () => {
    server.use(
      http.get(`${API_URL}/api/snippets/random`, () =>
        apiError(404, 'NO_ELIGIBLE_SNIPPET'),
      ),
    );

    const { result } = renderHook(() => useSoloPreview());

    await waitFor(() =>
      expect(result.current.snippetPhase.phase).toBe('empty'),
    );
  });

  it('shows a generic error state on network failure', async () => {
    server.use(
      http.get(`${API_URL}/api/snippets/random`, () => HttpResponse.error()),
    );

    const { result } = renderHook(() => useSoloPreview());

    await waitFor(() =>
      expect(result.current.snippetPhase.phase).toBe('error'),
    );
  });

  it('starts an attempt exactly once even when start is invoked twice rapidly', async () => {
    let startCalls = 0;
    server.use(
      http.get(`${API_URL}/api/snippets/random`, () =>
        HttpResponse.json({ data: snippet() }),
      ),
      http.post(`${API_URL}/api/solo-attempts`, () => {
        startCalls += 1;
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

    const { result } = renderHook(() => useSoloPreview());
    await waitFor(() =>
      expect(result.current.snippetPhase.phase).toBe('ready'),
    );

    act(() => {
      void result.current.start().catch(() => undefined);
      void result.current.start().catch(() => undefined);
    });

    await waitFor(() =>
      expect(result.current.startPhase.phase).toBe('started'),
    );
    expect(startCalls).toBe(1);
    expect(
      result.current.startPhase.phase === 'started' &&
        result.current.startPhase.attempt.attemptId,
    ).toBe('attempt-1');
  });

  it('surfaces an error and refreshes automatically when the snippet became unavailable', async () => {
    let snippetCalls = 0;
    server.use(
      http.get(`${API_URL}/api/snippets/random`, () => {
        snippetCalls += 1;
        return HttpResponse.json({ data: snippet() });
      }),
      http.post(`${API_URL}/api/solo-attempts`, () =>
        apiError(409, 'SOLO_ATTEMPT_SNIPPET_UNAVAILABLE'),
      ),
    );

    const { result } = renderHook(() => useSoloPreview());
    await waitFor(() =>
      expect(result.current.snippetPhase.phase).toBe('ready'),
    );
    expect(snippetCalls).toBe(1);

    act(() => {
      void result.current.start().catch(() => undefined);
    });

    await waitFor(() => expect(result.current.startPhase.phase).toBe('error'));
    await waitFor(() => expect(snippetCalls).toBe(2));
  });

  it('surfaces an error without a snippet refresh when the user already has an active attempt', async () => {
    let snippetCalls = 0;
    server.use(
      http.get(`${API_URL}/api/snippets/random`, () => {
        snippetCalls += 1;
        return HttpResponse.json({ data: snippet() });
      }),
      http.post(`${API_URL}/api/solo-attempts`, () =>
        apiError(409, 'ONE_ACTIVE_ATTEMPT_ALLOWED'),
      ),
    );

    const { result } = renderHook(() => useSoloPreview());
    await waitFor(() =>
      expect(result.current.snippetPhase.phase).toBe('ready'),
    );

    act(() => {
      void result.current.start().catch(() => undefined);
    });

    await waitFor(() => expect(result.current.startPhase.phase).toBe('error'));
    expect(
      result.current.startPhase.phase === 'error' &&
        result.current.startPhase.message,
    ).toMatch(/already have an attempt/i);
    expect(snippetCalls).toBe(1);
  });

  it('calls onSessionExpired instead of surfacing a raw error when the session has expired', async () => {
    server.use(
      http.get(`${API_URL}/api/snippets/random`, () =>
        apiError(401, 'AUTHENTICATION_REQUIRED'),
      ),
    );
    const onSessionExpired = vi.fn();

    const { result } = renderHook(() => useSoloPreview({ onSessionExpired }));

    await waitFor(() => expect(onSessionExpired).toHaveBeenCalledTimes(1));
    expect(result.current.snippetPhase.phase).toBe('loading');
  });
});
