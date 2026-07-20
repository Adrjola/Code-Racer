import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SoloRaceResult } from '../../../../features/solo/race/components/SoloRaceResult';
import type { SoloAttemptResultResponse } from '../../../../features/solo/race/api/soloRaceApi';
import { formatDuration } from '../../../../features/solo/race/utils/formatDuration';
import { saveSession } from '@/features/auth/session';
import { server } from '@/test/server';

const API_URL = 'http://localhost:8080';
const HISTORY_URL = `${API_URL}/api/solo-attempts`;

function result(
  overrides: Partial<SoloAttemptResultResponse> = {},
): SoloAttemptResultResponse {
  return {
    attemptId: 'a1',
    cpm: 452,
    difficulty: 'EASY',
    durationMs: 41_000,
    finishedAt: '2026-07-17T12:00:41Z',
    snippet: {
      categoryId: 'c1',
      revisionId: 'r1',
      revisionNumber: 1,
      snippetId: 'g1',
      title: 'FizzBuzz',
    },
    startedAt: '2026-07-17T12:00:00Z',
    state: 'COMPLETED',
    ...overrides,
  };
}

/** Answers the two sorted history lookups the screen makes. */
function withHistory(attempts: SoloAttemptResultResponse[]) {
  server.use(
    http.get(HISTORY_URL, ({ request }) => {
      const sort = new URL(request.url).searchParams.get('sort') ?? '';
      const sorted = [...attempts].sort((a, b) =>
        sort.startsWith('cpm')
          ? (b.cpm ?? 0) - (a.cpm ?? 0)
          : (a.durationMs ?? 0) - (b.durationMs ?? 0),
      );
      return HttpResponse.json({
        data: {
          content: sorted.slice(0, 2),
          page: {
            number: 0,
            size: 2,
            totalElements: sorted.length,
            totalPages: 1,
          },
        },
      });
    }),
  );
}

beforeEach(() => {
  saveSession({
    accessToken: 'jwt-token',
    expiresAt: Date.now() + 60_000,
    tokenType: 'Bearer',
    user: {
      createdAt: '2026-07-16T12:00:00Z',
      email: 'player@example.com',
      emailVerified: true,
      enabled: true,
      id: 'u1',
      role: 'USER',
      updatedAt: '2026-07-16T12:00:00Z',
      username: 'player',
    },
  });
});

describe('formatDuration', () => {
  it('formats the server duration as m:ss', () => {
    expect(formatDuration(45_000)).toBe('0:45');
    expect(formatDuration(65_000)).toBe('1:05');
    expect(formatDuration(0)).toBe('0:00');
  });

  it('shows a placeholder when the attempt has no duration', () => {
    expect(formatDuration(null)).toBe('--');
  });
});

describe('SoloRaceResult', () => {
  it('shows the cpm the server calculated', async () => {
    withHistory([result()]);
    render(
      <SoloRaceResult
        onLobby={vi.fn()}
        onRaceAgain={vi.fn()}
        result={result()}
      />,
    );

    expect(screen.getByText('452')).toBeInTheDocument();
    expect(screen.getByText('CPM')).toBeInTheDocument();
    expect(await screen.findByText(/first completed race/)).toBeInTheDocument();
  });

  it('claims nothing about records until history has loaded', async () => {
    // Never resolves, so the screen stays in its pre-load state.
    server.use(http.get(HISTORY_URL, () => new Promise(() => {})));
    render(
      <SoloRaceResult
        onLobby={vi.fn()}
        onRaceAgain={vi.fn()}
        result={result()}
      />,
    );

    expect(screen.getByText('452')).toBeInTheDocument();
    expect(
      screen.getByText(/checking your previous races/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/New personal best/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/first completed race/)).not.toBeInTheDocument();
  });

  it('celebrates beating the previous best', async () => {
    withHistory([
      result(),
      result({ attemptId: 'older', cpm: 431, durationMs: 47_000 }),
    ]);
    render(
      <SoloRaceResult
        onLobby={vi.fn()}
        onRaceAgain={vi.fn()}
        result={result()}
      />,
    );

    expect(await screen.findByText(/New personal best/i)).toBeInTheDocument();
    expect(
      screen.getByText(/\+21 cpm over previous best \(431\)/),
    ).toBeInTheDocument();
    // The older run was slower, so this race is the best time.
    expect(screen.getByText('0:41')).toBeInTheDocument();
  });

  it('keeps the earlier best time when this race was slower', async () => {
    withHistory([
      result({ durationMs: 41_000 }),
      result({ attemptId: 'older', cpm: 500, durationMs: 30_000 }),
    ]);
    render(
      <SoloRaceResult
        onLobby={vi.fn()}
        onRaceAgain={vi.fn()}
        result={result()}
      />,
    );

    expect(await screen.findByText('0:30')).toBeInTheDocument();
    expect(screen.getByText(/this race 0:41/)).toBeInTheDocument();
    expect(screen.queryByText(/New personal best/i)).not.toBeInTheDocument();
  });

  it('does not claim a score for an unfinished attempt', async () => {
    withHistory([]);
    render(
      <SoloRaceResult
        onLobby={vi.fn()}
        onRaceAgain={vi.fn()}
        result={result({ cpm: null, durationMs: null, state: 'ABANDONED' })}
      />,
    );

    expect(screen.getByText(/race abandoned - no score/)).toBeInTheDocument();
    expect(screen.queryByText(/New personal best/i)).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText(/did not finish/)).toBeInTheDocument(),
    );
  });

  it('still renders when the history lookup fails', async () => {
    server.use(http.get(HISTORY_URL, () => HttpResponse.error()));
    render(
      <SoloRaceResult
        onLobby={vi.fn()}
        onRaceAgain={vi.fn()}
        result={result()}
      />,
    );

    expect(await screen.findByText('452')).toBeInTheDocument();
  });

  it('offers restarting and returning to the dashboard', async () => {
    withHistory([result()]);
    const onLobby = vi.fn();
    const onRaceAgain = vi.fn();
    render(
      <SoloRaceResult
        onLobby={onLobby}
        onRaceAgain={onRaceAgain}
        result={result()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /restart/i }));
    expect(onRaceAgain).toHaveBeenCalledOnce();

    await userEvent.click(
      screen.getByRole('button', { name: /back to dashboard/i }),
    );
    expect(onLobby).toHaveBeenCalledOnce();
  });
});
