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

export interface SoloAttemptResultResponse {
  attemptId: string;
  state: string;
  cpm: number | null;
  durationMs: number | null;
  finishedAt: string | null;
  difficulty: string;
}

export interface SoloWorldBestResponse {
  cpm: number | null;
  cpmHolderName: string | null;
  time: string | null;
  timeHolderName: string | null;
}

export type SubmitProgressResponse =
  ProgressAckResponse | SoloAttemptResultResponse;

async function getData<T>(url: string, init?: RequestInit): Promise<T> {
  const envelope = await apiRequest<BaseResponse<T>>(url, {
    auth: true,
    ...init,
  });
  return envelope.data;
}

export const soloRaceApi = {
  getRandomSnippet(): Promise<SnippetResponse> {
    return getData<SnippetResponse>('/api/snippets/random');
  },

  startAttempt(codeSnippetId: string): Promise<StartSoloAttemptResponse> {
    return getData<StartSoloAttemptResponse>('/api/solo-attempts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ codeSnippetId }),
    });
  },

  submitProgress(
    attemptId: string,
    sequence: number,
    characters: string,
  ): Promise<SubmitProgressResponse> {
    return getData<SubmitProgressResponse>(
      `/api/solo-attempts/${attemptId}/progress`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sequence, characters }),
      },
    );
  },

  abandonAttempt(attemptId: string): Promise<void> {
    return getData(`/api/solo-attempts/${attemptId}/abandon`, {
      method: 'POST',
    }).then(() => undefined);
  },

  getWorldBest(): Promise<SoloWorldBestResponse> {
    return getData<SoloWorldBestResponse>('/api/solo-attempts/world-best');
  },
};
