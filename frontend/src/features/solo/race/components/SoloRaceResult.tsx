import { lazy, Suspense, useMemo, useState } from 'react';
import Header from '@/components/Header';
import { SegmentedToggle } from '@/features/statistics/components/SegmentedToggle';
import { useExplainCode } from '@/features/explain/useExplainCode';

const RaceBot = lazy(() => import('@/features/landing/RaceBot'));
const BenjiTerminal = lazy(() => import('@/features/landing/BenjiTerminal'));
import type { BenjiLine } from '@/features/landing/BenjiTerminal';
import type { SoloAttemptResultResponse } from '../api/soloRaceApi';

const kw = 'text-[#7aa2f7]';
const op = 'text-[#8a86a0]';
const str = 'text-[#7dcfa0]';
const com = 'text-[#6a6678]';
const obj = 'text-[#c084fc]';
const nag = 'text-[#fbbf24]';

const RESULT_BASE_LINES: BenjiLine[] = [
  [{ text: '// nice race. not bad.', cls: com }],
  [
    { text: 'Benji', cls: obj },
    { text: '.', cls: op },
    { text: 'say', cls: kw },
    { text: '(', cls: op },
    { text: '"want to know what that code does?"', cls: str },
    { text: ');', cls: op },
  ],
  [],
  [
    { text: '// click me ↓ ', cls: com },
    { text: 'to explain the code', cls: nag },
  ],
];

const RESULT_NAG_LINES: BenjiLine[] = [
  [{ text: "// go on, click me. I don't bite.", cls: nag }],
  [{ text: '// I can explain that code. just click.', cls: nag }],
  [{ text: '// still waiting. tap me already.', cls: nag }],
  [{ text: "// the code won't explain itself. but I will.", cls: nag }],
  [{ text: "// one click. instant knowledge. you're welcome.", cls: nag }],
];
import { useAttemptRanking } from '../hooks/useAttemptRanking';
import { formatDurationPrecise } from '../utils/formatDuration';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CodeIcon,
  RankBarsIcon,
  RestartIcon,
  ScoreIcon,
  StarIcon,
  StopwatchIcon,
} from './resultIcons';
import { SoloRaceResultTile } from './SoloRaceResultTile';

type ResultView = 'SCORE' | 'CODE';

type SoloRaceResultProps = {
  onLobby: () => void;
  onNewSnippet: () => void;
  onRaceAgain: () => void;
  result: SoloAttemptResultResponse;
  snippetCode?: string | null;
};

const cornerClassName = 'absolute h-[24px] w-[24px] border-pink-400';

const buttonClassName =
  'absolute top-[742px] flex h-[51px] items-center justify-center gap-[8px] rounded-[9px] font-sans text-[14px] leading-[19px]';

const outlineButtonClassName =
  'border border-[rgb(244_114_182_/_0.28)] bg-[rgb(244_114_182_/_0.06)] font-semibold text-text-primary transition-colors duration-150 hover:border-[rgb(244_114_182_/_0.6)]';

