import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SoloRaceResult } from '../../../../features/solo/race/components/SoloRaceResult';
import type {
  SoloAttemptRankingResponse,
  SoloAttemptResultResponse,
} from '../../../../features/solo/race/api/soloRaceApi';
import { formatDurationPrecise } from '../../../../features/solo/race/utils/formatDuration';
import { saveSession } from '@/features/auth/session';
import { clearExplainCache } from '@/features/explain/useExplainCode';
import type { ExplanationData } from '@/features/explain/explainApi';
import { server } from '@/test/server';

const API_URL = 'http://localhost:8080';
const RANKING_URL = `${API_URL}/api/solo-attempts/a1/ranking`;

function result(
  overrides: Partial<SoloAttemptResultResponse> = {},
): SoloAttemptResultResponse {
  return {
    attemptId: 'a1',
    cpm: 452,
    difficulty: 'EASY',
    durationMs: 41_111,
    finishedAt: '2026-07-17T12:00:41Z',
    snippet: {
      category: 'JAVA',
      snippetId: 'g1',
      title: 'FizzBuzz',
    },
    startedAt: '2026-07-17T12:00:00Z',
    state: 'COMPLETED',
    ...overrides,
  };
}

/** Answers the single ranking lookup the screen makes. */
function withRanking(overrides: Partial<SoloAttemptRankingResponse> = {}) {
  const ranking: SoloAttemptRankingResponse = {
    attemptId: 'a1',
    attemptRank: 171,
    globalRank: 171,
    newPersonalBest: true,
    previousBestCpm: null,
    previousBestDurationMs: null,
    previousGlobalRank: null,
    ...overrides,
  };
  server.use(http.get(RANKING_URL, () => HttpResponse.json({ data: ranking })));
}

function renderResult(
  overrides: Partial<SoloAttemptResultResponse> = {},
  handlers: {
    onLobby?: () => void;
    onNewSnippet?: () => void;
    onRaceAgain?: () => void;
  } = {},
  snippetCode?: string | null,
) {
  render(
    <SoloRaceResult
      onLobby={handlers.onLobby ?? vi.fn()}
      onNewSnippet={handlers.onNewSnippet ?? vi.fn()}
      onRaceAgain={handlers.onRaceAgain ?? vi.fn()}
      result={result(overrides)}
      snippetCode={snippetCode}
    />,
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
      email: 'player@example.com',
      emailVerified: true,
      id: 'u1',
      role: 'USER',
      updatedAt: '2026-07-16T12:00:00Z',
      username: 'player',
    },
  });
});

describe('formatDurationPrecise', () => {
  it('keeps the milliseconds the race was decided by', () => {
    expect(formatDurationPrecise(41_111)).toBe('0:41.111');
    expect(formatDurationPrecise(65_007)).toBe('1:05.007');
    expect(formatDurationPrecise(0)).toBe('0:00.000');
  });

  it('shows a placeholder when the attempt has no duration', () => {
    expect(formatDurationPrecise(null)).toBe('--');
  });
});

