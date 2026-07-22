import { loadSession } from '@/features/auth/session';

export type BaseResponse<T> = {
  data: T;
};

export type Page<T> = {
  content: T[];
  page: {
    number: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
};

type ApiErrorBody = {
  code?: string;
  message?: string;
  status?: number;
};

type ApiRequestOptions = RequestInit & {
  auth?: boolean;
};

export class ApiRequestError extends Error {
  code?: string;
  status?: number;

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.status = status;
  }
}

export function isSessionExpiredError(error: unknown): boolean {
  return (
    error instanceof ApiRequestError &&
    (error.code === 'AUTHENTICATION_REQUIRED' ||
      error.code === 'SESSION_EXPIRED')
  );
}

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '') ??
  (import.meta.env.PROD ? '' : 'http://localhost:8080');

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { auth, headers, ...requestInit } = options;

  const requestHeaders = {
    'Content-Type': 'application/json',
    ...(auth ? authorizationHeader() : {}),
    ...headers,
  };

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...requestInit,
      headers: requestHeaders,
    });
  } catch {
    throw new ApiRequestError('Network request failed', 'NETWORK_ERROR');
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function authorizationHeader(): Record<string, string> {
  const session = loadSession();
  if (!session) {
    throw new ApiRequestError(
      'Your session expired. Please log in again.',
      'SESSION_EXPIRED',
      401,
    );
  }

  return { Authorization: `${session.tokenType} ${session.accessToken}` };
}

async function toApiError(response: Response): Promise<ApiRequestError> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return new ApiRequestError(
      body.message || response.statusText,
      body.code,
      body.status || response.status,
    );
  } catch {
    return new ApiRequestError(response.statusText, undefined, response.status);
  }
}
