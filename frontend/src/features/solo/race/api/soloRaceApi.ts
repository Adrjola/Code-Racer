import type { Category } from '@/features/solo/api/soloApi';
import { apiRequest, type BaseResponse } from '@/lib/apiClient';

export interface ProgressAckResponse {
  attemptId: string;
  state: string;
  acceptedOffset: number;
}

export interface SoloAttemptSnippetSummary {
  category: Category;
  snippetId: string;
  title: string;
}

/** Mirrors the backend's SoloAttemptResultResponse. */
export interface SoloAttemptResultResponse {
  attemptId: string;
  cpm: number | null;
  difficulty: string;
  durationMs: number | null;
  finishedAt: string | null;
  snippet: SoloAttemptSnippetSummary | null;
  startedAt: string | null;
  state: string;
}

export interface AbandonResponse {
  attemptId: string;
  state: string;
}

/**
 * Where a finished race stands on its snippet's leaderboard. `attemptRank` is
 * where this run would land, `globalRank` is the place the player holds now.
 */
export interface SoloAttemptRankingResponse {
  attemptId: string;
  attemptRank: number;
  globalRank: number;
  newPersonalBest: boolean;
  previousBestCpm: number | null;
  previousBestDurationMs: number | null;
  previousGlobalRank: number | null;
}

export interface SoloWorldBestResponse {
  cpm: number | null;
  cpmHolderName: string | null;
  durationMs: number | null;
  timeHolderName: string | null;
}

export type SubmitProgressResponse =
  ProgressAckResponse | SoloAttemptResultResponse;

/**
 * The progress route answers with an ack while the attempt is still running and
 * with the finished result once the final characters land, so callers tell the
 * two apart by shape.
 */
export function isProgressAck(
  response: SubmitProgressResponse,
): response is ProgressAckResponse {
  return 'acceptedOffset' in response;
}

function get<T>(path: string): Promise<BaseResponse<T>> {
  return apiRequest<BaseResponse<T>>(path, { auth: true });
}

function post<T>(path: string, body?: unknown): Promise<BaseResponse<T>> {
  return apiRequest<BaseResponse<T>>(path, {
    auth: true,
    method: 'POST',
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

export const soloRaceApi = {
  async submitProgress(
    attemptId: string,
    sequence: number,
    characters: string,
  ): Promise<SubmitProgressResponse> {
    return (
      await post<SubmitProgressResponse>(
        `/api/solo-attempts/${attemptId}/progress`,
        { characters, sequence },
      )
    ).data;
  },

  async abandonAttempt(attemptId: string): Promise<AbandonResponse> {
    return (
      await post<AbandonResponse>(`/api/solo-attempts/${attemptId}/abandon`)
    ).data;
  },

  async getAttempt(attemptId: string): Promise<SoloAttemptResultResponse> {
    return (
      await get<SoloAttemptResultResponse>(`/api/solo-attempts/${attemptId}`)
    ).data;
  },

  async getRanking(attemptId: string): Promise<SoloAttemptRankingResponse> {
    return (
      await get<SoloAttemptRankingResponse>(
        `/api/solo-attempts/${attemptId}/ranking`,
      )
    ).data;
  },

  async getWorldBest(snippetId: string): Promise<SoloWorldBestResponse> {
    return (
      await get<SoloWorldBestResponse>(
        `/api/solo-attempts/world-best?snippetId=${snippetId}`,
      )
    ).data;
  },
};
