import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Header from '@/components/Header';
import { TrophyIcon } from '@/components/icons';
import type { AuthSession } from '@/features/auth/session';
import type { Difficulty } from '@/features/solo/api/soloApi';
import {
  toGlobalRankingEntries,
  toPersonalActivityEntries,
  toPersonalActivityEntriesFromHistory,
  toPersonalStatsSummary,
} from '../api/statisticsMappers';
import { useGlobalLeaderboard } from '../hooks/useGlobalLeaderboard';
import { usePersonalStatistics } from '../hooks/usePersonalStatistics';
import { useSnippetHistory } from '../hooks/useSnippetHistory';
import { DifficultyTabs } from '../components/DifficultyTabs';
import { GlobalRankingTable } from '../components/GlobalRankingTable';
import { PersonalActivityGrid } from '../components/PersonalActivityGrid';
import { PersonalStatsSummaryGrid } from '../components/PersonalStatsSummaryGrid';
import { SnippetViewTabs } from '../components/SnippetViewTabs';
import { ViewTabs } from '../components/ViewTabs';
import type { SnippetView, StatsView } from '../types';

type StatisticsPageProps = {
  onGoHome: () => void;
  onGoStatistics: () => void;
  onLogout: () => void;
  onSessionExpired: () => void;
  session: AuthSession;
};

const VIEWS: StatsView[] = ['GLOBAL', 'PERSONAL'];
const DIFFICULTIES: Difficulty[] = ['EASY', 'MEDIUM', 'HARD'];
const SNIPPET_VIEWS: SnippetView[] = ['BEST', 'HISTORY'];

function readView(params: URLSearchParams): StatsView {
  const value = params.get('view');
  return VIEWS.includes(value as StatsView) ? (value as StatsView) : 'GLOBAL';
}

function readDifficulty(params: URLSearchParams): Difficulty {
  const value = params.get('difficulty');
  return DIFFICULTIES.includes(value as Difficulty)
    ? (value as Difficulty)
    : 'EASY';
}

function readSnippetView(params: URLSearchParams): SnippetView {
  const value = params.get('snippetView');
  return SNIPPET_VIEWS.includes(value as SnippetView)
    ? (value as SnippetView)
    : 'BEST';
}

function useNaturalHeight() {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      setHeight(entry.contentRect.height);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { height, ref };
}

