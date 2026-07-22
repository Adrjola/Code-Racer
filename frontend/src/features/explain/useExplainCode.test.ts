import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveSession } from '@/features/auth/session';
import { server } from '@/test/server';
import type { ExplanationData } from './explainApi';
import { clearExplainCache, useExplainCode } from './useExplainCode';

const API_URL = 'http://localhost:8080';

const EXPLANATION: ExplanationData = {
  bestPractices: ['Use constants'],
  concepts: ['for-each loop'],
  stepByStep: ['Step one', 'Step two'],
  summary: 'FizzBuzz explanation.',
};

function withExplanation(snippetId: string, data: ExplanationData = EXPLANATION) {
  server.use(
    http.get(`${API_URL}/api/admin/snippets/${snippetId}/explanation`, () =>
      HttpResponse.json({ data }),
    ),
  );
}

function withError(snippetId: string, status: number) {
  server.use(
    http.get(`${API_URL}/api/admin/snippets/${snippetId}/explanation`, () =>
      HttpResponse.json({ message: 'error' }, { status }),
    ),
  );
}

beforeEach(() => {
  clearExplainCache();
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

describe('useExplainCode', () => {
  it('starts in idle phase with no lines', () => {
    const { result } = renderHook(() => useExplainCode('s1'));
    expect(result.current.phase).toBe('idle');
    expect(result.current.lines).toBeNull();
  });

  it('transitions to loading then success on fetch', async () => {
    withExplanation('s1');
    const { result } = renderHook(() => useExplainCode('s1'));

    act(() => {
      result.current.requestExplanation();
    });

    expect(result.current.phase).toBe('loading');
    expect(result.current.lines).not.toBeNull();

    await waitFor(() => expect(result.current.phase).toBe('success'));
    expect(result.current.lines).not.toBeNull();
    expect(result.current.lines!.length).toBeGreaterThan(0);
  });

  it('includes structured sections in success lines', async () => {
    withExplanation('s1');
    const { result } = renderHook(() => useExplainCode('s1'));

    act(() => {
      result.current.requestExplanation();
    });

    await waitFor(() => expect(result.current.phase).toBe('success'));

    const allText = result.current.lines!
      .flat()
      .map((seg) => seg.text)
      .join(' ');
    expect(allText).toContain('Summary');
    expect(allText).toContain('FizzBuzz explanation.');
    expect(allText).toContain('Step by step');
    expect(allText).toContain('Step one');
    expect(allText).toContain('Concepts');
    expect(allText).toContain('Best practices');
  });

  it('returns cached result on second call without refetching', async () => {
    let fetchCount = 0;
    server.use(
      http.get(`${API_URL}/api/admin/snippets/s1/explanation`, () => {
        fetchCount++;
        return HttpResponse.json({ data: EXPLANATION });
      }),
    );

    const { result } = renderHook(() => useExplainCode('s1'));

    act(() => {
      result.current.requestExplanation();
    });
    await waitFor(() => expect(result.current.phase).toBe('success'));
    expect(fetchCount).toBe(1);

    // Second call should use cache
    act(() => {
      result.current.requestExplanation();
    });
    expect(result.current.phase).toBe('success');
    expect(fetchCount).toBe(1);
  });

  it('prevents duplicate requests when clicked rapidly', async () => {
    let fetchCount = 0;
    server.use(
      http.get(`${API_URL}/api/admin/snippets/s1/explanation`, async () => {
        fetchCount++;
        await new Promise((r) => setTimeout(r, 50));
        return HttpResponse.json({ data: EXPLANATION });
      }),
    );

    const { result } = renderHook(() => useExplainCode('s1'));

    // Fire two requests in the same tick
    act(() => {
      result.current.requestExplanation();
      result.current.requestExplanation();
    });

    await waitFor(() => expect(result.current.phase).toBe('success'));
    expect(fetchCount).toBe(1);
  });

  it('does nothing when snippetId is null', async () => {
    const { result } = renderHook(() => useExplainCode(null));

    act(() => {
      result.current.requestExplanation();
    });

    expect(result.current.phase).toBe('idle');
  });

  it('transitions to error phase on failure', async () => {
    withError('s1', 429);
    const { result } = renderHook(() => useExplainCode('s1'));

    act(() => {
      result.current.requestExplanation();
    });

    await waitFor(() => expect(result.current.phase).toBe('error'));
    const allText = result.current.lines!
      .flat()
      .map((seg) => seg.text)
      .join(' ');
    expect(allText).toContain('error');
  });

  it('resets state when snippet changes', async () => {
    withExplanation('s1');
    const { result, rerender } = renderHook(
      ({ id }) => useExplainCode(id),
      { initialProps: { id: 's1' as string | null } },
    );

    act(() => {
      result.current.requestExplanation();
    });
    await waitFor(() => expect(result.current.phase).toBe('success'));

    rerender({ id: 's2' });
    expect(result.current.phase).toBe('idle');
    expect(result.current.lines).toBeNull();
  });

  it('allows retry after error', async () => {
    withError('s1', 503);
    const { result } = renderHook(() => useExplainCode('s1'));

    act(() => {
      result.current.requestExplanation();
    });
    await waitFor(() => expect(result.current.phase).toBe('error'));

    // Now fix the endpoint and retry
    withExplanation('s1');
    act(() => {
      result.current.requestExplanation();
    });
    await waitFor(() => expect(result.current.phase).toBe('success'));
  });
});