describe('SoloRaceResult', () => {
  it('shows the cpm the server calculated', async () => {
    withRanking();
    renderResult();

    expect(screen.getByText('452')).toBeInTheDocument();
    expect(screen.getByText('CPM')).toBeInTheDocument();
    expect(
      await screen.findByText(/first run on this one/),
    ).toBeInTheDocument();
  });

  it('shows the race time down to the millisecond', () => {
    withRanking();
    renderResult();

    expect(screen.getByText('0:41.111')).toBeInTheDocument();
  });

  it('claims nothing about records or rank until the ranking has loaded', async () => {
    // Never resolves, so the screen stays in its pre-load state.
    server.use(http.get(RANKING_URL, () => new Promise(() => {})));
    renderResult();

    expect(screen.getByText('452')).toBeInTheDocument();
    expect(
      screen.getByText(/checking your previous races/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/New personal best/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^#\d/)).not.toBeInTheDocument();
  });

  describe('first clear of a snippet', () => {
    it('shows the badge, the rank, and no comparisons', async () => {
      withRanking({ attemptRank: 171, newPersonalBest: true });
      renderResult();

      expect(await screen.findByText(/New personal best/i)).toBeInTheDocument();
      expect(screen.getByText('#171')).toBeInTheDocument();
      expect(screen.getByText('Best time')).toBeInTheDocument();
      expect(screen.queryByText(/previously/)).not.toBeInTheDocument();
      expect(screen.queryByText(/your best/)).not.toBeInTheDocument();
    });
  });

  describe('new personal best', () => {
    it('celebrates the improvement and shows what it replaced', async () => {
      withRanking({
        attemptRank: 171,
        globalRank: 171,
        newPersonalBest: true,
        previousBestCpm: 431,
        previousBestDurationMs: 47_000,
        previousGlobalRank: 301,
      });
      renderResult();

      expect(await screen.findByText(/New personal best/i)).toBeInTheDocument();
      // The delta splits the coloured number from the muted explanation.
      expect(screen.getByText('+21 cpm')).toBeInTheDocument();
      expect(screen.getByText('over previous best {431}')).toBeInTheDocument();
      expect(screen.getByText('Best time')).toBeInTheDocument();
      expect(screen.getByText('0:41.111')).toBeInTheDocument();
      expect(screen.getByText('// previously 0:47.000')).toBeInTheDocument();
      expect(screen.getByText('#171')).toBeInTheDocument();
      expect(screen.getByText('// previously #301')).toBeInTheDocument();
    });
  });

  describe('slower than the personal best', () => {
    it('shows where this run landed and the rank the player keeps', async () => {
      withRanking({
        attemptRank: 301,
        globalRank: 171,
        newPersonalBest: false,
        previousBestCpm: 502,
        previousBestDurationMs: 41_000,
        previousGlobalRank: 171,
      });
      renderResult({ cpm: 452, durationMs: 48_111 });

      expect(await screen.findByText('#301')).toBeInTheDocument();
      expect(screen.getByText('// your best #171')).toBeInTheDocument();
      expect(screen.queryByText(/New personal best/i)).not.toBeInTheDocument();
      expect(screen.getByText('Time')).toBeInTheDocument();
      expect(screen.getByText('0:48.111')).toBeInTheDocument();
      expect(screen.getByText('// your best 0:41.000')).toBeInTheDocument();
      expect(screen.getByText('-50 cpm')).toBeInTheDocument();
      expect(screen.getByText('under your best {502}')).toBeInTheDocument();
    });
  });

  it('does not claim a score for an unfinished attempt', async () => {
    renderResult({ cpm: null, durationMs: null, state: 'ABANDONED' });

    expect(screen.getByText(/race abandoned - no score/)).toBeInTheDocument();
    expect(screen.queryByText(/New personal best/i)).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getAllByText('--').length).toBeGreaterThan(0),
    );
  });

  it('still renders when the ranking lookup fails', async () => {
    server.use(http.get(RANKING_URL, () => HttpResponse.error()));
    renderResult();

    expect(await screen.findByText('452')).toBeInTheDocument();
    expect(screen.queryByText(/New personal best/i)).not.toBeInTheDocument();
  });

  it('offers a new snippet, a restart, and the way back to the lobby', async () => {
    withRanking();
    const onLobby = vi.fn();
    const onNewSnippet = vi.fn();
    const onRaceAgain = vi.fn();
    renderResult({}, { onLobby, onNewSnippet, onRaceAgain });

    await userEvent.click(screen.getByRole('button', { name: /new snippet/i }));
    expect(onNewSnippet).toHaveBeenCalledOnce();

    await userEvent.click(screen.getByRole('button', { name: /restart/i }));
    expect(onRaceAgain).toHaveBeenCalledOnce();

    await userEvent.click(
      screen.getByRole('button', { name: /back to lobby/i }),
    );
    expect(onLobby).toHaveBeenCalledOnce();
  });

  describe('Score/Code toggle', () => {
    it('shows the toggle when snippetCode is provided', () => {
      withRanking();
      renderResult({}, {}, 'public class Foo {}');

      expect(screen.getByRole('tablist', { name: /result view/i })).toBeInTheDocument();
    });

    it('does not show the toggle when snippetCode is absent', () => {
      withRanking();
      renderResult();

      expect(screen.queryByRole('tablist', { name: /result view/i })).not.toBeInTheDocument();
    });

    it('switches to code view and hides navigation buttons', async () => {
      withRanking();
      renderResult({}, {}, 'public class Foo {}');

      expect(screen.getByRole('button', { name: /new snippet/i })).toBeInTheDocument();

      await userEvent.click(screen.getByRole('tab', { name: /code/i }));

      expect(screen.getByText('public class Foo {}')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /new snippet/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /restart/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /back to lobby/i })).not.toBeInTheDocument();
    });

    it('switches back to score view and shows buttons again', async () => {
      withRanking();
      renderResult({}, {}, 'public class Foo {}');

      await userEvent.click(screen.getByRole('tab', { name: /code/i }));
      expect(screen.queryByRole('button', { name: /new snippet/i })).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('tab', { name: /score/i }));
      expect(screen.getByRole('button', { name: /new snippet/i })).toBeInTheDocument();
    });
  });

  describe('Benji explain code', () => {
    it('shows the clickable Benji bot', () => {
      withRanking();
      renderResult();

      expect(screen.getByRole('button', { name: /explain the code/i })).toBeInTheDocument();
    });

    it('disables the click target after Benji is clicked', async () => {
      withRanking();
      server.use(
        http.get(`${API_URL}/api/admin/snippets/g1/explanation`, async () => {
          await new Promise(() => {});
          return HttpResponse.json({ data: {} });
        }),
      );
      renderResult();

      const bot = screen.getByRole('button', { name: /explain the code/i });
      await userEvent.click(bot);

      // After clicking, the bot div should no longer have role="button"
      // because the phase transitions away from idle/error
      await waitFor(() =>
        expect(screen.queryByRole('button', { name: /explain the code/i })).not.toBeInTheDocument(),
      );
    });
  });
});
