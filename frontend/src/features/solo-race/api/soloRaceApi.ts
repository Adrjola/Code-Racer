export interface ApiEnvelope<T> {
  data: T;
  correlationId?: string;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ||
  'http://localhost:8080';
const SESSION_KEY = 'code-racer.auth-session';

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

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`request_failed_${response.status}`);
  }
  return (await response.json()) as T;
}

function getAuthHeaders(): HeadersInit {
  const raw = window.sessionStorage.getItem(SESSION_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as {
      accessToken?: string;
      tokenType?: string;
    };
    if (!parsed.accessToken) {
      return {};
    }
    const tokenType = parsed.tokenType || 'Bearer';
    return { Authorization: `${tokenType} ${parsed.accessToken}` };
  } catch {
    return {};
  }
}

async function getData<T>(url: string, init?: RequestInit): Promise<T> {
  const envelope = await parseJson<ApiEnvelope<T>>(
    await fetch(`${API_BASE_URL}${url}`, {
      ...init,
      headers: {
        ...getAuthHeaders(),
        ...(init?.headers || {}),
      },
    }),
  );
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
