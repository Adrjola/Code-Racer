import type { Difficulty } from '@/features/solo/api/soloApi';
import type { PersonalActivityEntry } from '../types';

// No personal history endpoint exists yet, so only EASY has data for
// now — swap this for a real API call once the backend supports it.
const EASY_ACTIVITY: PersonalActivityEntry[] = [
  {
    category: 'JAVA',
    cpm: 452,
    relativeTime: '5 min ago',
    snippetName: 'Two Sum',
    time: '0:41:221',
  },
  {
    category: 'SQL',
    cpm: 438,
    relativeTime: '2 hrs ago',
    snippetName: 'Group By Count',
    time: '0:41:221',
  },
  {
    category: 'REST APIs',
    cpm: 452,
    relativeTime: '2 days ago',
    snippetName: 'Paginated Fetch',
    time: '0:41:221',
  },
  {
    category: 'TESTING',
    cpm: 452,
    relativeTime: '2 days ago',
    snippetName: 'Mock Service',
    time: '0:41:221',
  },
  {
    category: 'JAVA',
    cpm: 452,
    relativeTime: '5 min ago',
    snippetName: 'Two Sum',
    time: '0:41:221',
  },
];

const MOCK_PERSONAL_ACTIVITY: Partial<
  Record<Difficulty, PersonalActivityEntry[]>
> = {
  EASY: EASY_ACTIVITY,
};

export function getMockPersonalActivity(
  difficulty: Difficulty,
): PersonalActivityEntry[] | undefined {
  return MOCK_PERSONAL_ACTIVITY[difficulty];
}
