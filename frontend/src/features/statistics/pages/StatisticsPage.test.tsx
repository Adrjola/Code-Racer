import { render, screen, waitFor } from '@testing-library/react';
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
  SnippetStatistics,
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

function renderStatistics(overrides: Partial<{ session: AuthSession }> = {}) {
  return render(
    <StatisticsPage
      onGoDashboard={vi.fn()}
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
});

describe('StatisticsPage', () => {
  it('shows the global easy ranking by default', () => {
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
    expect(screen.getByText('zoomer')).toBeInTheDocument();
    expect(screen.getByText('0:17')).toBeInTheDocument();
  });

  it('marks the current user row', () => {
    renderStatistics();

    const rows = screen.getAllByRole('listitem');
    const ownRow = rows.find((row) => row.textContent?.includes('YOU'));

    expect(ownRow).toBeDefined();
    expect(ownRow?.textContent).toContain('PowerPuffGirl');
  });

  it('shows a placeholder when a difficulty has no ranking data yet', async () => {
    const user = userEvent.setup();
    renderStatistics();

    await user.click(screen.getByRole('tab', { name: /tryhard/i }));

    expect(screen.getByRole('tab', { name: /tryhard/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.queryByText('zoomer')).not.toBeInTheDocument();
    expect(
      screen.getByText(/no global rankings yet for this difficulty/i),
    ).toBeInTheDocument();
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
        onGoDashboard={vi.fn()}
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

  it('goes to the dashboard when the logo is clicked', async () => {
    const onGoDashboard = vi.fn();
    const user = userEvent.setup();
    render(
      <StatisticsPage
        onGoDashboard={onGoDashboard}
        onLogout={vi.fn()}
        onSessionExpired={vi.fn()}
        session={session()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /go to dashboard/i }));

    expect(onGoDashboard).toHaveBeenCalledTimes(1);
  });

  it('no longer has a Dashboard item in the menu', async () => {
    const user = userEvent.setup();
    renderStatistics();

    await user.click(screen.getByRole('button', { name: /menu/i }));

    expect(
      screen.queryByRole('button', { name: /^dashboard$/i }),
    ).not.toBeInTheDocument();
  });

  it('logs out from the menu', async () => {
    const onLogout = vi.fn();
    const user = userEvent.setup();
    render(
      <StatisticsPage
        onGoDashboard={vi.fn()}
        onLogout={onLogout}
        onSessionExpired={vi.fn()}
        session={session()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /menu/i }));
    await user.click(screen.getByRole('button', { name: /log out/i }));

    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
