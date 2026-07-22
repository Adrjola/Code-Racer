import { apiRequest, ApiRequestError } from '@/lib/apiClient';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type Category = 'JAVA' | 'REST_APIS' | 'SQL' | 'TESTING';

/** Mirrors the backend's CategoryResponse, built from the fixed enum. */
export type CategoryOption = {
  category: Category;
  displayName: string;
};

export type SnippetPreview = {
  category: Category;
  createdAt: string;
  difficulty: Difficulty;
  id: string;
  lifecycle: string;
  source: string;
  title: string;
  updatedAt: string;
};

export type StartSoloAttemptResponse = {
  attemptId: string;
  codeSnippetId: string;
  difficulty: Difficulty;
  startedAt: string;
};

export type FetchRandomSnippetParams = {
  category?: Category;
  difficulty?: Difficulty;
  excludeId?: string;
};

export type SoloSelection = {
  category: Category;
  categoryName: string;
  difficulty: Difficulty;
};

type BaseResponse<T> = {
  data: T;
};

export async function fetchCategories(): Promise<CategoryOption[]> {
  const response =
    await apiRequest<BaseResponse<CategoryOption[]>>('/api/categories');
  return response.data;
}

export async function fetchRandomSnippet(
  params: FetchRandomSnippetParams = {},
): Promise<SnippetPreview> {
  const query = new URLSearchParams();
  if (params.category) {
    query.set('category', params.category);
  }
  if (params.difficulty) {
    query.set('difficulty', params.difficulty);
  }
  if (params.excludeId) {
    query.set('excludeId', params.excludeId);
  }
  const queryString = query.toString();

  const response = await apiRequest<BaseResponse<SnippetPreview>>(
    `/api/snippets/random${queryString ? `?${queryString}` : ''}`,
    { auth: true },
  );
  return response.data;
}

export async function startSoloAttempt(
  codeSnippetId: string,
): Promise<StartSoloAttemptResponse> {
  const response = await apiRequest<BaseResponse<StartSoloAttemptResponse>>(
    '/api/solo-attempts',
    {
      auth: true,
      body: JSON.stringify({ codeSnippetId }),
      method: 'POST',
    },
  );
  return response.data;
}

function hasCode(error: unknown, code: string): boolean {
  return error instanceof ApiRequestError && error.code === code;
}

export function isSessionExpiredError(error: unknown): boolean {
  return (
    hasCode(error, 'AUTHENTICATION_REQUIRED') ||
    hasCode(error, 'SESSION_EXPIRED')
  );
}

export function isNoEligibleSnippetError(error: unknown): boolean {
  return hasCode(error, 'NO_ELIGIBLE_SNIPPET');
}

export function isSnippetUnavailableError(error: unknown): boolean {
  return hasCode(error, 'SOLO_ATTEMPT_SNIPPET_UNAVAILABLE');
}

export function readableSoloError(error: unknown): string {
  if (!(error instanceof ApiRequestError)) {
    return 'Cannot reach the server. Check your connection and try again.';
  }

  switch (error.code) {
    case 'NO_ELIGIBLE_SNIPPET':
      return 'No snippets match these filters. Try a different category or difficulty.';
    case 'SOLO_ATTEMPT_SNIPPET_UNAVAILABLE':
      return 'This snippet is no longer available. Refreshing the preview.';
    case 'ONE_ACTIVE_ATTEMPT_ALLOWED':
      return 'You already have an attempt in progress. Finish or abandon it before starting a new one.';
    case 'AUTHENTICATION_REQUIRED':
    case 'SESSION_EXPIRED':
      return 'Your session has expired. Log in again to continue.';
    default:
      return error.message || 'Something went wrong. Please try again.';
  }
}
