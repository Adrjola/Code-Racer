import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  saveSession,
  type AuthSession,
  type CurrentUser,
} from '@/features/auth/session';
import type { Difficulty } from '@/features/solo/api/soloApi';
import type {
  DifficultyStatistics,
  GlobalLeaderboardEntry,
  SnippetStatistics,
  SoloAttemptHistoryEntry,
} from '../api/statisticsApi';
import { server } from '@/test/server';
import StatisticsPage from './StatisticsPage';

const API_URL = 'http://localhost:8080';

function userResponse(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    createdAt: '2026-07-16T12:00:00Z',
    email: 'player@example.com',
    emailVerified: true,
    id: '019f66a0-981f-7368-aec1-4e814cc269f1',
    role: 'USER',
    updatedAt: '2026-07-16T12:00:00Z',
    username: 'PowerPuffGirl',
    ...overrides,
  };
}

function session(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    accessToken: 'jwt-token',
    expiresAt: Date.now() + 60_000,
    tokenType: 'Bearer',
    user: userResponse(),
    ...overrides,
  };
}

function emptyDifficulty(difficulty: Difficulty): DifficultyStatistics {
  return {
    averageCpm: null,
    averageDurationMs: null,
    difficulty,
    fastestDurationMs: null,
    highestCpm: null,
  };
}

function mockPersonalStatistics(difficulties: DifficultyStatistics[]) {
  server.use(
    http.get(`${API_URL}/api/solo-attempts/statistics`, () =>
      HttpResponse.json({ data: { difficulties } }),
    ),
  );
}

function mockSnippetStatistics(snippets: SnippetStatistics[]) {
  server.use(
    http.get(`${API_URL}/api/solo-attempts/snippet-statistics`, () =>
      HttpResponse.json({ data: { snippets } }),
    ),
  );
}

const DEFAULT_EASY_LEADERBOARD: GlobalLeaderboardEntry[] = [
  { cpm: 642, durationMs: 17_000, rank: 1, username: 'zoomer' },
  { cpm: 631, durationMs: 18_000, rank: 2, username: 'slower_zoomer' },
  { cpm: 600, durationMs: 19_000, rank: 3, username: 'PowerPuffGirl' },
];

function mockGlobalLeaderboard(
  byDifficulty: Partial<Record<Difficulty, GlobalLeaderboardEntry[]>> = {
    EASY: DEFAULT_EASY_LEADERBOARD,
  },
) {
  server.use(
    http.get(
      `${API_URL}/api/solo-attempts/global-leaderboard`,
      ({ request }) => {
        const difficulty = new URL(request.url).searchParams.get(
          'difficulty',
        ) as Difficulty | null;
        return HttpResponse.json({
          data: {
            difficulty,
            entries: (difficulty && byDifficulty[difficulty]) ?? [],
          },
        });
      },
    ),
  );
}

function historyEntry(
  overrides: Partial<SoloAttemptHistoryEntry> = {},
): SoloAttemptHistoryEntry {
  return {
    attemptId: 'attempt-1',
    cpm: 452,
    difficulty: 'EASY',
    durationMs: 41_201,
    finishedAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    snippet: {
      category: 'JAVA',
      snippetId: 'snippet-1',
      title: 'Two Sum',
    },
    ...overrides,
  };
}

function mockAttemptHistory(entries: SoloAttemptHistoryEntry[]) {
  server.use(
    http.get(`${API_URL}/api/solo-attempts`, () =>
      HttpResponse.json({
        data: {
          content: entries,
          page: {
            number: 0,
            size: 10,
            totalElements: entries.length,
            totalPages: 1,
          },
        },
      }),
    ),
  );
}

function renderStatistics(overrides: Partial<{ session: AuthSession }> = {}) {
  return render(
    <StatisticsPage
      onGoHome={vi.fn()}
      onGoStatistics={vi.fn()}
      onLogout={vi.fn()}
      onSessionExpired={vi.fn()}
      session={overrides.session ?? session()}
    />,
  );
}

