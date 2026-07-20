import { apiRequest, type BaseResponse } from '@/lib/apiClient';

export interface SnippetResponse {
  id: string;
  source: string;
  difficulty: string;
}

export interface StartSoloAttemptResponse {
  attemptId: string;
  codeSnippetId: string;
  difficulty: string;
  startedAt: string;
}

export interface ProgressAckResponse {
  attemptId: string;
  state: string;
  acceptedOffset: number;
}

export interface SoloAttemptSnippetSummary {
  categoryId: string;
  revisionId: string;
  revisionNumber: number;
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

export interface SoloWorldBestResponse {
  cpm: number | null;
  cpmHolderName: string | null;
  time: string | null;
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
  async getRandomSnippet(): Promise<SnippetResponse> {
    return (await get<SnippetResponse>('/api/snippets/random')).data;
  },

  async startAttempt(codeSnippetId: string): Promise<StartSoloAttemptResponse> {
    return (
      await post<StartSoloAttemptResponse>('/api/solo-attempts', {
        codeSnippetId,
      })
    ).data;
  },

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

  /**
   * Completed attempts of the signed-in player, best first for the given sort.
   * Two are enough to find the previous best once the current one is skipped.
   */
  async getBestCompleted(sort: string): Promise<SoloAttemptResultResponse[]> {
    const response = await get<{ content: SoloAttemptResultResponse[] }>(
      `/api/solo-attempts?state=COMPLETED&size=2&sort=${sort}`,
    );
    return response.data.content;
  },

  async getWorldBest(): Promise<SoloWorldBestResponse> {
    return (await get<SoloWorldBestResponse>('/api/solo-attempts/world-best'))
      .data;
  },
};
