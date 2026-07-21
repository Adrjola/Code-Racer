import type { Difficulty } from '@/features/solo/api/soloApi';
import type { PersonalStatsSummary } from '../types';

// Shaped to match the backend's existing /solo-attempts/statistics endpoint
// (fastest/average duration and cpm per difficulty) — swap this for that
// real call once the frontend is wired up to it.
const EASY_SUMMARY: PersonalStatsSummary = {
  averageCpm: 122,
  averageTime: '0:55:102',
  fastestCpm: 122,
  fastestTime: '0:41.201',
};

const MOCK_PERSONAL_STATS_SUMMARY: Partial<
  Record<Difficulty, PersonalStatsSummary>
> = {
  EASY: EASY_SUMMARY,
};

export function getMockPersonalStatsSummary(
  difficulty: Difficulty,
): PersonalStatsSummary | undefined {
  return MOCK_PERSONAL_STATS_SUMMARY[difficulty];
}