beforeEach(() => {
  saveSession(session());
  mockPersonalStatistics(
    (['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map(emptyDifficulty),
  );
  mockSnippetStatistics([]);
  mockGlobalLeaderboard();
});

describe('StatisticsPage', () => {
  it('shows the global easy ranking by default', async () => {
    renderStatistics();

    expect(
      screen.getByRole('heading', { name: /race statistics/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /global/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: /baby mode/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(await screen.findByText('zoomer')).toBeInTheDocument();
    expect(screen.getByText('0:17.000')).toBeInTheDocument();
  });

  it('preserves the backend order, ranks, and tie values verbatim', async () => {
    mockGlobalLeaderboard({
      EASY: [
        { cpm: 400, durationMs: 20_000, rank: 1, username: 'alice' },
        { cpm: 400, durationMs: 20_000, rank: 1, username: 'bob' },
        { cpm: 200, durationMs: 30_000, rank: 3, username: 'carol' },
      ],
    });
    renderStatistics();

    const rows = await screen.findAllByRole('listitem');
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining('alice'),
      expect.stringContaining('bob'),
      expect.stringContaining('carol'),
    ]);
    expect(screen.getAllByText('1')).toHaveLength(2);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('marks the current user row', async () => {
    renderStatistics();

    const rows = await screen.findAllByRole('listitem');
    const ownRow = rows.find((row) => row.textContent?.includes('YOU'));

    expect(ownRow).toBeDefined();
    expect(ownRow?.textContent).toContain('PowerPuffGirl');
  });

  it('shows a loading state before the global leaderboard resolves', async () => {
    server.use(
      http.get(`${API_URL}/api/solo-attempts/global-leaderboard`, async () => {
        // Never resolves within the test, so the page stays in the loading state.
        await new Promise(() => {});
        return HttpResponse.json({ data: { difficulty: 'EASY', entries: [] } });
      }),
    );
    renderStatistics();

    expect(screen.getByText(/loading global rankings/i)).toBeInTheDocument();
  });

  it('shows a placeholder when a difficulty has no ranking data yet', async () => {
    const user = userEvent.setup();
    renderStatistics();
    await screen.findByText('zoomer');

    await user.click(screen.getByRole('tab', { name: /tryhard/i }));

    expect(screen.getByRole('tab', { name: /tryhard/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.queryByText('zoomer')).not.toBeInTheDocument();
    expect(
      await screen.findByText(/no global rankings yet for this difficulty/i),
    ).toBeInTheDocument();
  });

  it('shows an error with a retry that refetches the global leaderboard', async () => {
    let attempts = 0;
    server.use(
      http.get(`${API_URL}/api/solo-attempts/global-leaderboard`, () => {
        attempts += 1;
        if (attempts === 1) {
          return HttpResponse.error();
        }
        return HttpResponse.json({
          data: { difficulty: 'EASY', entries: DEFAULT_EASY_LEADERBOARD },
        });
      }),
    );
    const user = userEvent.setup();
    renderStatistics();

    const retry = await screen.findByRole('button', { name: /try again/i });
    await user.click(retry);

    expect(await screen.findByText('zoomer')).toBeInTheDocument();
  });

  it('calls onSessionExpired when the global leaderboard request is unauthorized', async () => {
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
    const onSessionExpired = vi.fn();
    render(
      <StatisticsPage
        onGoHome={vi.fn()}
        onLogout={vi.fn()}
        onSessionExpired={onSessionExpired}
        session={session()}
      />,
    );

    await waitFor(() => expect(onSessionExpired).toHaveBeenCalledTimes(1));
  });

  it('refetches the global leaderboard when the difficulty changes', async () => {
    const requestedDifficulties: (string | null)[] = [];
    server.use(
      http.get(
        `${API_URL}/api/solo-attempts/global-leaderboard`,
        ({ request }) => {
          const difficulty = new URL(request.url).searchParams.get(
            'difficulty',
          );
          requestedDifficulties.push(difficulty);
          return HttpResponse.json({ data: { difficulty, entries: [] } });
        },
      ),
    );
    const user = userEvent.setup();
    renderStatistics();
    await screen.findByText(/no global rankings yet for this difficulty/i);

    await user.click(screen.getByRole('tab', { name: /tryhard/i }));
    await screen.findByText(/no global rankings yet for this difficulty/i);

    expect(requestedDifficulties).toEqual(['EASY', 'MEDIUM']);
  });

  it('shows a loading state before the personal stats resolve', async () => {
    server.use(
      http.get(`${API_URL}/api/solo-attempts/statistics`, async () => {
        // Never resolves within the test, so the page stays in the loading state.
        await new Promise(() => {});
        return HttpResponse.json({ data: { difficulties: [] } });
      }),
    );
    const user = userEvent.setup();
    renderStatistics();

    await user.click(screen.getByRole('tab', { name: /personal/i }));

    expect(screen.getByText(/loading your stats/i)).toBeInTheDocument();
  });

  it('shows the fetched personal summary and snippet log for the selected difficulty', async () => {
    // The snippet's best was set 5 minutes before "now" at test time, computed
    // against the real clock so nothing needs to fake timers around the fetch.
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    mockPersonalStatistics([
      {
        averageCpm: 420,
        averageDurationMs: 43_000,
        difficulty: 'EASY',
        fastestDurationMs: 41_201,
        highestCpm: 452,
      },
      emptyDifficulty('MEDIUM'),
      emptyDifficulty('HARD'),
    ]);
    mockSnippetStatistics([
      {
        bestCpm: 452,
        bestDurationMs: 41_201,
        bestFinishedAt: fiveMinutesAgo,
        categoryName: 'java',
        difficulty: 'EASY',
        snippetId: 'snippet-1',
        snippetTitle: 'Two Sum',
      },
    ]);
    const user = userEvent.setup();
    renderStatistics();

    await user.click(screen.getByRole('tab', { name: /personal/i }));

    // "0:41.201" and "452" each appear twice: once in the summary card
    // (fastest time/cpm) and once in the snippet log entry for the same run.
    expect(await screen.findAllByText('0:41.201')).toHaveLength(2);
    expect(screen.getAllByText('452')).toHaveLength(2);
    expect(
      screen.getByLabelText('452 characters per minute'),
    ).toBeInTheDocument();
    expect(screen.getByText('Two Sum')).toBeInTheDocument();
    expect(screen.getByText('JAVA')).toBeInTheDocument();
    expect(screen.getByText('5 min ago')).toBeInTheDocument();
  });

  it('shows a placeholder when a difficulty has no personal activity yet', async () => {
    const user = userEvent.setup();
    renderStatistics();

    await user.click(screen.getByRole('tab', { name: /personal/i }));
    await user.click(screen.getByRole('tab', { name: /locked in/i }));

    expect(
      await screen.findByText(/no activity yet for this difficulty/i),
    ).toBeInTheDocument();
  });

  it('shows an error with a retry that refetches personal stats', async () => {
    let attempts = 0;
    server.use(
      http.get(`${API_URL}/api/solo-attempts/statistics`, () => {
        attempts += 1;
        if (attempts === 1) {
          return HttpResponse.error();
        }
        return HttpResponse.json({
          data: {
            difficulties: (['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map(
              emptyDifficulty,
            ),
          },
        });
      }),
    );
    const user = userEvent.setup();
    renderStatistics();

    await user.click(screen.getByRole('tab', { name: /personal/i }));

    const retry = await screen.findByRole('button', { name: /try again/i });
    await user.click(retry);

    expect(
      await screen.findByText(/no activity yet for this difficulty/i),
    ).toBeInTheDocument();
  });

  it('calls onSessionExpired when the personal stats request is unauthorized', async () => {
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
    const onSessionExpired = vi.fn();
    render(
      <StatisticsPage
        onGoHome={vi.fn()}
        onGoStatistics={vi.fn()}
        onLogout={vi.fn()}
        onSessionExpired={onSessionExpired}
        session={session()}
      />,
    );

    await waitFor(() => expect(onSessionExpired).toHaveBeenCalledTimes(1));
  });

  it('restores view and difficulty from the URL on load', () => {
    window.history.replaceState(
      null,
      '',
      '/statistics?view=PERSONAL&difficulty=HARD',
    );

    renderStatistics();

    expect(screen.getByRole('tab', { name: /personal/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: /locked in/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('updates the URL when switching view and difficulty tabs', async () => {
    const user = userEvent.setup();
    renderStatistics();

    await user.click(screen.getByRole('tab', { name: /personal/i }));
    await user.click(screen.getByRole('tab', { name: /locked in/i }));

    expect(window.location.search).toContain('view=PERSONAL');
    expect(window.location.search).toContain('difficulty=HARD');
  });

  it('defaults the snippet log to Best and only fetches history once selected', async () => {
    let historyRequests = 0;
    server.use(
      http.get(`${API_URL}/api/solo-attempts`, () => {
        historyRequests += 1;
        return HttpResponse.json({
          data: {
            content: [],
            page: { number: 0, size: 10, totalElements: 0, totalPages: 0 },
          },
        });
      }),
    );
    const user = userEvent.setup();
    renderStatistics();

    await user.click(screen.getByRole('tab', { name: /personal/i }));

    expect(await screen.findByRole('tab', { name: 'BEST' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'HISTORY' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
    expect(historyRequests).toBe(0);
  });

  it('switches to History and shows the fetched attempts', async () => {
    mockAttemptHistory([historyEntry()]);
    const user = userEvent.setup();
    renderStatistics();

    await user.click(screen.getByRole('tab', { name: /personal/i }));
    await user.click(await screen.findByRole('tab', { name: 'HISTORY' }));

    expect(await screen.findByText('Two Sum')).toBeInTheDocument();
    expect(screen.getByText('452')).toBeInTheDocument();
    expect(screen.getByText('0:41.201')).toBeInTheDocument();
    expect(screen.getByLabelText('Recent activity')).toBeInTheDocument();
  });

  it('shows a loading state before the history resolves', async () => {
    server.use(
      http.get(`${API_URL}/api/solo-attempts`, async () => {
        await new Promise(() => {});
        return HttpResponse.json({ data: { content: [], page: {} } });
      }),
    );
    const user = userEvent.setup();
    renderStatistics();

    await user.click(screen.getByRole('tab', { name: /personal/i }));
    await user.click(await screen.findByRole('tab', { name: 'HISTORY' }));

    expect(screen.getByText(/loading recent attempts/i)).toBeInTheDocument();
  });

  it('shows a placeholder when history has no completed attempts', async () => {
    mockAttemptHistory([]);
    const user = userEvent.setup();
    renderStatistics();

    await user.click(screen.getByRole('tab', { name: /personal/i }));
    await user.click(await screen.findByRole('tab', { name: 'HISTORY' }));

    expect(
      await screen.findByText(/no completed attempts yet for this difficulty/i),
    ).toBeInTheDocument();
  });

  it('shows an error with a retry that refetches history', async () => {
    let attempts = 0;
    server.use(
      http.get(`${API_URL}/api/solo-attempts`, () => {
        attempts += 1;
        if (attempts === 1) {
          return HttpResponse.error();
        }
        return HttpResponse.json({
          data: { content: [historyEntry()], page: {} },
        });
      }),
    );
    const user = userEvent.setup();
    renderStatistics();

    await user.click(screen.getByRole('tab', { name: /personal/i }));
    await user.click(await screen.findByRole('tab', { name: 'HISTORY' }));

    const retry = await screen.findByRole('button', { name: /try again/i });
    await user.click(retry);

    expect(await screen.findByText('Two Sum')).toBeInTheDocument();
  });

  it('calls onSessionExpired when the history request is unauthorized', async () => {
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
    const onSessionExpired = vi.fn();
    const user = userEvent.setup();
    render(
      <StatisticsPage
        onGoHome={vi.fn()}
        onGoStatistics={vi.fn()}
        onLogout={vi.fn()}
        onSessionExpired={onSessionExpired}
        session={session()}
      />,
    );

    await user.click(screen.getByRole('tab', { name: /personal/i }));
    await user.click(await screen.findByRole('tab', { name: 'HISTORY' }));

    await waitFor(() => expect(onSessionExpired).toHaveBeenCalledTimes(1));
  });

  it('refetches history when the difficulty changes while History is selected', async () => {
    const requestedDifficulties: (string | null)[] = [];
    server.use(
      http.get(`${API_URL}/api/solo-attempts`, ({ request }) => {
        requestedDifficulties.push(
          new URL(request.url).searchParams.get('difficulty'),
        );
        return HttpResponse.json({
          data: {
            content: [],
            page: { number: 0, size: 10, totalElements: 0, totalPages: 0 },
          },
        });
      }),
    );
    const user = userEvent.setup();
    renderStatistics();

    await user.click(screen.getByRole('tab', { name: /personal/i }));
    await user.click(await screen.findByRole('tab', { name: 'HISTORY' }));
    await screen.findByText(/no completed attempts yet/i);
    await user.click(screen.getByRole('tab', { name: /tryhard/i }));
    await screen.findByText(/no completed attempts yet/i);

    expect(requestedDifficulties).toEqual(['EASY', 'MEDIUM']);
  });

  it('persists the snippet view in the URL and restores it on load', async () => {
    const user = userEvent.setup();
    renderStatistics();

    await user.click(screen.getByRole('tab', { name: /personal/i }));
    await user.click(await screen.findByRole('tab', { name: 'HISTORY' }));

    expect(window.location.search).toContain('snippetView=HISTORY');

    mockAttemptHistory([]);
    window.history.replaceState(
      null,
      '',
      '/statistics?view=PERSONAL&difficulty=EASY&snippetView=HISTORY',
    );
    renderStatistics();

    expect(await screen.findByRole('tab', { name: 'HISTORY' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('goes to the homepage when the logo is clicked', async () => {
    const onGoHome = vi.fn();
    const user = userEvent.setup();
    render(
      <StatisticsPage
        onGoHome={onGoHome}
        onGoStatistics={vi.fn()}
        onLogout={vi.fn()}
        onSessionExpired={vi.fn()}
        session={session()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /go to homepage/i }));

    expect(onGoHome).toHaveBeenCalledTimes(1);
  });

  it('logs out from the header', async () => {
    const onLogout = vi.fn();
    const user = userEvent.setup();
    render(
      <StatisticsPage
        onGoHome={vi.fn()}
        onGoStatistics={vi.fn()}
        onLogout={onLogout}
        onSessionExpired={vi.fn()}
        session={session()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /log out/i }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: /flee in shame/i,
      }),
    );

    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