export function SoloRaceResult({
  onLobby,
  onNewSnippet,
  onRaceAgain,
  result,
  snippetCode,
}: SoloRaceResultProps) {
  const ranking = useAttemptRanking(result);
  const [view, setView] = useState<ResultView>('SCORE');
  const snippetId = result.snippet?.snippetId ?? null;
  const {
    phase: explainPhase,
    lines: explainLines,
    requestExplanation,
  } = useExplainCode(snippetId);

  const EMPTY_NAG: BenjiLine[] = useMemo(() => [], []);
  const benjiBaseLines = useMemo(
    () => explainLines ?? RESULT_BASE_LINES,
    [explainLines],
  );
  const benjiNagLines = useMemo(
    () => (explainLines ? EMPTY_NAG : RESULT_NAG_LINES),
    [explainLines, EMPTY_NAG],
  );

  const isCompleted = result.state === 'COMPLETED';
  const cpm = result.cpm;
  const previousBestCpm = ranking?.previousBestCpm ?? null;
  const previousBestDurationMs = ranking?.previousBestDurationMs ?? null;
  const isNewBest = ranking?.newPersonalBest === true;
  const cpmDelta =
    cpm !== null && previousBestCpm !== null ? cpm - previousBestCpm : null;

  // The headline time and rank always describe the race just run. What changes
  // between the three states is the wording underneath and whether the run
  // replaced the player's standing.
  const timeCaption =
    previousBestDurationMs === null
      ? null
      : isNewBest
        ? `// previously ${formatDurationPrecise(previousBestDurationMs)}`
        : `// your best ${formatDurationPrecise(previousBestDurationMs)}`;
  const rankCaption =
    ranking === null
      ? null
      : isNewBest
        ? ranking.previousGlobalRank === null
          ? null
          : `// previously #${ranking.previousGlobalRank}`
        : `// your best #${ranking.globalRank}`;

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-surface">
      {/*
       * Outside the canvas: it is centred and scaled to fit, so a logo placed
       * inside it drifts away from the top-left corner as the window shape
       * changes instead of sitting where every other page puts it.
       */}
      <div className="absolute inset-x-0 top-0 z-10">
        <Header variant="minimal" />
      </div>

      <style>
        {`
          .benji-scroll { scrollbar-width: thin; scrollbar-color: rgba(244,114,182,0.4) transparent; }
          .benji-scroll::-webkit-scrollbar { width: 6px; }
          .benji-scroll::-webkit-scrollbar-track { background: transparent; }
          .benji-scroll::-webkit-scrollbar-thumb { background: rgba(244,114,182,0.4); border-radius: 999px; }
          .benji-scroll::-webkit-scrollbar-thumb:hover { background: rgba(244,114,182,0.65); }
        `}
      </style>
      <div className="relative h-[1080px] w-[1920px] shrink-0 origin-center overflow-hidden [transform:scale(var(--fit-scale))]">
        {snippetCode != null && (
          <div className="absolute top-[164px] left-[558px] flex w-[804px]">
            <SegmentedToggle<ResultView>
              ariaLabel="Result view"
              first={{
                icon: <ScoreIcon className="size-[12px]" />,
                label: 'SCORE',
                value: 'SCORE',
              }}
              onChange={setView}
              second={{
                icon: <CodeIcon className="size-[12px]" />,
                label: 'CODE',
                value: 'CODE',
              }}
              value={view}
            />
          </div>
        )}
        <div className="absolute top-[224px] left-[558px] h-[667px] w-[804px] rounded-[16px] bg-[rgb(255_255_255_/_0.002)] shadow-[0_30px_80px_-20px_rgb(219_39_119_/_0.7)]">
          <span
            className={`${cornerClassName} top-0 left-0 rounded-tl-[6px] border-t-2 border-l-2`}
          />
          <span
            className={`${cornerClassName} top-0 right-0 rounded-tr-[6px] border-t-2 border-r-2`}
          />
          <span
            className={`${cornerClassName} bottom-0 left-0 rounded-bl-[6px] border-b-2 border-l-2`}
          />
          <span
            className={`${cornerClassName} right-0 bottom-0 rounded-br-[6px] border-r-2 border-b-2`}
          />
        </div>

        {view === 'CODE' && snippetCode != null ? (
          <div className="benji-scroll absolute top-[248px] left-[582px] h-[619px] w-[756px] overflow-auto rounded-[12px] p-6">
            <pre className="whitespace-pre font-mono text-sm leading-relaxed text-slate-100 sm:text-base lg:text-lg">
              {snippetCode}
            </pre>
          </div>
        ) : (
          <>
            {isNewBest ? (
              <p className="absolute top-[323px] left-[667px] flex h-[32px] items-center gap-[8px] rounded-full border border-[rgb(251_191_36_/_0.45)] bg-[rgb(251_191_36_/_0.1)] px-[16px] font-mono text-[14px] leading-[18px] font-bold tracking-[0.06em] text-amber-200 uppercase">
                <StarIcon className="size-[16px] text-amber-400" />
                New personal best
              </p>
            ) : null}

            <p className="absolute top-[387px] left-[667px] font-mono text-[100px] leading-[132px] font-bold text-white">
              {cpm ?? '--'}
            </p>
            <p className="absolute top-[467px] left-[870px] font-mono text-[22px] leading-[29px] text-pink-400">
              CPM
            </p>

            <div className="absolute top-[500px] left-[670px] flex h-[18px] items-center gap-[6px] font-mono text-[14px] leading-[18px]">
              {!isCompleted ? (
                <span className="text-text-muted">
                  {`race ${result.state.toLowerCase()} - no score recorded`}
                </span>
              ) : ranking === null ? (
                <span className="text-text-muted">
                  checking your previous races...
                </span>
              ) : cpmDelta === null ? (
                <span className="text-text-muted">
                  your first run on this one
                </span>
              ) : cpmDelta > 0 ? (
                <span className="flex items-center gap-[6px] text-emerald-400">
                  <ArrowUpIcon className="size-[14px]" />+{cpmDelta} cpm
                  <span className="text-text-muted">
                    over previous best {`{${previousBestCpm}}`}
                  </span>
                </span>
              ) : cpmDelta < 0 ? (
                <span className="flex items-center gap-[6px] text-rose-400">
                  <ArrowDownIcon className="size-[14px]" />
                  {cpmDelta} cpm
                  <span className="text-text-muted">
                    under your best {`{${previousBestCpm}}`}
                  </span>
                </span>
              ) : (
                <span className="text-text-muted">
                  matched your best cpm {`{${previousBestCpm}}`}
                </span>
              )}
            </div>

            <SoloRaceResultTile
              accentClassName="border-[rgb(251_191_36_/_0.24)] bg-[rgb(251_191_36_/_0.08)]"
              caption={timeCaption}
              icon={<StopwatchIcon className="size-[16px]" />}
              label={isNewBest ? 'Best time' : 'Time'}
              labelClassName="text-amber-400"
              left={667}
              value={formatDurationPrecise(result.durationMs)}
              valueClassName="text-white"
            />

            <SoloRaceResultTile
              accentClassName="border-[rgb(168_85_247_/_0.24)] bg-[rgb(168_85_247_/_0.08)]"
              caption={rankCaption}
              icon={<RankBarsIcon className="size-[16px]" />}
              label="Global rank"
              labelClassName="text-purple-500"
              left={980}
              value={ranking === null ? '--' : `#${ranking.attemptRank}`}
              valueClassName="text-text-primary"
            />
          </>
        )}

        {view !== 'CODE' && (
          <>
            <button
              className={`${buttonClassName} left-[667px] w-[137px] bg-gradient-to-br from-pink-400 to-purple-500 font-bold text-white transition-opacity duration-150 hover:opacity-90`}
              onClick={onNewSnippet}
              type="button"
            >
              New snippet
            </button>
            <button
              className={`${buttonClassName} ${outlineButtonClassName} left-[816px] w-[128px]`}
              onClick={onRaceAgain}
              type="button"
            >
              <RestartIcon className="size-[16px]" />
              restart
            </button>
            <button
              className={`${buttonClassName} ${outlineButtonClassName} left-[956px] w-[142px] text-white`}
              onClick={onLobby}
              type="button"
            >
              back to lobby
            </button>
          </>
        )}

        <div className="absolute -bottom-[250px] -left-[75px] h-[600px] w-[600px]">
          <div className="absolute -top-[400px] left-[140px] w-[450px]">
            <Suspense fallback={null}>
              <BenjiTerminal
                baseLines={benjiBaseLines}
                nagLines={benjiNagLines}
                bubblePath="M80 66C80 57.1635 87.1634 50 96 50H672C680.837 50 688 57.1634 688 66V498C688 506.837 680.837 514 672 514H270.902C267.148 514 264.161 517.144 264.353 520.893C264.625 526.196 258.809 529.606 254.314 526.778L237.905 516.457C235.354 514.852 232.401 514 229.386 514H96C87.1635 514 80 506.837 80 498V66Z"
                bubbleViewBox="78 48 624 484"
              />
            </Suspense>
          </div>
          <div
            className={`h-full w-full ${explainPhase === 'idle' || explainPhase === 'error' ? 'cursor-pointer' : ''}`}
            onClick={
              explainPhase === 'idle' || explainPhase === 'error'
                ? requestExplanation
                : undefined
            }
            role={
              explainPhase === 'idle' || explainPhase === 'error'
                ? 'button'
                : undefined
            }
            aria-label="Click Benji to explain the code"
          >
            <Suspense fallback={null}>
              <RaceBot
                cameraPosition={[0, 0.75, 2.0]}
                cameraTarget={[0, 0.45, 0]}
                className="h-full w-full"
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
