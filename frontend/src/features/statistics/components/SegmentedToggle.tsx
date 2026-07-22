import type { ReactNode } from 'react';

export type SegmentedToggleOption<T extends string> = {
  icon?: ReactNode;
  label: string;
  value: T;
};

type SegmentedToggleProps<T extends string> = {
  ariaLabel: string;
  first: SegmentedToggleOption<T>;
  onChange: (value: T) => void;
  second: SegmentedToggleOption<T>;
  value: T;
};

const tabClassName =
  'relative z-10 inline-flex flex-1 items-center justify-center gap-1.5 rounded-[9px] px-3 font-mono text-[12px] font-bold tracking-wide transition-colors duration-200 ease-out';

/** A sliding-pill two-option switch, shared by the Global/Personal and Best/History toggles. */
export function SegmentedToggle<T extends string>({
  ariaLabel,
  first,
  onChange,
  second,
  value,
}: SegmentedToggleProps<T>) {
  const isSecond = value === second.value;

  return (
    <div
      aria-label={ariaLabel}
      className="relative inline-flex h-[39px] w-[242px] items-center rounded-[12px] border border-white/10 bg-white/[0.03] p-1.5"
      role="tablist"
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-1.5 left-1.5 w-[calc(50%-0.375rem)] rounded-[9px] bg-gradient-to-br from-pink-400 to-purple-500 transition-transform duration-200 ease-out ${
          isSecond ? 'translate-x-full' : 'translate-x-0'
        }`}
      />
      {[first, second].map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            aria-selected={isSelected}
            className={`${tabClassName} ${isSelected ? 'text-[#0e0c16]' : 'text-text-muted'}`}
            key={option.value}
            onClick={() => onChange(option.value)}
            role="tab"
            type="button"
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
