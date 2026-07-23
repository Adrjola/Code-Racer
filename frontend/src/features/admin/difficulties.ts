import type { Difficulty } from './api';

/**
 * The player-facing name for each difficulty. The enum values are what the
 * backend stores; these are what everyone actually calls them, so the admin
 * catalog and the race screens agree on the wording.
 */
export const DIFFICULTY_OPTIONS: {
  difficulty: Difficulty;
  displayName: string;
}[] = [
  { difficulty: 'EASY', displayName: 'BABY MODE' },
  { difficulty: 'MEDIUM', displayName: 'TRYHARD' },
  { difficulty: 'HARD', displayName: 'LOCKED IN' },
];

export function difficultyDisplayName(difficulty: Difficulty): string {
  return (
    DIFFICULTY_OPTIONS.find((option) => option.difficulty === difficulty)
      ?.displayName ?? difficulty
  );
}
