import { GlobeIcon, PersonalIcon } from '../icons';
import type { StatsView } from '../types';

type ViewTabsProps = {
  onChange: (view: StatsView) => void;
  view: StatsView;
};

const tabClassName =
  'relative z-10 inline-flex flex-1 items-center justify-center gap-1.5 rounded-[9px] px-3 font-mono text-[12px] font-bold tracking-wide transition-colors duration-200 ease-out';

export function ViewTabs({ onChange, view }: ViewTabsProps) {
  const isPersonal = view === 'PERSONAL';

  return (
    <div
      aria-label="Ranking scope"
      className="relative inline-flex h-[39px] w-[242px] items-center rounded-[12px] border border-white/10 bg-white/[0.03] p-1.5"
      role="tablist"
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-1.5 left-1.5 w-[calc(50%-0.375rem)] rounded-[9px] bg-gradient-to-br from-pink-400 to-purple-500 transition-transform duration-200 ease-out ${
          isPersonal ? 'translate-x-full' : 'translate-x-0'
        }`}
      />
      <button
        aria-selected={!isPersonal}
        className={`${tabClassName} ${isPersonal ? 'text-text-muted' : 'text-[#0e0c16]'}`}
        onClick={() => onChange('GLOBAL')}
        role="tab"
        type="button"
      >
        <GlobeIcon />
        GLOBAL
      </button>
      <button
        aria-selected={isPersonal}
        className={`${tabClassName} ${isPersonal ? 'text-[#0e0c16]' : 'text-text-muted'}`}
        onClick={() => onChange('PERSONAL')}
        role="tab"
        type="button"
      >
        <PersonalIcon />
        PERSONAL
      </button>
    </div>
  );
}
