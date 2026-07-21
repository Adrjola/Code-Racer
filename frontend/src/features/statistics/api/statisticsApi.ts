import { apiRequest, type BaseResponse } from '@/lib/apiClient';
import type { Difficulty } from '@/features/solo/api/soloApi';

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
};
