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
  /** Long-form unit spoken by screen readers, e.g. "characters per minute" for "cpm". */
  unitLabel?: string;
  value: string;
};

function StatCard({
  icon,
  label,
  subLabel,
  tone,
  unit,
  unitLabel,
  value,
}: StatCardProps) {
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
      <p
        aria-label={unitLabel ? `${value} ${unitLabel}` : undefined}
        className="font-mono text-[34px] font-bold leading-none text-white"
      >
        {value}
        {unit && (
          <span
            aria-hidden={Boolean(unitLabel)}
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
            unitLabel="characters per minute"
            value={
              summary.fastestCpm === null ? '--' : String(summary.fastestCpm)
            }
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
            unitLabel="characters per minute"
            value={
              summary.averageCpm === null ? '--' : String(summary.averageCpm)
            }
          />
        </div>
      </div>
    </div>
  );
}
