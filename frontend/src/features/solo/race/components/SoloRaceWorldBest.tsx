import { useEffect, useState } from 'react';
import { soloRaceApi, type SoloWorldBestResponse } from '../api/soloRaceApi';
import { formatDurationPrecise } from '../utils/formatDuration';
import playIcon from '@/assets/play.svg';
import starIcon from '@/assets/star.svg';

interface SoloRaceWorldBestProps {
  onStartRace?: () => void;
  records?: SoloWorldBestResponse;
  snippetId: string;
}

function formatHolder(holder: string | null | undefined): string {
  if (!holder) {
    return 'N/A';
  }
  return holder.startsWith('@') ? holder : `@${holder}`;
}

export function SoloRaceWorldBest({
  onStartRace,
  records: recordsProp,
  snippetId,
}: SoloRaceWorldBestProps) {
  const [fetchedRecords, setFetchedRecords] =
    useState<SoloWorldBestResponse | null>(null);

  // Supplied records win; they are read straight from the prop rather than
  // copied into state, so there is only ever one source of truth.
  const records = recordsProp ?? fetchedRecords;

  useEffect(() => {
    if (recordsProp) {
      return;
    }

    let active = true;
    void soloRaceApi
      .getWorldBest(snippetId)
      .then((response) => {
        if (active) {
          setFetchedRecords(response);
        }
      })
      .catch(() => {
        if (active) {
          setFetchedRecords(null);
        }
      });

    return () => {
      active = false;
    };
  }, [recordsProp, snippetId]);

  const cpmValue = records?.cpm ?? 'N/A';
  const cpmHolder = formatHolder(records?.cpmHolderName);
  const timeValue =
    records?.durationMs == null
      ? 'N/A'
      : formatDurationPrecise(records.durationMs);
  const timeHolder = formatHolder(records?.timeHolderName);

  return (
    <aside className="w-full max-w-[var(--world-best-w)] text-[#E7E5EF]">
      <h2 className="mb-[13px] inline-flex items-start gap-2 font-['JetBrains_Mono'] text-[15px] font-bold leading-none text-[#FDE68A]">
        <img alt="" aria-hidden="true" className="h-6 w-6" src={starIcon} />
        <span className="pt-[2px]">WORLD BEST</span>
      </h2>

      <div
        className="mb-4 min-h-[160px] w-full rounded-2xl border border-[#FBBF2442] px-5 pb-6 pt-[13px] sm:px-6 lg:h-[185px] lg:min-h-0 lg:w-[var(--world-best-w)]"
        style={{
          background:
            'radial-gradient(60% 60% at 100% 0%, rgba(251, 191, 36, 0.14) 0%, rgba(251, 191, 36, 0) 70%), rgba(18, 15, 31, 0.8)',
        }}
      >
        <p className="mb-4 font-['JetBrains_Mono'] text-[12px] font-normal leading-none text-[#8B8794]">
          world record - cpm
        </p>
        <p className="font-['JetBrains_Mono'] text-[52px] font-bold leading-none text-white sm:text-[84px]">
          {cpmValue}{' '}
          <span className="font-['JetBrains_Mono'] text-[20px] font-normal leading-none text-[#F9A8D4]">
            CPM
          </span>
        </p>
        <p className="mt-4 font-['JetBrains_Mono'] text-[12.5px] font-normal leading-none text-[#6B6F85]">
          held by <span className="text-[#F9A8D4]">{cpmHolder}</span> - fastest
          ever
        </p>
      </div>

      <div
        className="min-h-[160px] w-full rounded-2xl border border-[#FBBF2442] px-5 pb-6 pt-[13px] sm:px-6 lg:h-[185px] lg:min-h-0 lg:w-[var(--world-best-w)]"
        style={{
          background:
            'radial-gradient(60% 60% at 100% 0%, rgba(251, 191, 36, 0.14) 0%, rgba(251, 191, 36, 0) 70%), rgba(18, 15, 31, 0.8)',
        }}
      >
        <p className="mb-4 font-['JetBrains_Mono'] text-[12px] font-normal leading-none text-[#8B8794]">
          world record - time
        </p>
        <p className="font-['JetBrains_Mono'] text-[52px] font-bold leading-none text-white sm:text-[84px]">
          {timeValue}
        </p>
        <p className="mt-4 font-['JetBrains_Mono'] text-[12.5px] font-normal leading-none text-[#6B6F85]">
          held by <span className="text-[#F9A8D4]">{timeHolder}</span> - fastest
          ever
        </p>
      </div>

      <button
        className="mt-8 inline-flex h-[72px] w-full max-w-[280px] cursor-pointer items-center justify-center rounded-xl bg-[linear-gradient(107.27deg,#F472B6_0%,#A855F7_100%)] font-['Manrope'] text-[20px] font-bold uppercase leading-none text-center text-white shadow-[0_0_28px_rgba(244,114,182,0.5)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F9A8D4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08051A] active:scale-[0.98]"
        onClick={onStartRace}
        type="button"
      >
        <img
          alt=""
          aria-hidden="true"
          className="mr-3 h-6 w-6"
          src={playIcon}
        />
        <span>START RACE</span>
      </button>
    </aside>
  );
}
