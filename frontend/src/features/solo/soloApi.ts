import { apiRequest, ApiRequestError } from '@/features/auth/auth';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type Category = {
  active: boolean;
  createdAt: string;
  description: string;
  id: string;
  name: string;
  updatedAt: string;
};

export type SnippetPreview = {
  categoryId: string;
  createdAt: string;
  difficulty: Difficulty;
  id: string;
  lifecycle: string;
  revisionNumber: number;
  snippetId: string;
  source: string;
  title: string;
  updatedAt: string;
  version: number;
};

export type StartSoloAttemptResponse = {
  attemptId: string;
  codeSnippetId: string;
  difficulty: Difficulty;
  startedAt: string;
};

export type FetchRandomSnippetParams = {
  categoryId?: string;
  difficulty?: Difficulty;
  excludeId?: string;
};

type BaseResponse<T> = {
  data: T;
};

type PagedModel<T> = {
  content: T[];
  page: {
    number: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
};

export async function fetchCategories(): Promise<Category[]> {
  const response = await apiRequest<BaseResponse<PagedModel<Category>>>(
    '/api/categories?size=100',
  );
  return response.data.content;
}

export async function fetchRandomSnippet(
  params: FetchRandomSnippetParams = {},
): Promise<SnippetPreview> {
  const query = new URLSearchParams();
  if (params.categoryId) {
    query.set('categoryId', params.categoryId);
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
    { authenticated: true },
  );
  return response.data;
}

export async function startSoloAttempt(
  codeSnippetId: string,
): Promise<StartSoloAttemptResponse> {
  const response = await apiRequest<BaseResponse<StartSoloAttemptResponse>>(
    '/api/solo-attempts',
    {
      authenticated: true,
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
  return hasCode(error, 'AUTHENTICATION_REQUIRED');
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
      return 'Your session has expired. Log in again to continue.';
    default:
      return error.message || 'Something went wrong. Please try again.';
  }
}