export default function StatisticsPage({
  onGoHome,
  onGoStatistics,
  onLogout,
  onSessionExpired,
  session,
}: StatisticsPageProps) {
  const [view, setView] = useState<StatsView>(() =>
    readView(new URLSearchParams(window.location.search)),
  );
  const [difficulty, setDifficulty] = useState<Difficulty>(() =>
    readDifficulty(new URLSearchParams(window.location.search)),
  );
  const [snippetView, setSnippetView] = useState<SnippetView>(() =>
    readSnippetView(new URLSearchParams(window.location.search)),
  );
  const { height: mainHeight, ref: mainCanvasRef } = useNaturalHeight();
  const {
    personalStats,
    retry: retryPersonalStats,
    snippetStats,
    status: personalStatus,
  } = usePersonalStatistics(onSessionExpired);
  const {
    entries: globalEntries,
    retry: retryGlobalLeaderboard,
    status: globalStatus,
  } = useGlobalLeaderboard(difficulty, onSessionExpired);
  const isHistory = snippetView === 'HISTORY';
  const {
    entries: historyEntries,
    retry: retryHistory,
    status: historyStatus,
  } = useSnippetHistory(
    difficulty,
    view === 'PERSONAL' && personalStatus === 'success' && isHistory,
    onSessionExpired,
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('view', view);
    params.set('difficulty', difficulty);
    params.set('snippetView', snippetView);
    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    if (nextUrl !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, '', nextUrl);
    }
  }, [difficulty, snippetView, view]);

  const ranking =
    view === 'GLOBAL' && globalStatus === 'success'
      ? toGlobalRankingEntries(globalEntries)
      : undefined;
  const activity =
    view !== 'PERSONAL' || personalStatus !== 'success'
      ? []
      : isHistory
        ? historyStatus === 'success'
          ? toPersonalActivityEntriesFromHistory(historyEntries)
          : []
        : toPersonalActivityEntries(
            snippetStats.filter((snippet) => snippet.difficulty === difficulty),
          );
  const statsSummary =
    view === 'PERSONAL' && personalStatus === 'success'
      ? toPersonalStatsSummary(
          personalStats.find((stats) => stats.difficulty === difficulty),
        )
      : undefined;

  return (
    <div className="min-h-[100dvh] bg-surface pb-16 font-sans text-text-primary lg:pb-24">
      <div className="sticky top-0 z-10 bg-surface">
        <Header
          onGoDashboard={onGoHome}
          onGoStatistics={onGoStatistics}
          onLogout={onLogout}
          username={session.user.username}
        />
      </div>

      <div
        className="lg:overflow-hidden lg:[height:calc(var(--stats-main-h)*var(--canvas-scale))]"
        style={{ '--stats-main-h': `${mainHeight}px` } as CSSProperties}
      >
        <main
          className="mx-auto w-full max-w-[100rem] px-[clamp(1rem,5vw,2.5rem)] pb-16 lg:mx-0 lg:w-[1920px] lg:max-w-none lg:origin-top-left lg:px-[40px] lg:[transform:scale(var(--canvas-scale))]"
          ref={mainCanvasRef}
        >
          <div className="flex items-center gap-3">
            <TrophyIcon className="size-8" />
            <h1 className="font-sans text-3xl font-bold text-text-primary lg:text-4xl">
              Race Statistics
            </h1>
          </div>

          <div className="mt-4">
            <ViewTabs onChange={setView} view={view} />
          </div>

          <section aria-labelledby="difficulty-heading" className="mt-6 pb-6">
            <p
              className="mb-3 font-sans text-xs text-[#8589a3]"
              id="difficulty-heading"
            >
              DIFFICULTY
            </p>
            <DifficultyTabs difficulty={difficulty} onChange={setDifficulty} />
          </section>

          {view === 'GLOBAL' && globalStatus === 'loading' && (
            <p className="text-text-muted" role="status">
              Loading global rankings…
            </p>
          )}

          {view === 'GLOBAL' && globalStatus === 'error' && (
            <div className="flex flex-col items-start gap-3" role="alert">
              <p className="text-text-muted">
                Couldn&apos;t load global rankings. Check your connection and
                try again.
              </p>
              <button
                className="rounded-[9px] border border-white/10 bg-white/[0.03] px-4 py-2 font-mono text-[12px] font-bold tracking-wide text-text-primary hover:border-white/20"
                onClick={retryGlobalLeaderboard}
                type="button"
              >
                Try again
              </button>
            </div>
          )}

          {view === 'GLOBAL' && ranking && ranking.length > 0 && (
            <GlobalRankingTable
              currentUsername={session.user.username}
              entries={ranking}
            />
          )}

          {view === 'GLOBAL' && ranking && ranking.length === 0 && (
            <p className="text-text-muted" role="status">
              No global rankings yet for this difficulty.
            </p>
          )}

          {view === 'PERSONAL' && personalStatus === 'loading' && (
            <p className="text-text-muted" role="status">
              Loading your stats…
            </p>
          )}

          {view === 'PERSONAL' && personalStatus === 'error' && (
            <div className="flex flex-col items-start gap-3" role="alert">
              <p className="text-text-muted">
                Couldn&apos;t load your stats. Check your connection and try
                again.
              </p>
              <button
                className="rounded-[9px] border border-white/10 bg-white/[0.03] px-4 py-2 font-mono text-[12px] font-bold tracking-wide text-text-primary hover:border-white/20"
                onClick={retryPersonalStats}
                type="button"
              >
                Try again
              </button>
            </div>
          )}

          {view === 'PERSONAL' &&
            personalStatus === 'success' &&
            statsSummary && (
              <div className="mb-6">
                <PersonalStatsSummaryGrid summary={statsSummary} />
              </div>
            )}

          {view === 'PERSONAL' && personalStatus === 'success' && (
            <div className="mb-4 flex flex-col gap-3">
              <SnippetViewTabs onChange={setSnippetView} view={snippetView} />
              <p className="font-sans text-xs text-[#8589a3]">SNIPPET LOG</p>
            </div>
          )}

          {view === 'PERSONAL' &&
            personalStatus === 'success' &&
            isHistory &&
            historyStatus === 'loading' && (
              <p className="text-text-muted" role="status">
                Loading recent attempts…
              </p>
            )}

          {view === 'PERSONAL' &&
            personalStatus === 'success' &&
            isHistory &&
            historyStatus === 'error' && (
              <div className="flex flex-col items-start gap-3" role="alert">
                <p className="text-text-muted">
                  Couldn&apos;t load your recent attempts. Check your connection
                  and try again.
                </p>
                <button
                  className="rounded-[9px] border border-white/10 bg-white/[0.03] px-4 py-2 font-mono text-[12px] font-bold tracking-wide text-text-primary hover:border-white/20"
                  onClick={retryHistory}
                  type="button"
                >
                  Try again
                </button>
              </div>
            )}

          {view === 'PERSONAL' &&
            personalStatus === 'success' &&
            activity.length > 0 && (
              <PersonalActivityGrid
                ariaLabel={isHistory ? 'Recent activity' : 'Personal bests'}
                entries={activity}
              />
            )}

          {view === 'PERSONAL' &&
            personalStatus === 'success' &&
            activity.length === 0 &&
            (isHistory ? historyStatus === 'success' : !statsSummary) && (
              <p className="text-text-muted" role="status">
                {isHistory
                  ? 'No completed attempts yet for this difficulty.'
                  : 'No activity yet for this difficulty.'}
              </p>
            )}
        </main>
      </div>
    </div>
  );
}
