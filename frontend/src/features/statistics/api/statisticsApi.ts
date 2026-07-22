import { apiRequest, type BaseResponse, type Page } from '@/lib/apiClient';
import type { Category, Difficulty } from '@/features/solo/api/soloApi';

/** Mirrors the backend's DifficultyStatistics. Null fields mean no completed attempts yet. */
export type DifficultyStatistics = {
  averageCpm: number | null;
  averageDurationMs: number | null;
  difficulty: Difficulty;
  fastestDurationMs: number | null;
  highestCpm: number | null;
};

/** Mirrors the backend's SnippetStatistics: one personal-best run per snippet. */
export type SnippetStatistics = {
  bestCpm: number;
  bestDurationMs: number;
  bestFinishedAt: string;
  categoryName: string;
  difficulty: Difficulty;
  snippetId: string;
  snippetTitle: string;
};

/** Mirrors the backend's SoloAttemptResultResponse, trimmed to what the history list shows. */
export type SoloAttemptHistoryEntry = {
  attemptId: string;
  cpm: number;
  difficulty: Difficulty;
  durationMs: number;
  finishedAt: string;
  snippet: {
    category: Category;
    snippetId: string;
    title: string;
  };
};

/** The most recent completed attempts to show for a "simple" history list. */
const HISTORY_PAGE_SIZE = 10;

function get<T>(path: string): Promise<BaseResponse<T>> {
  return apiRequest<BaseResponse<T>>(path, { auth: true });
}

export const statisticsApi = {
  async getPersonalStatistics(): Promise<DifficultyStatistics[]> {
    const response = await get<{ difficulties: DifficultyStatistics[] }>(
      '/api/solo-attempts/statistics',
    );
    return response.data.difficulties;
  },

  async getSnippetStatistics(): Promise<SnippetStatistics[]> {
    const response = await get<{ snippets: SnippetStatistics[] }>(
      '/api/solo-attempts/snippet-statistics',
    );
    return response.data.snippets;
  },

  /**
   * The signed-in user's most recent completed attempts for one difficulty. The backend already
   * sorts by startedAt descending, so this is a straight page fetch with no client-side sorting.
   */
  async getAttemptHistory(
    difficulty: Difficulty,
  ): Promise<SoloAttemptHistoryEntry[]> {
    const response = await get<Page<SoloAttemptHistoryEntry>>(
      `/api/solo-attempts?state=COMPLETED&difficulty=${difficulty}&size=${HISTORY_PAGE_SIZE}`,
    );
    return response.data.content;
  },
};
