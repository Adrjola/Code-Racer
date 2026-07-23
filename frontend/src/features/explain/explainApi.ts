import { apiRequest, type BaseResponse } from '@/lib/apiClient';

export interface ExplanationData {
  summary: string;
  stepByStep: string[];
  concepts: string[];
  bestPractices: string[];
}

export type ExplainErrorKind =
  | 'auth-expired'
  | 'rate-limited'
  | 'provider-unavailable'
  | 'forbidden'
  | 'not-found'
  | 'generic';

export class ExplainError extends Error {
  readonly kind: ExplainErrorKind;
  constructor(kind: ExplainErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

function explanationUrl(snippetId: string): string {
  return `/api/snippets/${snippetId}/explanation`;
}

export async function fetchExplanation(
  snippetId: string,
): Promise<ExplanationData> {
  try {
    const response = await apiRequest<BaseResponse<ExplanationData>>(
      explanationUrl(snippetId),
      { auth: true },
    );
    return response.data;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as { status: number }).status;
      if (status === 401)
        throw new ExplainError('auth-expired', 'Session expired');
      if (status === 403)
        throw new ExplainError('forbidden', 'Admin access required');
      if (status === 404)
        throw new ExplainError('not-found', 'Explanation not available');
      if (status === 429)
        throw new ExplainError('rate-limited', 'Too many requests');
      if (status === 503)
        throw new ExplainError(
          'provider-unavailable',
          'AI service unavailable',
        );
    }
    throw new ExplainError('generic', 'Failed to load explanation');
  }
}
