import type { Difficulty } from '@/features/solo/api/soloApi';
import type { GlobalRankingEntry } from '../types';

// No global leaderboard endpoint exists yet, so only EASY has data for
// now — swap this for a real API call once the backend supports it.
const EASY_RANKING: GlobalRankingEntry[] = [
  { cpm: 642, fastestTime: '0:17', rank: 1, username: 'zoomer' },
  { cpm: 631, fastestTime: '0:18', rank: 2, username: 'slower_zoomer' },
  { cpm: 631, fastestTime: '0:18', rank: 3, username: 'even_slower_zoomer' },
  { cpm: 631, fastestTime: '0:18', rank: 4, username: 'racer_1' },
  { cpm: 631, fastestTime: '0:18', rank: 5, username: 'racer_1' },
  { cpm: 631, fastestTime: '0:18', rank: 6, username: 'racer_1' },
  { cpm: 631, fastestTime: '0:18', rank: 7, username: 'PowerPuffGirl' },
];

const MOCK_GLOBAL_RANKINGS: Partial<Record<Difficulty, GlobalRankingEntry[]>> =
  {
    EASY: EASY_RANKING,
  };

export function getMockGlobalRanking(
  difficulty: Difficulty,
): GlobalRankingEntry[] | undefined {
  return MOCK_GLOBAL_RANKINGS[difficulty];
}
