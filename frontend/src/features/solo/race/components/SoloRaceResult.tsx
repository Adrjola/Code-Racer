import Header from '@/components/Header';
import type { SoloAttemptResultResponse } from '../api/soloRaceApi';
import { useAttemptRanking } from '../hooks/useAttemptRanking';
import { formatDurationPrecise } from '../utils/formatDuration';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  RankBarsIcon,
  RestartIcon,
  StarIcon,
  StopwatchIcon,
} from './resultIcons';
import { SoloRaceResultTile } from './SoloRaceResultTile';

type SoloRaceResultProps = {
  onLobby: () => void;
  onNewSnippet: () => void;
  onRaceAgain: () => void;
  result: SoloAttemptResultResponse;
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
}: SoloRaceResultProps) {
  const ranking = useAttemptRanking(result);

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
    // Fixed rather than min-h: a scaled canvas still occupies its full 1080px
    // in layout, so in flow it would push the page taller than the screen and
    // leave it scrollable.
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-surface">
      {/*
       * Outside the canvas: it is centred and scaled to fit, so a logo placed
       * inside it drifts away from the top-left corner as the window shape
       * changes instead of sitting where every other page puts it.
       */}
      <div className="absolute inset-x-0 top-0 z-10">
        <Header variant="minimal" />
      </div>

      <div className="relative h-[1080px] w-[1920px] shrink-0 origin-center [transform:scale(var(--page-scale))]">
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
            <span className="text-text-muted">your first run on this one</span>
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
      </div>
    </div>
  );
}
