import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Logo from '@/components/Logo';
import type { AuthSession } from '@/features/auth/session';
import type { Difficulty } from '@/features/solo/api/soloApi';
import { getMockGlobalRanking } from '../data/mockGlobalRanking';
import { getMockPersonalActivity } from '../data/mockPersonalActivity';
import { getMockPersonalStatsSummary } from '../data/mockPersonalStatsSummary';
import { DifficultyTabs } from '../components/DifficultyTabs';
import { GlobalRankingTable } from '../components/GlobalRankingTable';
import { PersonalActivityGrid } from '../components/PersonalActivityGrid';
import { PersonalStatsSummaryGrid } from '../components/PersonalStatsSummaryGrid';
import { ViewTabs } from '../components/ViewTabs';
import { TrophyIcon } from '../icons';
import type { StatsView } from '../types';

type StatisticsPageProps = {
  onGoDashboard: () => void;
  onLogout: () => void;
  session: AuthSession;
};

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
  onGoDashboard,
  onLogout,
  session,
}: StatisticsPageProps) {
  const [view, setView] = useState<StatsView>('GLOBAL');
  const [difficulty, setDifficulty] = useState<Difficulty>('EASY');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { height: headerHeight, ref: headerCanvasRef } = useNaturalHeight();
  const { height: mainHeight, ref: mainCanvasRef } = useNaturalHeight();

  const ranking =
    view === 'GLOBAL' ? getMockGlobalRanking(difficulty) : undefined;
  const activity =
    view === 'PERSONAL' ? getMockPersonalActivity(difficulty) : undefined;
  const statsSummary =
    view === 'PERSONAL' ? getMockPersonalStatsSummary(difficulty) : undefined;

  return (
    <div className="min-h-[100dvh] bg-surface font-sans text-text-primary">
      <div
        className="sticky top-0 z-10 bg-surface lg:overflow-hidden lg:[height:calc(var(--stats-header-h)*var(--stats-scale))]"
        style={{ '--stats-header-h': `${headerHeight}px` } as CSSProperties}
      >
        <div
          className="lg:w-[1920px] lg:origin-top-left lg:[transform:scale(var(--stats-scale))]"
          ref={headerCanvasRef}
        >
          <header className="flex items-center justify-between gap-4 px-[clamp(1rem,5vw,2.5rem)] py-6 lg:px-[40px]">
            <Logo onClick={onGoDashboard} />
            <div className="flex items-center gap-4">
              <span
                aria-hidden="true"
                className="flex size-10 items-center justify-center rounded-[9px] border border-[rgba(251,191,36,0.34)] bg-[rgba(251,191,36,0.08)]"
              >
                <TrophyIcon className="size-5" />
              </span>
              <span className="hidden h-10 items-center gap-2 rounded-[9px] border border-[rgba(244,114,182,0.2)] bg-[rgba(244,114,182,0.05)] px-3 font-mono text-[10.5px] tracking-wide sm:flex">
                <span className="text-[#6b6f85]">USER:</span>
                <span className="font-bold text-[#f9a8d4]">
                  {session.user.username}
                </span>
              </span>
              <div className="relative">
                <button
                  aria-expanded={isMenuOpen}
                  aria-label="Menu"
                  className="flex size-10 flex-col items-center justify-center gap-1 rounded-[9px] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)]"
                  onClick={() => setIsMenuOpen((open) => !open)}
                  type="button"
                >
                  <span className="h-[2px] w-[18px] rounded-full bg-[#c9cbe0]" />
                  <span className="h-[2px] w-[18px] rounded-full bg-[#c9cbe0]" />
                  <span className="h-[2px] w-[9.59px] rounded-full bg-[#c9cbe0]" />
                </button>
                {isMenuOpen && (
                  <div className="absolute right-0 top-12 z-10 flex w-40 flex-col overflow-hidden rounded-[9px] border border-white/10 bg-[#15121f] py-1 shadow-lg">
                    <button
                      className="px-4 py-2 text-left text-sm font-semibold text-pink-300 hover:bg-white/5"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onLogout();
                      }}
                      type="button"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>
        </div>
      </div>

      <div
        className="lg:overflow-hidden lg:[height:calc(var(--stats-main-h)*var(--stats-scale))]"
        style={{ '--stats-main-h': `${mainHeight}px` } as CSSProperties}
      >
        <main
          className="mx-auto w-full max-w-[100rem] px-[clamp(1rem,5vw,2.5rem)] pb-16 lg:mx-0 lg:w-[1920px] lg:max-w-none lg:origin-top-left lg:px-[40px] lg:[transform:scale(var(--stats-scale))]"
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

          {view === 'GLOBAL' && ranking && (
            <GlobalRankingTable
              currentUsername={session.user.username}
              entries={ranking}
            />
          )}

          {view === 'GLOBAL' && !ranking && (
            <p className="text-text-muted" role="status">
              No global rankings yet for this difficulty.
            </p>
          )}

          {view === 'PERSONAL' && statsSummary && (
            <div className="mb-6">
              <PersonalStatsSummaryGrid summary={statsSummary} />
            </div>
          )}

          {view === 'PERSONAL' && activity && (
            <PersonalActivityGrid entries={activity} />
          )}

          {view === 'PERSONAL' && !statsSummary && !activity && (
            <p className="text-text-muted" role="status">
              No activity yet for this difficulty.
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
