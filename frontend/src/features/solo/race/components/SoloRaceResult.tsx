import type { SoloAttemptResultResponse } from '../api/soloRaceApi';
import { useAttemptRanking } from '../hooks/useAttemptRanking';
import { formatDuration } from '../utils/formatDuration';

type SoloRaceResultProps = {
  onLobby: () => void;
  onRaceAgain: () => void;
  result: SoloAttemptResultResponse;
};

const panelClassName =
  'relative w-full max-w-[560px] rounded-[6px] border border-pink-400/20 bg-[rgb(10_8_18_/_0.9)] px-[clamp(1.5rem,4vw,3.5rem)] py-[clamp(2rem,5vh,3.5rem)] shadow-[0_0_120px_-20px_rgb(219_39_119_/_0.55)]';

const cornerClassName = 'absolute h-5 w-5 border-pink-400/70';

const tileClassName =
  'rounded-[6px] border bg-white/[0.02] px-4 py-3 font-mono';

const buttonBaseClassName =
  'inline-flex h-10 items-center justify-center gap-2 rounded-[6px] px-4 font-mono text-sm font-semibold transition duration-150 ease-out';

export function SoloRaceResult({
  onLobby,
  onRaceAgain,
  result,
}: SoloRaceResultProps) {
  const ranking = useAttemptRanking(result);

  const isCompleted = result.state === 'COMPLETED';
  const cpm = result.cpm;
  const previousBestCpm = ranking?.previousBestCpm ?? null;
  const previousBestDurationMs = ranking?.previousBestDurationMs ?? null;
  const isPersonalBest = ranking?.newPersonalBest ?? false;
  const cpmGain =
    cpm !== null && previousBestCpm !== null ? cpm - previousBestCpm : null;

  const bestDurationMs =
    previousBestDurationMs === null
      ? result.durationMs
      : Math.min(previousBestDurationMs, result.durationMs ?? Infinity);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-surface px-4 font-sans">
      <section className={panelClassName}>
        <span
          className={`${cornerClassName} -left-px -top-px border-l border-t`}
        />
        <span
          className={`${cornerClassName} -right-px -top-px border-r border-t`}
        />
        <span
          className={`${cornerClassName} -bottom-px -left-px border-b border-l`}
        />
        <span
          className={`${cornerClassName} -bottom-px -right-px border-b border-r`}
        />

        {isPersonalBest && (
          <p className="inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 font-mono text-[11px] font-bold tracking-wide text-amber-200 uppercase">
            <span aria-hidden>PB</span> New personal best
          </p>
        )}

        <p className="mt-5 flex items-end gap-3">
          <span className="font-mono text-[clamp(3.5rem,10vw,5rem)] leading-none font-extrabold text-text-primary">
            {cpm ?? '--'}
          </span>
          <span className="pb-2 font-mono text-sm font-bold text-pink-400">
            CPM
          </span>
        </p>

        {isCompleted ? (
          <p className="mt-2 font-mono text-xs text-text-muted">
            {ranking === null ? (
              <span>checking your previous races...</span>
            ) : cpmGain !== null && cpmGain > 0 ? (
              <span className="text-emerald-400">
                +{cpmGain} cpm over previous best ({previousBestCpm})
              </span>
            ) : previousBestCpm !== null ? (
              <span>previous best {previousBestCpm} cpm</span>
            ) : (
              <span>your first completed race</span>
            )}
          </p>
        ) : (
          <p className="mt-2 font-mono text-xs text-text-muted">
            {`race ${result.state.toLowerCase()} - no score recorded`}
          </p>
        )}

        <dl className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className={`${tileClassName} border-amber-300/25`}>
            <dt className="flex items-center gap-2 text-[11px] tracking-wide text-amber-200/80 uppercase">
              <span aria-hidden>TIME</span> Best time
            </dt>
            <dd className="mt-1 text-2xl font-bold text-text-primary">
              {formatDuration(bestDurationMs ?? null)}
            </dd>
            <dd className="mt-1 text-[11px] text-text-muted">
              {result.durationMs === null
                ? '// this race did not finish'
                : `// this race ${formatDuration(result.durationMs)}`}
            </dd>
          </div>

          <div className={`${tileClassName} border-purple-400/25`}>
            <dt className="flex items-center gap-2 text-[11px] tracking-wide text-purple-200/80 uppercase">
              <span aria-hidden>RANK</span> Global rank
            </dt>
            <dd className="mt-1 text-2xl font-bold text-text-primary">
              {ranking === null ? '--' : `#${ranking.globalRank}`}
            </dd>
            <dd className="mt-1 text-[11px] text-text-muted">
              {ranking?.previousGlobalRank == null
                ? ''
                : `// previously #${ranking.previousGlobalRank}`}
            </dd>
          </div>
        </dl>

        <div className="mt-7 flex flex-wrap gap-3">
          <button
            className={`${buttonBaseClassName} border border-pink-400/30 text-text-secondary hover:border-pink-400/60 hover:text-text-primary`}
            onClick={onRaceAgain}
            type="button"
          >
            <span aria-hidden>AGAIN</span> restart
          </button>
          <button
            className={`${buttonBaseClassName} bg-gradient-to-br from-pink-400 to-purple-500 text-white shadow-[0_0_20px_-6px_rgb(219_39_119_/_0.85)] hover:opacity-95`}
            onClick={onLobby}
            type="button"
          >
            Back to dashboard
          </button>
        </div>
      </section>
    </div>
  );
}
