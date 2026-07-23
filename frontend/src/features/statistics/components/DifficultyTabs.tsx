import { useState } from 'react';
import type { Difficulty } from '@/features/solo/api/soloApi';
import { difficultyDisplayName } from '@/features/admin/difficulties';

type DifficultyTabsProps = {
  difficulty: Difficulty;
  onChange: (difficulty: Difficulty) => void;
};

const DIFFICULTIES: { label: string; value: Difficulty }[] = [
  { label: difficultyDisplayName('EASY'), value: 'EASY' },
  { label: difficultyDisplayName('MEDIUM'), value: 'MEDIUM' },
  { label: difficultyDisplayName('HARD'), value: 'HARD' },
];

const DRAWING_CLASSNAME: Record<Difficulty, string> = {
  EASY: 'border-transparent bg-gradient-to-b from-[#34d39933] to-[#0a091088] text-[#34d399]',
  HARD: 'border-transparent bg-gradient-to-b from-[#f472b633] to-[#0a091088] text-[#f472b6]',
  MEDIUM:
    'border-transparent bg-gradient-to-b from-[#fbbf2433] to-[#0a091088] text-[#fbbf24]',
};

const SETTLED_CLASSNAME: Record<Difficulty, string> = {
  EASY: 'border-[#34d399] bg-gradient-to-b from-[#34d39933] to-[#0a091088] text-[#34d399]',
  HARD: 'border-[#f472b6] bg-gradient-to-b from-[#f472b633] to-[#0a091088] text-[#f472b6]',
  MEDIUM:
    'border-[#fbbf24] bg-gradient-to-b from-[#fbbf2433] to-[#0a091088] text-[#fbbf24]',
};

const SELECTED_DOT_CLASSNAME: Record<Difficulty, string> = {
  EASY: 'bg-[#34d399]',
  HARD: 'bg-[#f472b6]',
  MEDIUM: 'bg-[#fbbf24]',
};

const OUTLINE_HEX: Record<Difficulty, string> = {
  EASY: '#34d399',
  HARD: '#f472b6',
  MEDIUM: '#fbbf24',
};

export function DifficultyTabs({ difficulty, onChange }: DifficultyTabsProps) {
  const [settledDifficulty, setSettledDifficulty] = useState<Difficulty | null>(
    null,
  );

  return (
    <div
      aria-label="Difficulty"
      className="flex flex-wrap gap-3"
      role="tablist"
    >
      {DIFFICULTIES.map((option) => {
        const isSelected = option.value === difficulty;
        const isSettled = isSelected && settledDifficulty === option.value;
        return (
          <div className="relative shrink-0" key={option.value}>
            {isSelected && !isSettled && (
              <svg
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 size-full"
              >
                {/* Inset by half the stroke width so it lines up exactly
                    with the CSS border it swaps to once settled. */}
                <rect
                  className="animate-[draw-outline_0.6s_ease-out_forwards]"
                  fill="none"
                  height="calc(100% - 1px)"
                  onAnimationEnd={() => setSettledDifficulty(option.value)}
                  pathLength="100"
                  rx="10.5"
                  stroke={OUTLINE_HEX[option.value]}
                  strokeDasharray="100"
                  strokeWidth="1"
                  width="calc(100% - 1px)"
                  x="0.5"
                  y="0.5"
                />
              </svg>
            )}
            <button
              aria-selected={isSelected}
              className={`relative inline-flex h-[37px] items-center gap-2 rounded-[11px] border px-4 font-mono text-[12px] font-bold tracking-wide transition duration-150 ease-out ${
                isSelected
                  ? isSettled
                    ? SETTLED_CLASSNAME[option.value]
                    : DRAWING_CLASSNAME[option.value]
                  : 'border-white/10 bg-white/[0.02] text-text-muted hover:border-white/20'
              }`}
              onClick={() => onChange(option.value)}
              role="tab"
              type="button"
            >
              <span
                aria-hidden="true"
                className={`size-[5px] shrink-0 rounded-full ${
                  isSelected
                    ? SELECTED_DOT_CLASSNAME[option.value]
                    : 'bg-[#6e6c78]'
                }`}
              />
              {option.label}
            </button>
          </div>
        );
      })}
    </div>
  );
}
