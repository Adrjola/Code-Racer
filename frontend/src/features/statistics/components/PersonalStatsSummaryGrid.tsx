import type { ReactNode } from 'react';
import { BarsIcon, StopwatchIcon } from '../icons';
import type { PersonalStatsSummary } from '../types';

type PersonalStatsSummaryGridProps = {
  summary: PersonalStatsSummary;
};

type Tone = 'amber' | 'pink';

const TONE_CLASSNAME: Record<
  Tone,
  { bg: string; border: string; icon: string; text: string }
> = {
  amber: {
    bg: 'bg-gradient-to-b from-[#3c331b] to-[#0b0a12]',
    border: 'border-[#fbbf2433]',
    icon: 'text-[#fbbf24]',
    text: 'text-[#fde68a]',
  },
  pink: {
    bg: 'bg-gradient-to-b from-[#2a1420] to-[#0b0a12]',
    border: 'border-[#f472b633]',
    icon: 'text-[#f472b6]',
    text: 'text-[#f472b6]',
  },
};

type StatCardProps = {
  icon: ReactNode;
  label: string;
  subLabel: string;
  tone: Tone;
  unit?: string;
  value: string;
};

// Each card is a grid cell rather than a flex item, so it can't shrink to
// fit its own value text — that's what made cards different widths before.
function StatCard({ icon, label, subLabel, tone, unit, value }: StatCardProps) {
  const toneClassName = TONE_CLASSNAME[tone];

  return (
    <div
      className={`flex w-full max-w-[380px] flex-col gap-3 rounded-2xl border pb-4 pl-9 pr-5 pt-6 ${toneClassName.bg} ${toneClassName.border}`}
    >
      <div className={`flex items-center gap-4 ${toneClassName.icon}`}>
        {icon}
        <p
          className={`font-mono text-[10px] font-bold uppercase tracking-wide ${toneClassName.text}`}
        >
          {label}
        </p>
      </div>
      <p className="font-mono text-[34px] font-bold leading-none text-white">
        {value}
        {unit && (
          <span
            className={`ml-1.5 font-mono text-xs font-bold ${toneClassName.text}`}
          >
            {unit}
          </span>
        )}
      </p>
      <p className="font-mono text-[10px] text-[#5b5f78]">{subLabel}</p>
    </div>
  );
}

// Capped to match the snippet cards' own max-w-[834px] (380 + 74 gap + 380)
// so a pair's right edge lines up with the card below it instead of
// stretching to fill whatever the outer grid track happens to be.
const pairClassName =
  'grid w-full max-w-[834px] grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-[74px]';

export function PersonalStatsSummaryGrid({
  summary,
}: PersonalStatsSummaryGridProps) {
  return (
    <div>
      <p className="mb-4 font-sans text-xs text-[#8589a3]">PERSONAL RANKING</p>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-x-[108px]">
        <div className={pairClassName}>
          <StatCard
            icon={<StopwatchIcon />}
            label="Fastest Time"
            subLabel="your record"
            tone="amber"
            value={summary.fastestTime}
          />
          <StatCard
            icon={<BarsIcon className="size-4 -rotate-90" />}
            label="Fastest CPM"
            subLabel="your record"
            tone="amber"
            unit="cpm"
            value={String(summary.fastestCpm)}
          />
        </div>
        <div className={pairClassName}>
          <StatCard
            icon={<StopwatchIcon />}
            label="Average Time"
            subLabel="across all runs"
            tone="pink"
            value={summary.averageTime}
          />
          <StatCard
            icon={<BarsIcon className="size-4 -rotate-90" />}
            label="Average CPM"
            subLabel="across all runs"
            tone="pink"
            unit="cpm"
            value={String(summary.averageCpm)}
          />
        </div>
      </div>
    </div>
  );
}
