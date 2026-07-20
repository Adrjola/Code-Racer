interface SoloRaceStatsRowProps {
  cpm: number;
  elapsed: string;
  currentLine: number;
  totalLines: number;
  progressPercent: number;
}

export function SoloRaceStatsRow({
  cpm,
  elapsed,
  currentLine,
  totalLines,
  progressPercent,
}: SoloRaceStatsRowProps) {
  return (
    <div className="mb-6 w-full max-w-[868.63px]">
      <div className="relative top-[15px] mb-[5px] flex h-[43.42px] items-start justify-between font-['JetBrains_Mono'] leading-none">
        <div className="flex items-start gap-8 text-[14px] font-normal text-[#6E6C78]">
          <span>
            cpm{' '}
            <span className="ml-1 text-[16px] font-bold text-[#F9A8D4]">
              {cpm}
            </span>
          </span>
          <span>
            time{' '}
            <span className="ml-1 text-[16px] font-bold text-[#E7E5EF]">
              {elapsed}
            </span>
          </span>
        </div>
        <span className="text-right text-[12px] font-normal text-[#6E6C78]">
          line {currentLine} of {totalLines}
        </span>
      </div>

      <div className="h-[4px] w-full overflow-hidden rounded-full bg-[#252039]">
        <div
          aria-label="typing progress"
          className="h-full rounded-full bg-[linear-gradient(90deg,#A855F7_0%,#F472B6_100%)] transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
