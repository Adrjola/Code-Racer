import type { ReactNode } from 'react';
import categoryRestApisIcon from '@/assets/icons/category-rest-apis.svg';
import categorySqlIcon from '@/assets/icons/category-sql.svg';
import categoryTestingIcon from '@/assets/icons/category-testing.svg';
import clockIcon from '@/assets/icons/clock.svg';
import type { PersonalActivityEntry } from '../types';

type PersonalActivityGridProps = {
  entries: PersonalActivityEntry[];
};

// Falls back to the generic code icon for any category not listed here yet.
const CATEGORY_ICON: Record<string, ReactNode> = {
  JAVA: (
    <span className="font-mono text-[64px] font-bold leading-none text-[#a855f714]">
      {'{}'}
    </span>
  ),
  'REST APIS': (
    <img alt="" className="h-[50px] w-[59px]" src={categoryRestApisIcon} />
  ),
  SQL: <img alt="" className="h-[57px] w-[51px]" src={categorySqlIcon} />,
  TESTING: (
    <img alt="" className="h-[50px] w-[47px]" src={categoryTestingIcon} />
  ),
};

const DEFAULT_CATEGORY_ICON = (
  <span className="font-mono text-[64px] font-bold leading-none text-[#a855f714]">
    {'{}'}
  </span>
);

function PersonalActivityCard({ entry }: { entry: PersonalActivityEntry }) {
  const icon =
    CATEGORY_ICON[entry.category.toUpperCase()] ?? DEFAULT_CATEGORY_ICON;

  return (
    <li className="relative flex w-full max-w-[834px] flex-col overflow-hidden rounded-2xl border border-[#a855f747] bg-[#150e26] bg-gradient-to-b from-[#a855f71a] to-transparent pb-4 pl-6 pr-8 pt-6">
      <span
        aria-hidden="true"
        className="absolute left-[18px] top-0 h-[1.5px] w-[70px] bg-gradient-to-r from-transparent via-[#c084fc] to-transparent"
      />

      {/* Positioned to match the Figma glyph's real ink bounds, not the
          text-layer box, so it sits independent of the content below. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-9 top-11"
      >
        {icon}
      </span>

      <div className="flex flex-col gap-2">
        <span className="inline-flex w-fit items-center rounded-md border border-[#a855f759] bg-[#a855f71c] px-3 py-1 font-mono text-[10px] font-bold tracking-wide text-[#c084fc]">
          {entry.category}
        </span>
        <p className="font-sans text-xl font-bold text-white">
          {entry.snippetName}
        </p>
      </div>

      {/* 74.8% keeps the same proportion as Figma's 582px column at any
          card width, so the divider stays clear of the icon on the right. */}
      <div className="mt-6 h-px w-[74.8%] bg-white/10" />

      <div className="mt-2 flex w-[74.8%] items-center">
        <div className="w-1/2">
          <p className="font-mono text-[9px] uppercase tracking-wide text-[#5b5f78]">
            CPM
          </p>
          <p className="font-mono text-2xl font-bold text-white">{entry.cpm}</p>
        </div>
        <div className="h-11 w-px shrink-0 bg-white/10" />
        <div className="w-1/2 pl-8">
          <p className="font-mono text-[9px] uppercase tracking-wide text-[#5b5f78]">
            TIME
          </p>
          <p className="font-mono text-2xl font-bold text-[#c084fc]">
            {entry.time}
          </p>
        </div>
      </div>

      <div className="mt-1 flex items-center gap-1.5">
        <img alt="" aria-hidden="true" className="size-2.5" src={clockIcon} />
        <span className="font-mono text-[10px] text-[#4a4e63]">
          {entry.relativeTime}
        </span>
      </div>
    </li>
  );
}

export function PersonalActivityGrid({ entries }: PersonalActivityGridProps) {
  return (
    <div>
      <p className="mb-4 font-sans text-xs text-[#8589a3]">SNIPPET LOG</p>
      <ul
        aria-label="Recent activity"
        className="grid grid-cols-1 gap-y-8 lg:grid-cols-2 lg:gap-x-[108px]"
      >
        {entries.map((entry, index) => (
          <PersonalActivityCard
            entry={entry}
            key={`${entry.snippetName}-${index}`}
          />
        ))}
      </ul>
    </div>
  );
}
