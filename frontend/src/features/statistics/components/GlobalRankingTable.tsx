import starIcon from '@/assets/star.svg';
import type { GlobalRankingEntry } from '../types';

type GlobalRankingTableProps = {
  currentUsername?: string;
  entries: GlobalRankingEntry[];
};

const columnsClassName =
  'grid grid-cols-[3rem_1fr_6rem_5rem] items-center gap-4';

// Top 3 ranks always keep their gold/pink tier color even for the user's
// own row. Outside the top 3, the user's row is purple instead of grey.
function rowClassName(rank: number, isCurrentUser: boolean) {
  const base = `${columnsClassName} rounded-[11px] border px-6 py-5`;

  if (rank === 1) {
    return `${base} border-[#fbbf24] bg-gradient-to-b from-[#fbbf2424] to-[#f472b60d]`;
  }
  if (rank === 2 || rank === 3) {
    return `${base} border-[#f472b652] bg-[#f472b60e]`;
  }
  if (isCurrentUser) {
    return `${base} border-[#a855f752] bg-[#a855f714]`;
  }
  return `${base} border-white/10 bg-white/[0.04]`;
}

function rankClassName(rank: number) {
  if (rank === 1) {
    return 'text-[#fbbf24]';
  }
  if (rank === 2 || rank === 3) {
    return 'text-[#f9a8d4]';
  }
  return 'text-text-secondary';
}

export function GlobalRankingTable({
  currentUsername,
  entries,
}: GlobalRankingTableProps) {
  return (
    <div>
      <p className="mb-4 font-sans text-xs text-[#8589a3]">GLOBAL RANKING</p>

      <div
        className={`${columnsClassName} border-b border-white/10 px-6 pb-3 font-mono text-[9.5px] uppercase tracking-wide text-[#5b5f78]`}
      >
        <span className="text-center">#</span>
        <span>Racer</span>
        <span className="text-right">Fastest</span>
        <span className="text-right">CPM</span>
      </div>

      <ul aria-label="Global ranking" className="mt-3 flex flex-col gap-2.5">
        {entries.map((entry) => {
          const isCurrentUser = entry.username === currentUsername;
          return (
            <li
              className={rowClassName(entry.rank, isCurrentUser)}
              key={`${entry.rank}-${entry.username}`}
            >
              <span
                className={`font-mono text-sm font-bold ${rankClassName(entry.rank)} text-center`}
              >
                {entry.rank}
              </span>
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className={`truncate font-sans text-base ${
                    entry.rank === 1
                      ? 'font-bold text-white'
                      : 'text-text-secondary'
                  }`}
                >
                  {entry.username}
                </span>
                {entry.rank === 1 && (
                  <img
                    alt=""
                    aria-hidden="true"
                    className="size-4"
                    src={starIcon}
                  />
                )}
                {isCurrentUser && (
                  <span className="rounded-[4px] border border-[#a855f780] bg-[#a855f729] px-2 py-0.5 font-mono text-[8px] font-bold uppercase text-[#a855f7]">
                    YOU
                  </span>
                )}
              </span>
              <span
                className={`text-right font-mono text-sm font-bold ${
                  entry.rank === 1 ? 'text-[#fbbf24]' : 'text-[#e7e5ef]'
                }`}
              >
                {entry.fastestTime}
              </span>
              <span className="text-right font-mono text-sm text-[#c9c7d6]">
                {entry.cpm}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
